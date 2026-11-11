const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'admin-logic-isolated-test-secret';
const app = require('../server');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Ingredient = require('../models/Ingredient');
const Supplier = require('../models/Supplier');
const ProductIngredient = require('../models/ProductIngredient');
const InventoryTransaction = require('../models/InventoryTransaction');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const ShopSetting = require('../models/ShopSetting');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const PurchaseOrder = require('../models/PurchaseOrder');
const RewardItem = require('../models/RewardItem');
const CustomerReview = require('../models/CustomerReview');
const { awardOrderPoints, refundRedemption } = require('../utils/orderLoyalty');

test('admin workflows persist valid data and reject invalid or unauthorized changes', async (t) => {
  const dbName = `aura_cafe_admin_audit_test_${randomBytes(6).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', { dbName, serverSelectionTimeoutMS: 5000 });
  let server;
  t.after(async () => {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (!/^aura_cafe_admin_audit_test_[0-9a-f]+$/.test(mongoose.connection.db.databaseName)) throw new Error('Refusing to drop a non-test database');
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const admin = await User.create({ fullName: 'Audit Admin', phone: '0999888001', role: 'ADMIN', passwordHash: 'unused-test-hash' });
  const customer = await User.create({ fullName: 'Audit Customer', phone: '0999888002', role: 'CUSTOMER', passwordHash: 'unused-test-hash' });
  const token = jwt.sign({ id: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const customerToken = jwt.sign({ id: String(customer._id) }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const request = async (path, method = 'GET', body, auth = token) => {
    const response = await fetch(base + path, { method, headers: { Authorization: `Bearer ${auth}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, data: await response.json() };
  };
  let category, product, supplier, ingredient;

  await t.test('categories validate names literally, status and references', async () => {
    const created = await request('/api/categories', 'POST', { name: 'Tea + Coffee [A]' });
    assert.equal(created.status, 201); category = created.data;
    assert.equal((await request('/api/categories', 'POST', { name: 'Tea + Coffee [A]' })).status, 409);
    assert.equal((await request('/api/categories', 'POST', { name: 'Teaaaa Coffee A' })).status, 201);
    assert.equal((await request(`/api/categories/${category._id}`, 'PUT', { name: '   ' })).status, 400);
    assert.equal((await request(`/api/categories/${category._id}`, 'PUT', { status: 'INVALID' })).status, 400);
    assert.equal((await request('/api/categories/not-an-id')).status, 400);
    assert.equal((await request('/api/categories', 'POST', { name: 'Forbidden' }, customerToken)).status, 403);
  });

  await t.test('products validate prices, category and variant prices before saving', async () => {
    const created = await request('/api/products', 'POST', { category: category._id, name: 'Coffee', basePrice: 30000, variantsConfig: { sizes: { M: 0, L: 5000 }, toppings: [] } });
    assert.equal(created.status, 201); product = created.data;
    assert.equal((await request(`/api/products/${product._id}`, 'PUT', { basePrice: -1 })).status, 400);
    assert.equal((await request(`/api/products/${product._id}`, 'PUT', { variantsConfig: { sizes: { M: -100 } } })).status, 400);
    assert.equal((await request(`/api/products/${product._id}`, 'PUT', { category: String(new mongoose.Types.ObjectId()) })).status, 404);
    assert.equal((await request(`/api/products/${new mongoose.Types.ObjectId()}`, 'PUT', { name: 'Missing' })).status, 404);
    assert.equal((await request(`/api/categories/${category._id}`, 'DELETE')).status, 409);
    assert.equal((await Product.findById(product._id)).basePrice, 30000);
  });

  await t.test('ingredients reject invalid stock and combine supplier and low-stock filters', async () => {
    supplier = await Supplier.create({ name: 'Audit Supplier' });
    const other = await Supplier.create({ name: 'Other Supplier' });
    const created = await request('/api/ingredients', 'POST', { name: 'Beans', unit: 'gram', supplier: String(supplier._id), currentStock: 100, minStockLevel: 200 });
    assert.equal(created.status, 201); ingredient = created.data;
    await Ingredient.create({ name: 'Other Beans', unit: 'gram', supplier: other._id, currentStock: 0, minStockLevel: 10 });
    assert.equal((await request(`/api/ingredients/${ingredient._id}`, 'PUT', { currentStock: -1 })).status, 400);
    assert.equal((await request(`/api/ingredients/${ingredient._id}`, 'PUT', { currentStock: 90, expectedCurrentStock: 99 })).status, 409);
    const low = await request(`/api/ingredients?lowStock=true&supplierId=${supplier._id}`);
    assert.deepEqual(low.data.map(item => item._id), [ingredient._id]);
    assert.equal((await request('/api/ingredients', 'POST', { name: 'Bad', unit: 'gram', supplier: String(new mongoose.Types.ObjectId()) })).status, 400);
  });

  await t.test('recipe replacement keeps both representations in sync and preserves old data on invalid saves', async () => {
    const path = `/api/product-ingredients/product/${product._id}`;
    const items = [{ ingredient: ingredient._id, quantityRequired: 10 }];
    assert.equal((await request(path, 'PUT', { items })).status, 200);
    assert.equal((await request(path, 'PUT', { items: [...items, ...items] })).status, 409);
    assert.equal((await request(path, 'PUT', { items: [{ ...items[0], quantityRequired: 0 }] })).status, 400);
    assert.equal((await request(path, 'PUT', { items: [{ ingredient: String(new mongoose.Types.ObjectId()), quantityRequired: 10 }] })).status, 404);
    const link = await ProductIngredient.findOne({ product: product._id });
    assert.equal(link.quantityRequired, 10);
    assert.equal((await request(`/api/product-ingredients/${link._id}`, 'PUT', { quantityRequired: 12 })).status, 200);
    assert.equal((await Product.findById(product._id)).recipe[0].quantityRequired, 12);
    assert.equal((await request(path, 'PUT', { items })).status, 200);
    assert.equal(await ProductIngredient.countDocuments({ product: product._id }), 1);
    const updateProduct = Product.findByIdAndUpdate;
    try {
      Product.findByIdAndUpdate = () => { throw new Error('Injected storage failure'); };
      assert.equal((await request(path, 'PUT', { items: [{ ...items[0], quantityRequired: 99 }] })).status, 500);
    } finally { Product.findByIdAndUpdate = updateProduct; }
    assert.equal((await ProductIngredient.findOne({ product: product._id })).quantityRequired, 10);
    assert.equal((await Product.findById(product._id)).recipe[0].quantityRequired, 10);
  });

  await t.test('preparing orders deduct stock once, reject shortages and protect KDS writes', async () => {
    const body = { orderType: 'DINE_IN', tableNumber: 'A1', items: [{ productId: product._id, quantity: 2, size: 'M' }], paymentMethod: 'PAY_AT_COUNTER' };
    const created = await request('/api/orders', 'POST', body);
    assert.equal(created.status, 201);
    const id = created.data._id;
    assert.equal(created.data.status, 'PENDING');
    assert.equal((await Ingredient.findById(ingredient._id)).currentStock, 100);
    const payment = await Payment.findOne({ order: id });
    assert.equal((await request(`/api/payments/${payment._id}/counter-confirm`, 'POST', { paymentMethod: 'CASH' })).status, 200);
    assert.equal((await request(`/api/orders/${id}/status`, 'PUT', { status: 'PREPARING' })).status, 200);
    assert.equal((await Order.findById(id)).inventoryProcessing, false);
    assert.equal((await Ingredient.findById(ingredient._id)).currentStock, 80);
    assert.equal(await InventoryTransaction.countDocuments({ referenceId: new mongoose.Types.ObjectId(id), transactionType: 'OUT_ORDER' }), 1);
    const path = `/api/orders/${id}/items/0/prepared`;
    assert.equal((await request(path, 'PUT', { isPrepared: true }, customerToken)).status, 403);
    assert.equal((await request(path, 'PUT', { isPrepared: 'yes' })).status, 400);
    assert.equal((await request(path, 'PUT', { isPrepared: true })).status, 200);
    assert.equal((await request(path, 'PUT', { isPrepared: false })).status, 200);
    assert.equal((await Order.findById(id)).status, 'PREPARING');
    assert.equal((await Ingredient.findById(ingredient._id)).currentStock, 80);
    const shortage = await request('/api/orders', 'POST', { ...body, items: [{ productId: product._id, quantity: 9, size: 'M' }] });
    assert.equal(shortage.status, 201);
    await Payment.updateOne({ order: shortage.data._id }, { $set: { status: 'SUCCESS' } });
    assert.equal((await request(`/api/orders/${shortage.data._id}/status`, 'PUT', { status: 'PREPARING' })).status, 409);
    assert.equal((await Ingredient.findById(ingredient._id)).currentStock, 80);
    assert.equal(await Order.countDocuments(), 2);
    assert.equal((await request(`/api/ingredients/${ingredient._id}`, 'DELETE')).status, 409);
    const scarce = await Ingredient.create({ name: 'Scarce ingredient', unit: 'gram', currentStock: 1 });
    await request(`/api/product-ingredients/product/${product._id}`, 'PUT', { items: [{ ingredient: ingredient._id, quantityRequired: 10 }, { ingredient: String(scarce._id), quantityRequired: 2 }] });
    const scarceOrder = await request('/api/orders', 'POST', { ...body, items: [{ productId: product._id, quantity: 1, size: 'M' }] });
    assert.equal(scarceOrder.status, 201);
    await Payment.updateOne({ order: scarceOrder.data._id }, { $set: { status: 'SUCCESS' } });
    assert.equal((await request(`/api/orders/${scarceOrder.data._id}/status`, 'PUT', { status: 'PREPARING' })).status, 409);
    assert.equal((await Ingredient.findById(ingredient._id)).currentStock, 80);
    assert.equal((await Ingredient.findById(scarce._id)).currentStock, 1);
    await request(`/api/product-ingredients/product/${product._id}`, 'PUT', { items: [{ ingredient: ingredient._id, quantityRequired: 10 }] });
    const pending = await Order.create({ orderCode: 'AUDIT-CONCURRENT-STOCK', orderType: 'TAKEAWAY', status: 'PENDING', totalAmount: 30000, finalAmount: 30000, items: [{ product: product._id, productNameAtTime: product.name, quantity: 1, unitPrice: 30000, subtotal: 30000 }] });
    await Payment.create({ order: pending._id, amount: 30000, paymentMethod: 'CASH', status: 'SUCCESS' });
    const results = await Promise.all([1, 2].map(() => request(`/api/orders/${pending._id}/status`, 'PUT', { status: 'PREPARING' })));
    assert.ok(results.some(result => result.status === 200));
    assert.ok(results.every(result => [200, 409].includes(result.status)));
    assert.equal((await Ingredient.findById(ingredient._id)).currentStock, 70);
    assert.equal(await InventoryTransaction.countDocuments({ referenceId: pending._id }), 1);
  });

  await t.test('settings reject invalid values and overlapping shifts without partial writes', async () => {
    assert.equal((await request('/api/shop-settings', 'PUT', { delivery_fee: '18000', points_earn_unit: '2000' })).status, 200);
    assert.equal((await request('/api/shop-settings', 'PUT', { delivery_fee: '1000', points_earn_unit: 'NaN' })).status, 400);
    assert.equal((await ShopSetting.findOne({ settingKey: 'delivery_fee' })).settingValue, '18000');
    assert.equal((await request('/api/shop-settings', 'PUT', { shift_morning: '10:00-14:00' })).status, 400);
    assert.equal((await request('/api/shop-settings', 'PUT', { shift_morning: '12:00-07:00' })).status, 400);
    assert.equal((await request('/api/shop-settings', 'PUT', [])).status, 400);
    assert.equal((await request('/api/loyalty-transactions/rules', 'PUT', { points_earn_unit: 'NaN' })).status, 400);
    assert.equal((await request('/api/loyalty-transactions/rules', 'PUT', { points_earn_unit: 1000, tiers: [{ tierCode: 'SILVER', minPoints: -1, minSpent: 0, discountPercent: 101, pointMultiplier: 1 }] })).status, 400);
    assert.equal((await ShopSetting.findOne({ settingKey: 'points_earn_unit' })).settingValue, '2000');
  });

  await t.test('loyalty applies configured earning after payment and completion, without duplicate credits', async () => {
    await request('/api/loyalty-transactions/rules');
    const order = await Order.create({ orderCode: 'AUDIT-POINTS', customer: customer._id, orderType: 'TAKEAWAY', status: 'READY', totalAmount: 20000, finalAmount: 20000 });
    const payment = await Payment.create({ order: order._id, paymentMethod: 'CASH', amount: 20000, status: 'PENDING' });
    const path = `/api/orders/${order._id}/status`;
    assert.equal((await request(path, 'PUT', { status: 'COMPLETED' })).status, 409);
    assert.equal((await User.findById(customer._id)).totalPoints, 0);
    assert.equal((await request(`/api/payments/${payment._id}/counter-confirm`, 'POST', { paymentMethod: 'CASH' })).status, 200);
    assert.equal((await User.findById(customer._id)).totalPoints, 10);
    await Promise.all([awardOrderPoints(order._id), awardOrderPoints(order._id)]);
    assert.equal((await request(path, 'PUT', { status: 'COMPLETED' })).status, 200);
    assert.equal((await User.findById(customer._id)).totalPoints, 10);
    assert.equal(await LoyaltyTransaction.countDocuments({ order: order._id, transactionType: 'EARN' }), 1);
    assert.equal((await request('/api/loyalty-transactions/adjust', 'POST', { customerId: String(admin._id), pointsChange: 1 })).status, 404);
    assert.equal((await request('/api/loyalty-transactions/adjust', 'POST', { customerId: String(customer._id), pointsChange: 1.5 })).status, 400);
    const deductions = await Promise.all([1, 2].map(() => request('/api/loyalty-transactions/adjust', 'POST', { customerId: String(customer._id), pointsChange: -8 })));
    assert.deepEqual(deductions.map(result => result.status).sort(), [201, 400]);
    assert.equal((await User.findById(customer._id)).totalPoints, 2);
  });

  await t.test('cancelling a redeemed order restores points and reward stock once', async () => {
    const reward = await RewardItem.create({ name: 'Used reward', pointsCost: 4, discountValue: 1000, stock: 0 });
    const order = await Order.create({ orderCode: 'AUDIT-REFUND', customer: customer._id, orderType: 'TAKEAWAY', totalAmount: 10000, finalAmount: 9000, reward: reward._id, pointsRedeemed: 4 });
    const path = `/api/orders/${order._id}/status`;
    assert.equal((await request(path, 'PUT', { status: 'CANCELLED', cancelReason: 'Customer cancelled' })).status, 200);
    await Promise.all([refundRedemption(await Order.findById(order._id)), refundRedemption(await Order.findById(order._id))]);
    assert.equal((await request(path, 'PUT', { status: 'CANCELLED', cancelReason: 'Customer cancelled' })).status, 200);
    assert.equal((await User.findById(customer._id)).totalPoints, 6);
    assert.equal((await RewardItem.findById(reward._id)).stock, 1);
    assert.equal(await LoyaltyTransaction.countDocuments({ order: order._id, redemptionRefund: true }), 1);
  });

  await t.test('inventory valuation ignores drafts and uses the newest received purchase', async () => {
    const create = (status, unitPrice, createdAt) => PurchaseOrder.create({ supplier: supplier._id, creator: admin._id, status, totalCost: unitPrice, createdAt, items: [{ ingredient: ingredient._id, quantity: 1, unitPrice }] });
    await create('RECEIVED', 100, '2026-01-01');
    await create('RECEIVED', 200, '2026-01-02');
    await create('DRAFT', 999, '2026-01-03');
    const overview = await request('/api/inventory-transactions/overview');
    assert.equal(overview.data.ingredients.find(row => row._id === ingredient._id).latestUnitPrice, 200);
    const received = await request('/api/purchase-orders', 'POST', { supplier: String(supplier._id), status: 'CANCELLED', items: [{ ingredient: ingredient._id, quantity: 1, unitPrice: 1 }] });
    assert.equal(received.status, 400);
    const ordered = await request('/api/purchase-orders', 'POST', { supplier: String(supplier._id), status: 'ORDERED', items: [{ ingredient: ingredient._id, quantity: 1, unitPrice: 1 }] });
    assert.equal(ordered.status, 201);
    assert.equal(ordered.data.status, 'ORDERED');
  });

  await t.test('CRM and feedback validate input and preserve administration access', async () => {
    assert.equal((await request('/api/users/customers', 'POST', { fullName: '   ', phone: '0999888003' })).status, 400);
    assert.equal((await request('/api/users/customers', 'POST', { fullName: 'Invalid', phone: 'invalid' })).status, 400);
    assert.equal((await request('/api/users/customers', 'POST', { fullName: 'Invalid', phone: '0999888003', initialPoints: 0.5 })).status, 400);
    assert.equal((await request(`/api/users/${admin._id}`, 'PUT', { status: 'LOCKED' })).status, 409);
    assert.equal((await request(`/api/users/${admin._id}`, 'DELETE')).status, 409);
    assert.equal((await request(`/api/users/${customer._id}`, 'DELETE')).status, 409);
    assert.equal((await request('/api/users/customers?search=%5B&page=-1&limit=-5')).status, 200);
    const review = await CustomerReview.create({ customer: customer._id, issueType: 'COMPLAINT', content: 'Test feedback' });
    assert.equal((await request(`/api/customer-reviews/${review._id}/respond`, 'PUT', { adminResponse: ' ', status: 'RESOLVED' })).status, 400);
    assert.equal((await request(`/api/customer-reviews/${review._id}/respond`, 'PUT', { adminResponse: 'Valid reply', status: 'INVALID' })).status, 400);
    assert.equal((await CustomerReview.findById(review._id)).status, 'PENDING');
    assert.equal((await request(`/api/customer-reviews/${review._id}/respond`, 'PUT', { adminResponse: 'Valid reply', status: 'RESOLVED' })).status, 200);
  });

  await t.test('admin can assign, reassign and release a shipper before delivery', async () => {
    const [first, second] = await User.create([
      { fullName: 'First Shipper', phone: '0999888011', role: 'STAFF', position: 'SHIPPER', passwordHash: 'unused-test-hash' },
      { fullName: 'Second Shipper', phone: '0999888012', role: 'STAFF', position: 'SHIPPER', passwordHash: 'unused-test-hash' }
    ]);
    const order = await Order.create({ orderCode: 'AUDIT-SHIPPER', orderType: 'ONLINE', paymentMethod: 'COD', status: 'READY', totalAmount: 30000, finalAmount: 30000 });
    const path = `/api/orders/${order._id}/status`;
    for (const shipperId of [String(first._id), String(second._id), null]) {
      assert.equal((await request(path, 'PUT', { status: 'READY', shipperId })).status, 200);
      assert.equal(String((await Order.findById(order._id)).shipper || ''), shipperId || '');
    }
  });

  await t.test('reports count revenue from paid completed orders and validate date boundaries', async () => {
    for (const [code, status, paid] of [['PAID', 'COMPLETED', true], ['UNPAID', 'COMPLETED', false], ['CANCELLED', 'CANCELLED', true], ['PREPAID', 'CONFIRMED', true]]) {
      const order = await Order.create({ orderCode: `REPORT-${code}`, orderType: 'TAKEAWAY', status, totalAmount: 10000, finalAmount: 10000, createdAt: '2026-02-01T03:00:00Z' });
      await Payment.create({ order: order._id, amount: 10000, status: paid ? 'SUCCESS' : 'PENDING', paymentMethod: 'CASH', ...(paid ? { paidAt: new Date('2026-02-01T03:00:00Z') } : {}) });
    }
    const report = await request('/api/reports?startDate=2026-02-01&endDate=2026-02-01');
    assert.equal(report.status, 200);
    assert.equal(report.data.overview.orderCount, 4);
    assert.equal(report.data.overview.revenue, 20000);
    assert.equal(report.data.overview.paidOrderCount, 2);
    assert.equal(report.data.overview.averageOrderValue, 10000);
    assert.equal((await request('/api/reports?startDate=2026-02-30&endDate=2026-03-01')).status, 400);
    assert.equal((await request('/api/reports?startDate=2026-03-02&endDate=2026-03-01')).status, 400);
  });
});
