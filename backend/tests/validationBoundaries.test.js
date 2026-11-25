const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = require('../server');
const getJwtSecret = require('../config/jwtSecret');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Ingredient = require('../models/Ingredient');
const Supplier = require('../models/Supplier');
const Cart = require('../models/Cart');
const PurchaseOrder = require('../models/PurchaseOrder');
const InventoryTransaction = require('../models/InventoryTransaction');
const DeliveryArea = require('../models/DeliveryArea');

test('API validation rejects malformed input without modifying persisted records', async t => {
  const dbName = `aura_validation_test_${randomBytes(6).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI, { dbName, serverSelectionTimeoutMS: 5000 });
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    assert.equal(mongoose.connection.name, dbName);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  const admin = await User.create({ fullName: 'Validation Admin', phone: '0999100001', role: 'ADMIN', passwordHash: 'fixture' });
  const customer = await User.create({ fullName: 'Validation Customer', phone: '0999100002', role: 'CUSTOMER', passwordHash: 'fixture' });
  const category = await Category.create({ name: 'Validation category' });
  const product = await Product.create({ name: 'Validation coffee', category: category._id, basePrice: 30000, variantsConfig: { sizes: { M: 0 } } });
  const expensive = await Product.create({ name: 'Boundary price', category: category._id, basePrice: Number.MAX_SAFE_INTEGER, variantsConfig: { sizes: { M: 1 } } });
  const supplier = await Supplier.create({ name: 'Validation supplier' });
  const ingredient = await Ingredient.create({ name: 'Validation beans', unit: 'g', supplier: supplier._id, currentStock: 100 });
  const area = await DeliveryArea.create({ district: 'Validation district', deliveryFee: 18000 });
  const adminToken = jwt.sign({ id: admin._id }, getJwtSecret());
  const customerToken = jwt.sign({ id: customer._id }, getJwtSecret());
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (method, path, body, token = adminToken) => {
    const response = await fetch(base + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    return { status: response.status, body: await response.json() };
  };
  const assertRejected = async (name, method, path, body, model, token) => {
    await t.test(name, async () => {
      const before = model ? await model.find().sort({ _id: 1 }).lean() : null;
      const result = await request(method, path, body, token);
      assert.equal(result.status, 400, JSON.stringify(result.body));
      if (model) assert.deepEqual(await model.find().sort({ _id: 1 }).lean(), before, 'Invalid request must not write data');
    });
  };

  for (const [method, path, token] of [
    ['POST', '/api/auth/login', customerToken],
    ['POST', '/api/auth/register', customerToken],
    ['PUT', '/api/auth/profile', customerToken],
    ['POST', '/api/users/customers', adminToken],
    ['POST', '/api/ingredients', adminToken],
    ['POST', '/api/purchase-orders', adminToken],
    ['PUT', '/api/cart', customerToken]
  ]) {
    for (const [label, body] of [['array', []], ['null', null], ['scalar', 'invalid'], ['missing body', undefined]]) {
      await assertRejected(`${method} ${path} rejects ${label}`, method, path, body, null, token);
    }
  }
  for (const path of ['/api/users/not-an-id', '/api/users/customers/not-an-id', '/api/products/not-an-id', '/api/ingredients/not-an-id']) {
    await assertRejected(`GET ${path} rejects malformed IDs`, 'GET', path);
  }
  for (const password of [null, true, [], {}, '12345678', 'password', 'Password1 ', 'é'.repeat(36) + '1']) {
    await assertRejected(`registration rejects password ${JSON.stringify(password)}`, 'POST', '/api/auth/register', { fullName: 'Test Customer', phone: '0999100003', email: 'validation@example.com', password }, User);
  }
  const validUser = { fullName: 'Valid Customer', phone: '0999100004', email: 'new-validation@example.com', password: 'ValidPass123', role: 'CUSTOMER' };
  for (const patch of [
    { phone: 'abc' }, { phone: ' 0999100004 x ' }, { fullName: 123 }, { fullName: ' ' },
    { baseSalary: -1 }, { baseSalary: true }, { hireDate: '2026-02-30' },
    { birthday: 'invalid' }, { address: {} }, { email: false }, { role: 'OWNER' }, { position: 'ROOT' }
  ]) {
    await assertRejected(`admin user creation rejects ${JSON.stringify(patch)}`, 'POST', '/api/users', { ...validUser, ...patch }, User);
  }
  for (const patch of [{ fullName: [] }, { baseSalary: -1 }, { baseSalary: true }, { birthday: '2026-02-30' }, { address: {} }, { role: 'OWNER' }]) {
    await assertRejected(`user update rejects ${JSON.stringify(patch)}`, 'PUT', `/api/users/${customer._id}`, patch, User);
  }
  for (const value of [true, false, [], [2], {}, null, ' ', Number.MAX_SAFE_INTEGER + 1]) {
    await assertRejected(`purchase rejects malformed quantity ${JSON.stringify(value)}`, 'POST', '/api/purchase-orders', { supplier: supplier._id, items: [{ ingredient: ingredient._id, quantity: value, totalCost: 5000 }] }, PurchaseOrder);
  }
  for (const value of [true, false, [], [5000], {}, null, ' ', Number.MAX_SAFE_INTEGER + 1]) {
    await assertRejected(`purchase rejects malformed total ${JSON.stringify(value)}`, 'POST', '/api/purchase-orders', { supplier: supplier._id, items: [{ ingredient: ingredient._id, quantity: 1, totalCost: value }] }, PurchaseOrder);
  }
  await assertRejected('purchase rejects an unsafe sum of individually valid totals', 'POST', '/api/purchase-orders', {
    supplier: supplier._id, items: [
      { ingredient: ingredient._id, quantity: 1, totalCost: Number.MAX_SAFE_INTEGER },
      { ingredient: new mongoose.Types.ObjectId(), quantity: 1, totalCost: 1 }
    ]
  }, PurchaseOrder);
  for (const value of [true, [2], {}, Number.MAX_SAFE_INTEGER + 1]) {
    await assertRejected(`inventory rejects malformed quantity ${JSON.stringify(value)}`, 'POST', '/api/inventory-transactions', { ingredient: ingredient._id, transactionType: 'ADJUSTMENT', isAddition: true, quantity: value }, Ingredient);
  }
  await assertRejected('inventory rejects an invalid reference before moving stock', 'POST', '/api/inventory-transactions', { ingredient: ingredient._id, transactionType: 'ADJUSTMENT', isAddition: true, quantity: 1, referenceId: 'invalid' }, Ingredient);
  await assertRejected('inventory rejects a nontext note before moving stock', 'POST', '/api/inventory-transactions', { ingredient: ingredient._id, transactionType: 'ADJUSTMENT', isAddition: true, quantity: 1, note: {} }, InventoryTransaction);
  for (const toppings of [[null], [false], [[]]]) {
    await assertRejected(`product rejects malformed toppings ${JSON.stringify(toppings)}`, 'PUT', `/api/products/${product._id}`, { variantsConfig: { sizes: { M: 0 }, toppings } }, Product);
  }
  for (const quantity of [true, [2], {}]) {
    await assertRejected(`cart rejects malformed quantity ${JSON.stringify(quantity)}`, 'PUT', '/api/cart', { items: [{ productId: product._id, quantity, size: 'M' }] }, Cart, customerToken);
  }
  for (const patch of [{ size: ['M'] }, { customization: false }, { customization: { topping: false } }, { checked: 'false' }]) {
    await assertRejected(`cart rejects malformed options ${JSON.stringify(patch)}`, 'PUT', '/api/cart', { items: [{ productId: product._id, quantity: 1, size: 'M', ...patch }] }, Cart, customerToken);
  }
  await assertRejected('product rejects duplicate topping names', 'PUT', `/api/products/${product._id}`, { variantsConfig: { sizes: { M: 0 }, toppings: [{ name: 'Pearl', price: 1000 }, { name: 'pearl', price: 2000 }] } }, Product);
  await User.updateOne({ _id: customer._id }, { $set: { totalPoints: 1 } });
  await assertRejected('loyalty rejects a safe change that would overflow the resulting balance', 'POST', '/api/loyalty-transactions/adjust', { customerId: customer._id, pointsChange: Number.MAX_SAFE_INTEGER }, User);
  await assertRejected('cart rejects unit-price overflow', 'PUT', '/api/cart', { items: [{ productId: expensive._id, quantity: 1, size: 'M' }] }, Cart, customerToken);
  await Product.updateOne({ _id: expensive._id }, { $set: { 'variantsConfig.sizes.M': 0 } });
  await assertRejected('cart rejects subtotal overflow', 'PUT', '/api/cart', { items: [{ productId: expensive._id, quantity: 2, size: 'M' }] }, Cart, customerToken);
  for (const patch of [{ deliveryFee: true }, { deliveryFee: [] }, { isActive: 'false' }, { isActive: 0 }]) {
    await assertRejected(`delivery area update rejects ${JSON.stringify(patch)}`, 'PUT', `/api/delivery-areas/${area._id}`, patch, DeliveryArea);
  }
  await t.test('validation responses identify the exact field and useful correction', async () => {
    const phone = await request('POST', '/api/users', { ...validUser, phone: 'abc' });
    assert.equal(phone.status, 400);
    assert.match(phone.body.errors.phone, /Số điện thoại.*9 đến 15 chữ số/);
    assert.equal(phone.body.message, phone.body.errors.phone);
    const purchase = await request('POST', '/api/purchase-orders', { supplier: supplier._id, items: [{ ingredient: ingredient._id, quantity: 0, totalCost: 5000 }] });
    assert.equal(purchase.status, 400);
    assert.match(purchase.body.errors['items.0.quantity'], /Số lượng nhập dòng 1.*0\.001/);
    const stock = await request('POST', '/api/inventory-transactions', { ingredient: ingredient._id, transactionType: 'ADJUSTMENT', isAddition: true, quantity: true });
    assert.equal(stock.status, 400);
    assert.match(stock.body.message, /Số lượng điều chỉnh kho phải là số/);
    const topping = await request('PUT', `/api/products/${product._id}`, { variantsConfig: { sizes: { M: 0 }, toppings: [null] } });
    assert.equal(topping.status, 400);
    assert.match(topping.body.message, /Topping dòng 1.*tên và giá/);
    const employee = await request('POST', '/api/employees', {});
    assert.equal(employee.status, 400);
    assert.match(employee.body.message, /nhập họ tên/);
    assert.doesNotMatch(employee.body.message, /fullName|máy chủ|không thể lưu/i);
  });
  await t.test('valid numeric strings remain supported for purchase and inventory input', async () => {
    const purchase = await request('POST', '/api/purchase-orders', { supplier: supplier._id, items: [{ ingredient: ingredient._id, quantity: '2.5', totalCost: '5000' }] });
    assert.equal(purchase.status, 201, JSON.stringify(purchase.body));
    assert.equal(purchase.body.items[0].quantity, 2.5);
    const adjustment = await request('POST', '/api/inventory-transactions', { ingredient: ingredient._id, transactionType: 'ADJUSTMENT', isAddition: true, quantity: '2.5' });
    assert.equal(adjustment.status, 201, JSON.stringify(adjustment.body));
    assert.equal((await Ingredient.findById(ingredient._id)).currentStock, 102.5);
  });
});
