const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = require('../server');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Ingredient = require('../models/Ingredient');
const ProductIngredient = require('../models/ProductIngredient');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Loyalty = require('../models/LoyaltyTransaction');
const ShopSetting = require('../models/ShopSetting');
const jwtSecret = require('../config/jwtSecret')();

test('checkoutFlow comprehensive integration: address validation, stock check, cart preservation, duplicate guard, COD lifecycle', async t => {
  const dbName = `aura_checkout_flow_test_${randomBytes(5).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aura_cafe_erp', { dbName, serverSelectionTimeoutMS: 5000 });
  await Loyalty.init();

  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    assert.match(mongoose.connection.db.databaseName, /^aura_checkout_flow_test_[a-f0-9]+$/);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const request = async (method, path, body, token) => {
    if (path === '/api/orders' && body?.checkoutFlow) body = { ...body, checkoutSessionId: '00000000-0000-4000-8000-000000000001', idempotencyKey: randomUUID() };
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await res.json().catch(() => null);
    if (res.status >= 400) console.error('REQUEST ERROR:', method, path, res.status, data);
    return { status: res.status, data };
  };

  // Seed shop settings
  await require('../models/DeliveryArea').create({ district: 'Cầu Giấy', deliveryFee: 18000 });
  await ShopSetting.create([
    { settingKey: 'delivery_fee', settingValue: '18000', settingGroup: 'DELIVERY' },
    { settingKey: 'freeship_threshold', settingValue: '150000', settingGroup: 'DELIVERY' },
    { settingKey: 'points_step', settingValue: '10', settingGroup: 'LOYALTY' },
    { settingKey: 'points_step_value', settingValue: '2000', settingGroup: 'LOYALTY' },
    { settingKey: 'points_earn_unit', settingValue: '1000', settingGroup: 'LOYALTY' }
  ]);

  // Seed accounts
  const customer = await User.create({ fullName: 'Checkout Customer', phone: '0901234567', email: 'customer@aura.vn', passwordHash: 'pwd', role: 'CUSTOMER', totalPoints: 100 });
  const barista = await User.create({ fullName: 'Staff Barista', phone: '0902222222', email: 'barista@aura.vn', passwordHash: 'pwd', role: 'STAFF', position: 'BARISTA' });
  const shipper = await User.create({ fullName: 'Staff Shipper', phone: '0903333333', email: 'shipper@aura.vn', passwordHash: 'pwd', role: 'STAFF', position: 'SHIPPER' });
  const admin = await User.create({ fullName: 'Admin Aura', phone: '0904444444', email: 'admin@aura.vn', passwordHash: 'pwd', role: 'ADMIN' });

  const custToken = jwt.sign({ id: customer._id }, jwtSecret);
  const baristaToken = jwt.sign({ id: barista._id }, jwtSecret);
  const shipperToken = jwt.sign({ id: shipper._id }, jwtSecret);
  const adminToken = jwt.sign({ id: admin._id }, jwtSecret);

  // Seed Catalog & Ingredients
  const cat = await Category.create({ name: 'Cà phê', status: 'ACTIVE' });
  const milk = await Ingredient.create({ name: 'Sữa đặc', unit: 'ml', currentStock: 500, minStockAlert: 50 });
  const beans = await Ingredient.create({ name: 'Hạt Arabica', unit: 'g', currentStock: 20, minStockAlert: 50 }); // low stock: only 20g!

  const coffee = await Product.create({
    name: 'Cà phê Sữa',
    category: cat._id,
    basePrice: 35000,
    isAvailable: true,
    variantsConfig: {
      sizes: { S: 0, M: 5000, L: 10000 },
      toppings: [{ name: 'Thạch Cà Phê', price: 8000 }]
    }
  });

  const tea = await Product.create({
    name: 'Trà Đào',
    category: cat._id,
    basePrice: 40000,
    isAvailable: true,
    variantsConfig: { sizes: { M: 0, L: 5000 }, toppings: [] }
  });

  // Recipe for Coffee: 15g beans per cup, 30ml milk
  await ProductIngredient.create([
    { product: coffee._id, ingredient: beans._id, quantityRequired: 15, unit: 'g' },
    { product: coffee._id, ingredient: milk._id, quantityRequired: 30, unit: 'ml' }
  ]);

  // Seed Cart for Customer
  const cartItemCoffeeM = {
    product: coffee._id,
    size: 'M',
    quantity: 2,
    customization: { sugar: '50%', ice: 'Đá chuẩn', topping: ['Thạch Cà Phê'], note: 'Ít ngọt' }
  };
  const cartItemTeaL = {
    product: tea._id,
    size: 'L',
    quantity: 1,
    customization: { sugar: '100%', ice: 'Đá chuẩn' }
  };
  await Cart.create({
    customer: customer._id,
    items: [cartItemCoffeeM, cartItemTeaL]
  });

  // 1. Validate Phone & Address
  await t.test('checkoutFlow validates phone format and required address parts', async () => {
    const validBase = {
      checkoutFlow: true,
      orderType: 'ONLINE',
      recipientName: 'Khách hàng',
      recipientPhone: '0901234567',
      district: 'Cầu Giấy',
      ward: 'Dịch Vọng Hậu',
      addressDetail: 'Số 8 Tôn Thất Thuyết',
      expectedTotal: 48000 + 18000,
      items: [{ productId: coffee._id, size: 'M', quantity: 1, customization: { sugar: '50%', ice: 'Đá chuẩn', topping: ['Thạch Cà Phê'], note: 'Ít ngọt' } }]
    };

    // Invalid phone: non-zero starting or not 10-11 digits
    const badPhone1 = await request('POST', '/api/orders', { ...validBase, recipientPhone: '19001234' }, custToken);
    assert.equal(badPhone1.status, 400);

    const badPhone2 = await request('POST', '/api/orders', { ...validBase, recipientPhone: '090' }, custToken);
    assert.equal(badPhone2.status, 400);

    // Missing district / ward / addressDetail
    const badDistrict = await request('POST', '/api/orders', { ...validBase, district: '' }, custToken);
    assert.equal(badDistrict.status, 400);

    const badWard = await request('POST', '/api/orders', { ...validBase, ward: ' ' }, custToken);
    assert.equal(badWard.status, 400);

    const badAddress = await request('POST', '/api/orders', { ...validBase, addressDetail: '12' }, custToken);
    assert.equal(badAddress.status, 400);
  });

  // 2. Stock check before checkout
  await t.test('checkoutFlow checks raw ingredient stock and rejects shortage', async () => {
    // beans currentStock is 20g. Each coffee takes 15g. 2 coffees take 30g > 20g!
    // subtotal = 2 * (35000 + 5000) = 80000 + 18000 delivery = 98000
    const shortageReq = await request('POST', '/api/orders', {
      checkoutFlow: true,
      orderType: 'ONLINE',
      recipientName: 'Khách hàng',
      recipientPhone: '0901234567',
      district: 'Cầu Giấy',
      ward: 'Dịch Vọng Hậu',
      addressDetail: 'Số 8 Tôn Thất Thuyết',
      expectedTotal: 98000,
      items: [{ productId: coffee._id, size: 'M', quantity: 2 }]
    }, custToken);

    assert.equal(shortageReq.status, 409);
    assert.match(shortageReq.data.message, /nguyên liệu/i);
  });

  // Top up beans so subsequent tests can order
  await Ingredient.updateOne({ _id: beans._id }, { $set: { currentStock: 5000 } });

  // 3. Settings shipping fee check
  await t.test('shipping fee applies settings threshold: subtotal < 150000 adds 18000, >= 150000 is free', async () => {
    // 1 coffee M = base 35000 + 5000 = 40000 < 150000 -> delivery fee 18000 -> expectedTotal = 58000
    const order1Res = await request('POST', '/api/orders', {
      checkoutFlow: true,
      orderType: 'ONLINE',
      recipientName: 'Khách hàng',
      recipientPhone: '0901234567',
      district: 'Cầu Giấy',
      ward: 'Dịch Vọng Hậu',
      addressDetail: 'Số 8 Tôn Thất Thuyết',
      paymentMethod: 'COD',
      expectedTotal: 58000,
      items: [{ productId: coffee._id, size: 'M', quantity: 1 }]
    }, custToken);
    assert.equal(order1Res.status, 201);
    assert.equal(order1Res.data.deliveryFee, 18000);
    assert.equal(order1Res.data.totalAmount, 40000);
    assert.equal(order1Res.data.finalAmount, 58000);

    // Cancel order1 so customer has no pending blocking
    await request('PUT', `/api/orders/${order1Res.data._id}/status`, { status: 'CANCELLED', cancelReason: 'Hủy đơn thử nghiệm' }, custToken);

    // 4 coffees L = 4 * 45000 = 180000 >= 150000 -> delivery fee 0 -> expectedTotal = 180000
    const orderFreeRes = await request('POST', '/api/orders', {
      checkoutFlow: true,
      orderType: 'ONLINE',
      recipientName: 'Khách hàng',
      recipientPhone: '0901234567',
      district: 'Cầu Giấy',
      ward: 'Dịch Vọng Hậu',
      addressDetail: 'Số 8 Tôn Thất Thuyết',
      paymentMethod: 'COD',
      expectedTotal: 180000,
      items: [{ productId: coffee._id, size: 'L', quantity: 4 }]
    }, custToken);
    assert.equal(orderFreeRes.status, 201);
    assert.equal(orderFreeRes.data.deliveryFee, 0);
    assert.equal(orderFreeRes.data.finalAmount, 180000);

    await request('PUT', `/api/orders/${orderFreeRes.data._id}/status`, { status: 'CANCELLED', cancelReason: 'Hủy đơn thử nghiệm' }, custToken);
  });

  // 4. Create pending order keeps cart intact, prevents duplicate submit & double points deduction
  let pendingOrderId;
  await t.test('pending checkout keeps cart intact and blocks duplicate order submission', async () => {
    // 1 coffee M + Thạch Cà Phê: base 35000 + 5000 size M + 8000 topping = 48000
    // Redeem 20 points (points_step = 10, step_value = 2000 => 2 steps * 2000 = 4000 VND discount).
    // Total = 48000 - 4000 + 18000 shipping = 62000
    const orderRes = await request('POST', '/api/orders', {
      checkoutFlow: true,
      orderType: 'ONLINE',
      paymentMethod: 'BANK_TRANSFER',
      recipientName: 'Khách hàng A',
      recipientPhone: '0901234567',
      district: 'Cầu Giấy',
      ward: 'Dịch Vọng Hậu',
      addressDetail: 'Số 8 Tôn Thất Thuyết',
      pointsToRedeem: 20,
      expectedTotal: 62000,
      items: [{
        productId: coffee._id,
        size: 'M',
        quantity: 1, // ordering 1 coffee M out of 2 in cart!
        customization: { sugar: '50%', ice: 'Đá chuẩn', topping: ['Thạch Cà Phê'], note: 'Ít ngọt' }
      }]
    }, custToken);

    assert.equal(orderRes.status, 201);
    pendingOrderId = orderRes.data._id;
    assert.equal(orderRes.data.status, 'PENDING');
    assert.equal(orderRes.data.checkoutFlow, true);
    assert.equal(orderRes.data.pointsRedeemed, 20);

    // Points reduced from 100 to 80
    const custDoc = await User.findById(customer._id);
    assert.equal(custDoc.totalPoints, 80);

    // Cart is STILL INTACT! (Items not cleared at checkout time)
    const cartDoc = await Cart.findOne({ customer: customer._id });
    assert.equal(cartDoc.items.length, 2);
    assert.equal(cartDoc.items[0].quantity, 2);
    assert.equal(cartDoc.items[1].quantity, 1);

    // Second checkout attempt in same session cancels previous unpaid checkout, refunds points, and creates new order
    const duplicateRes = await request('POST', '/api/orders', {
      checkoutFlow: true,
      orderType: 'ONLINE',
      paymentMethod: 'BANK_TRANSFER',
      recipientName: 'Khách hàng A',
      recipientPhone: '0901234567',
      district: 'Cầu Giấy',
      ward: 'Dịch Vọng Hậu',
      addressDetail: 'Số 8 Tôn Thất Thuyết',
      pointsToRedeem: 20,
      expectedTotal: 62000,
      items: [{
        productId: coffee._id,
        size: 'M',
        quantity: 1,
        customization: { sugar: '50%', ice: 'Đá chuẩn', topping: ['Thạch Cà Phê'], note: 'Ít ngọt' }
      }]
    }, custToken);

    assert.equal(duplicateRes.status, 201);
    assert.equal(duplicateRes.data.status, 'PENDING');

    // Previous pending order was cancelled and its points were refunded
    const oldOrder = await Order.findById(pendingOrderId);
    assert.equal(oldOrder.status, 'CANCELLED');
    assert.equal(oldOrder.cancelReason, 'Khách đặt lại đơn mới trong cùng phiên');

    // Customer totalPoints: refunded 20 then re-deducted 20 = exactly 80 (not double deducted!)
    assert.equal((await User.findById(customer._id)).totalPoints, 80);

    // Update pendingOrderId to the newly created order for subsequent steps
    pendingOrderId = duplicateRes.data._id;
  });

  // 5. Switching to COD clears only ordered items/quantities, replay is idempotent
  await t.test('switching to COD clears only ordered options & quantities; replay is idempotent', async () => {
    // Switch the pending order to COD
    const switchRes = await request('POST', `/api/payments/order/${pendingOrderId}/cod`, null, custToken);
    assert.equal(switchRes.status, 200);

    const orderDoc = await Order.findById(pendingOrderId);
    assert.equal(orderDoc.paymentMethod, 'COD');
    assert.equal(orderDoc.status, 'CONFIRMED');

    // Cart now has 1 coffee M remaining (2 - 1 = 1) and 1 tea L remaining!
    const cartDoc = await Cart.findOne({ customer: customer._id });
    assert.equal(cartDoc.items.length, 2);
    assert.equal(cartDoc.items[0].quantity, 1);
    assert.equal(cartDoc.items[1].quantity, 1);

    // Replay switch-cod
    const replayRes = await request('POST', `/api/payments/order/${pendingOrderId}/cod`, null, custToken);
    assert.equal(replayRes.status, 200);

    // Cart items and quantities are NOT deducted again
    const cartDoc2 = await Cart.findOne({ customer: customer._id });
    assert.equal(cartDoc2.items.length, 2);
    assert.equal(cartDoc2.items[0].quantity, 1);
    assert.equal(cartDoc2.items[1].quantity, 1);
  });

  // 6. Cancel order refunds redeemed points
  await t.test('cancelling order refunds redeemed points back to customer', async () => {
    // Cancel the pendingOrderId order (status CONFIRMED -> CANCELLED by Admin)
    const cancelRes = await request('PUT', `/api/orders/${pendingOrderId}/status`, { status: 'CANCELLED', cancelReason: 'Customer changed mind' }, adminToken);
    assert.equal(cancelRes.status, 200);

    // Customer points refunded: 80 + 20 = 100!
    const custDoc = await User.findById(customer._id);
    assert.equal(custDoc.totalPoints, 100);

    // Check refund ledger entry
    const refundTx = await Loyalty.findOne({ order: pendingOrderId, transactionType: 'REFUND' });
    assert.ok(refundTx);
    assert.equal(refundTx.pointsChange, 20);
  });

  // 7. Full Delivery Lifecycle: COD -> Barista PREPARING -> READY -> Shipper DELIVERING -> Collect exact cash -> COMPLETED -> Loyalty awarded
  await t.test('full COD lifecycle from prep to delivery and collection', async () => {
    // 2 coffees S: 2 * 35000 = 70000 + 18000 delivery = 88000
    const newOrderRes = await request('POST', '/api/orders', {
      checkoutFlow: true,
      orderType: 'ONLINE',
      paymentMethod: 'BANK_TRANSFER',
      recipientName: 'Khách hàng B',
      recipientPhone: '0901234567',
      district: 'Cầu Giấy',
      ward: 'Dịch Vọng Hậu',
      addressDetail: 'Số 8 Tôn Thất Thuyết',
      expectedTotal: 88000,
      items: [{ productId: coffee._id, size: 'S', quantity: 2 }]
    }, custToken);
    assert.equal(newOrderRes.status, 201);
    const orderId = newOrderRes.data._id;
    assert.equal(newOrderRes.data.status, 'PENDING');
    assert.equal(newOrderRes.data.finalAmount, 88000);

    // Switch to COD via Payment page action
    const codRes = await request('POST', `/api/payments/order/${orderId}/cod`, {}, custToken);
    assert.equal(codRes.status, 200);
    assert.equal(codRes.data.order.status, 'CONFIRMED');
    assert.equal(codRes.data.order.paymentMethod, 'COD');

    // 7a. Barista marks PREPARING -> Stock deducted
    const initialBeans = (await Ingredient.findById(beans._id)).currentStock;
    const prepRes = await request('PUT', `/api/orders/${orderId}/status`, { status: 'PREPARING' }, baristaToken);
    assert.equal(prepRes.status, 200);
    // 2 cups * 15g = 30g deducted
    const afterBeans = (await Ingredient.findById(beans._id)).currentStock;
    assert.equal(afterBeans, initialBeans - 30);

    // 7b. Barista marks READY
    assert.equal((await request('PUT', `/api/orders/${orderId}/status`, { status: 'READY' }, baristaToken)).status, 409);
    assert.equal((await request('PUT', `/api/orders/${orderId}/items/0/prepared`, { isPrepared: true, autoReady: false }, baristaToken)).status, 200);
    const readyRes = await request('PUT', `/api/orders/${orderId}/status`, { status: 'READY' }, baristaToken);
    assert.equal(readyRes.status, 200);

    // 7c. Shipper claims READY order, then starts DELIVERING
    const claimRes = await request('PUT', `/api/orders/${orderId}/status`, { status: 'READY', shipperId: shipper._id }, shipperToken);
    assert.equal(claimRes.status, 200);

    const deliverRes = await request('PUT', `/api/orders/${orderId}/status`, { status: 'DELIVERING' }, shipperToken);
    assert.equal(deliverRes.status, 200);

    // 7d. Shipper completes delivery: wrong collectedAmount rejected
    const wrongCollectRes = await request('PUT', `/api/orders/${orderId}/status`, { status: 'COMPLETED', collectedAmount: 50000 }, shipperToken);
    assert.equal(wrongCollectRes.status, 409);
    assert.match(wrongCollectRes.data.message, /COD thực thu phải bằng số tiền của đơn hàng/i);

    // 7e. Shipper completes delivery: exact collectedAmount succeeds
    const exactCollectRes = await request('PUT', `/api/orders/${orderId}/status`, { status: 'COMPLETED', collectedAmount: 88000 }, shipperToken);
    assert.equal(exactCollectRes.status, 200);

    // Verify Payment is SUCCESS
    const paymentDoc = await Payment.findOne({ order: orderId });
    assert.equal(paymentDoc.status, 'SUCCESS');
    assert.equal(paymentDoc.amount, 88000);

    // Verify Order is COMPLETED
    const finalOrder = await Order.findById(orderId);
    assert.equal(finalOrder.status, 'COMPLETED');

    // Verify loyalty points earned: 70000 VND (excluding 18000 shipping fee) / 1000 = 70 points earned!
    const earnTx = await Loyalty.findOne({ order: orderId, transactionType: 'EARN' });
    assert.ok(earnTx);
    assert.equal(earnTx.pointsChange, 70);

    const finalCustomer = await User.findById(customer._id);
    assert.equal(finalCustomer.totalPoints, 100 + 70);
  });
});
