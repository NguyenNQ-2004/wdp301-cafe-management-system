const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config();
process.env.JWT_SECRET = 'uc11-isolated-test-secret';
process.env.PAYMENT_DEMO_ENABLED = 'true';

const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');
const RewardItem = require('../models/RewardItem');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');

test('UC11 order creation, UC12 demo payment and UC13 counter payment', async (t) => {
  const dbName = `aura_cafe_uc11_test_${randomBytes(4).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', {
    dbName,
    serverSelectionTimeoutMS: 5000
  });

  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../routes/authRoutes'));
  app.use('/api/orders', require('../routes/orderRoutes'));
  app.use('/api/payments', require('../routes/paymentRoutes'));
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    if (!/^aura_cafe_uc11_test_[0-9a-f]+$/.test(mongoose.connection.db.databaseName)) {
      throw new Error('Refusing to drop a database outside the UC11 test namespace');
    }
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, body, token) => {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body)
    });
    return { status: response.status, data: await response.json() };
  };
  const get = async (path, token) => {
    const response = await fetch(`${base}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return { status: response.status, data: await response.json() };
  };
  const put = async (path, body, token) => {
    const response = await fetch(`${base}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    return { status: response.status, data: await response.json() };
  };

  const customer = await User.create({
    fullName: 'UC11 Customer', phone: '0999000011', email: 'test-0999000011@example.com',
    passwordHash: await bcrypt.hash('test-password', 4), role: 'CUSTOMER', totalPoints: 200
  });
  const category = await Category.create({ name: 'UC11 Test Category' });
  const product = await Product.create({ category: category._id, name: 'UC11 Test Coffee', basePrice: 50000, isAvailable: true });
  await Cart.create({ customer: customer._id, items: [{ product: product._id, quantity: 1, size: 'M', checked: true }] });

  assert.equal((await request('/api/auth/login', { email: customer.email, password: 'demo_hash' })).status, 401);
  assert.equal((await request('/api/auth/login', { phone: customer.phone })).status, 400);
  const login = await request('/api/auth/login', { email: customer.email, password: 'test-password' });
  assert.equal(login.status, 200);
  const token = login.data.token;
  const item = { productId: String(product._id), quantity: 1, size: 'M' };
  const delivery = {
    items: [item], orderType: 'ONLINE', recipientName: '  Người nhận  ',
    recipientPhone: ' 090 123 4567 ', deliveryAddress: '  28 Tràng Tiền, Hà Nội  ',
    paymentMethod: 'MOMO', expectedTotal: 68000
  };

  assert.equal((await request('/api/orders', delivery)).status, 401);
  assert.equal((await request('/api/orders', { ...delivery, deliveryAddress: '   ' }, token)).status, 400);
  assert.equal((await request('/api/orders', { ...delivery, recipientPhone: 'abc' }, token)).status, 400);
  assert.equal((await request('/api/orders', { ...delivery, expectedTotal: 1 }, token)).status, 409);
  assert.equal(await Order.countDocuments(), 0);

  const placed = await request('/api/orders', delivery, token);
  assert.equal(placed.status, 201);
  assert.equal(placed.data.recipientName, 'Người nhận');
  assert.equal(placed.data.recipientPhone, '090 123 4567');
  assert.equal(placed.data.deliveryAddress, '28 Tràng Tiền, Hà Nội');
  assert.equal(placed.data.paymentMethod, 'COD');
  assert.equal(placed.data.deliveryFee, 18000);
  assert.equal(placed.data.finalAmount, 68000);
  assert.equal(placed.data.status, 'PENDING');
  assert.equal(await OrderItem.countDocuments({ order: placed.data._id }), 1);
  assert.equal((await Payment.findOne({ order: placed.data._id })).status, 'PENDING');
  assert.equal((await Cart.findOne({ customer: customer._id })).items.length, 0);

  const pickup = await request('/api/orders', {
    items: [item], orderType: 'TAKEAWAY', recipientName: 'Người nhận',
    recipientPhone: '0901234567', expectedTotal: 50000
  }, token);
  assert.equal(pickup.status, 201);
  assert.equal(pickup.data.paymentMethod, 'PAY_AT_COUNTER');
  assert.equal(pickup.data.deliveryAddress, undefined);
  assert.equal(pickup.data.deliveryFee, 0);
  assert.equal(pickup.data.finalAmount, 50000);

  const reward = await RewardItem.create({
    name: 'UC11 Test Reward', pointsCost: 100, discountValue: 15000,
    minOrderValue: 50000, stock: 1
  });
  const redeemed = await request('/api/orders', {
    ...delivery, rewardId: String(reward._id), expectedTotal: 53000
  }, token);
  assert.equal(redeemed.status, 201);
  assert.equal(redeemed.data.discountAmount, 15000);
  assert.equal(redeemed.data.pointsRedeemed, 100);
  assert.equal(redeemed.data.finalAmount, 53000);
  assert.equal((await User.findById(customer._id)).totalPoints, 100);
  assert.equal((await RewardItem.findById(reward._id)).stock, 0);
  assert.equal(await LoyaltyTransaction.countDocuments({ order: redeemed.data._id, transactionType: 'REDEEM' }), 1);

  const otherCustomer = await User.create({ fullName: 'Other Customer', phone: '0999000012', email: 'test-0999000012@example.com', passwordHash: await bcrypt.hash('test-password', 4), role: 'CUSTOMER' });
  const otherLogin = await request('/api/auth/login', { email: otherCustomer.email, password: 'test-password' });
  assert.equal(otherLogin.status, 200);
  const otherToken = otherLogin.data.token;
  const placedPath = `/api/orders/${placed.data._id}/status`;
  assert.equal((await put(placedPath, { status: 'CANCELLED' }, token)).status, 400);
  assert.equal((await put(placedPath, { status: 'CANCELLED', cancelReason: 'not my order' }, otherToken)).status, 403);
  assert.equal((await put('/api/orders/not-an-id/status', { status: 'CANCELLED', cancelReason: 'test' }, token)).status, 400);
  assert.equal((await put(placedPath, { status: 'DELIVERING' }, token)).status, 409);
  assert.equal((await put(placedPath, { status: 'CANCELLED', cancelReason: 'Đổi kế hoạch' }, token)).status, 200);
  assert.equal((await get('/api/payments/config')).data.demoEnabled, true);
  process.env.PAYMENT_DEMO_ENABLED = 'false';
  assert.equal((await get('/api/payments/config')).data.demoEnabled, false);
  assert.equal((await request('/api/orders', { ...delivery, paymentMethod: 'DEMO_ONLINE', demoProvider: 'MOMO' }, token)).status, 403);
  process.env.PAYMENT_DEMO_ENABLED = 'true';
  assert.equal((await request('/api/orders', { ...delivery, paymentMethod: 'DEMO_ONLINE', demoProvider: 'UNKNOWN' }, token)).status, 400);
  assert.equal((await request('/api/orders', { ...delivery, demoProvider: 'MOMO' }, token)).status, 400);
  const demoOrder = await request('/api/orders', { ...delivery, paymentMethod: 'DEMO_ONLINE', demoProvider: 'VNPAY' }, token);
  assert.equal(demoOrder.status, 201, JSON.stringify(demoOrder.data));
  assert.equal(demoOrder.data.paymentMethod, 'DEMO_ONLINE');
  assert.equal(demoOrder.data.demoProvider, 'VNPAY');
  const demoPayment = await Payment.findOne({ order: demoOrder.data._id });
  assert.equal(demoPayment.paymentMethod, 'DEMO_ONLINE');
  assert.equal(demoPayment.demoProvider, 'VNPAY');
  assert.equal(demoPayment.status, 'PENDING');
  assert.equal((await get(`/api/payments/order/${demoOrder.data._id}`, otherToken)).status, 403);
  assert.equal((await request(`/api/payments/${demoPayment._id}/demo-confirm`, {}, otherToken)).status, 403);
  assert.equal((await request(`/api/payments/${demoPayment._id}/demo-confirm`, {})).status, 401);
  const confirmed = await request(`/api/payments/${demoPayment._id}/demo-confirm`, {}, token);
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.data.payment.status, 'SUCCESS');
  assert.match(confirmed.data.payment.transactionCode, /^DEMO-/);
  assert.equal((await request(`/api/payments/${demoPayment._id}/demo-confirm`, {}, token)).data.payment.transactionCode, confirmed.data.payment.transactionCode);
  assert.equal((await Payment.findById(demoPayment._id)).amount, demoOrder.data.finalAmount);
  assert.equal((await get(`/api/payments/order/${demoOrder.data._id}`, token)).data.payment.status, 'SUCCESS');

  const cashier = await User.create({ fullName: 'UC13 Cashier', phone: '0999000013', email: 'test-0999000013@example.com', passwordHash: await bcrypt.hash('test-password', 4), role: 'STAFF', position: 'CASHIER' });
  const barista = await User.create({ fullName: 'UC13 Barista', phone: '0999000014', email: 'test-0999000014@example.com', passwordHash: await bcrypt.hash('test-password', 4), role: 'STAFF', position: 'BARISTA' });
  const cashierToken = (await request('/api/auth/login', { email: cashier.email, password: 'test-password' })).data.token;
  const baristaToken = (await request('/api/auth/login', { email: barista.email, password: 'test-password' })).data.token;
  const shipper = await User.create({ fullName: 'UC14 Shipper', phone: '0999000015', email: 'test-0999000015@example.com', passwordHash: await bcrypt.hash('test-password', 4), role: 'STAFF', position: 'SHIPPER' });
  const shipperToken = (await request('/api/auth/login', { email: shipper.email, password: 'test-password' })).data.token;
  assert.equal((await get('/api/payments', token)).status, 403);
  assert.equal((await get('/api/payments', baristaToken)).status, 403);
  assert.equal((await get('/api/payments', cashierToken)).status, 200);
  const pickupPayment = await Payment.findOne({ order: pickup.data._id });
  assert.equal(pickupPayment.status, 'PENDING');
  const pickupPath = `/api/payments/${pickupPayment._id}/counter-confirm`;
  assert.equal((await request(pickupPath, { paymentMethod: 'CASH' }, token)).status, 403);
  assert.equal((await request(pickupPath, { paymentMethod: 'CASH' }, baristaToken)).status, 403);
  assert.equal((await request(pickupPath, { paymentMethod: 'BANK_TRANSFER' }, cashierToken)).status, 400);
  assert.equal((await request(`/api/payments/${demoPayment._id}/counter-confirm`, { paymentMethod: 'CASH' }, cashierToken)).status, 400);
  const paidPickup = await request(pickupPath, { paymentMethod: 'BANK_TRANSFER', transactionCode: ' BANK-TEST-001 ' }, cashierToken);
  assert.equal(paidPickup.status, 200);
  assert.equal(paidPickup.data.payment.status, 'SUCCESS');
  assert.equal(paidPickup.data.payment.paymentMethod, 'BANK_TRANSFER');
  assert.equal(paidPickup.data.payment.transactionCode, 'BANK-TEST-001');
  assert.equal((await request(pickupPath, { paymentMethod: 'BANK_TRANSFER', transactionCode: 'BANK-TEST-001' }, cashierToken)).data.payment.transactionCode, 'BANK-TEST-001');
  assert.equal((await request(pickupPath, { paymentMethod: 'CASH' }, cashierToken)).status, 409);
  assert.equal((await Order.findById(pickup.data._id)).paymentMethod, 'BANK_TRANSFER');

  for (const method of ['MOMO', 'VNPAY']) {
    const counterOrder = await request('/api/orders', {
      items: [item], orderType: 'TAKEAWAY', recipientName: 'Khách thử',
      recipientPhone: '0901234567', expectedTotal: 50000
    }, token);
    assert.equal(counterOrder.status, 201);
    const counterPayment = await Payment.findOne({ order: counterOrder.data._id });
    const path = `/api/payments/${counterPayment._id}/counter-confirm`;
    assert.equal((await request(path, { paymentMethod: method }, cashierToken)).status, 400);
    const confirmedCounter = await request(path, { paymentMethod: method, transactionCode: `${method}-TEST-001` }, cashierToken);
    assert.equal(confirmedCounter.status, 200);
    assert.equal(confirmedCounter.data.payment.paymentMethod, method);
    assert.equal(confirmedCounter.data.payment.transactionCode, `${method}-TEST-001`);
    assert.equal((await Order.findById(counterOrder.data._id)).paymentMethod, method);
  }

  const dineIn = await request('/api/orders', { items: [item], orderType: 'DINE_IN', tableNumber: 'B01', paymentMethod: 'CASH' }, cashierToken);
  assert.equal(dineIn.status, 201);
  const dineInPayment = await Payment.findOne({ order: dineIn.data._id });
  assert.equal(dineInPayment.status, 'PENDING');
  assert.equal((await put(`/api/orders/${dineIn.data._id}/status`, { status: 'COMPLETED' }, token)).status, 403);
  assert.equal((await put(`/api/orders/${dineIn.data._id}/status`, { status: 'DELIVERING' }, cashierToken)).status, 409);
  assert.equal((await put(`/api/orders/${dineIn.data._id}/status`, { status: 'READY' }, cashierToken)).status, 403);
  assert.equal((await put(`/api/orders/${dineIn.data._id}/status`, { status: 'PREPARING', shipperId: null }, baristaToken)).status, 403);
  assert.equal((await put(`/api/orders/${dineIn.data._id}/status`, { status: 'READY' }, baristaToken)).status, 200);
  assert.equal((await put(`/api/orders/${dineIn.data._id}/status`, { status: 'COMPLETED' }, cashierToken)).status, 200);
  assert.equal((await Payment.findById(dineInPayment._id)).status, 'PENDING');
  assert.equal((await request(`/api/payments/${dineInPayment._id}/counter-confirm`, { paymentMethod: 'CASH' }, cashierToken)).status, 200);
  assert.equal((await Payment.findById(dineInPayment._id)).status, 'SUCCESS');

  const deliveryOrder = await request('/api/orders', delivery, token);
  await Order.updateOne({ _id: deliveryOrder.data._id }, { $set: { status: 'READY' } });
  const deliveryPath = `/api/orders/${deliveryOrder.data._id}/status`;
  assert.equal((await put(deliveryPath, { status: 'READY', shipperId: String(shipper._id) }, shipperToken)).status, 200);
  assert.equal((await put(deliveryPath, { status: 'DELIVERING' }, shipperToken)).status, 200);
  assert.equal((await put(deliveryPath, { status: 'READY', shipperId: null, orderNote: 'Khách hẹn giao lại' }, shipperToken)).status, 200);
  const returnedOrder = await Order.findById(deliveryOrder.data._id);
  assert.equal(returnedOrder.status, 'READY');
  assert.equal(returnedOrder.orderNote, 'Khách hẹn giao lại');
  assert.equal(returnedOrder.shipper, undefined);

  const cancelled = await request('/api/orders', { items: [item], orderType: 'DINE_IN', tableNumber: 'B02' }, cashierToken);
  const cancelledPayment = await Payment.findOne({ order: cancelled.data._id });
  await Order.updateOne({ _id: cancelled.data._id }, { $set: { status: 'CANCELLED' } });
  assert.equal((await request(`/api/payments/${cancelledPayment._id}/counter-confirm`, { paymentMethod: 'CASH' }, cashierToken)).status, 409);
  await Order.updateOne({ _id: cancelled.data._id }, { $set: { status: 'PENDING', finalAmount: 1 } });
  assert.equal((await request(`/api/payments/${cancelledPayment._id}/counter-confirm`, { paymentMethod: 'CASH' }, cashierToken)).status, 409);
});
