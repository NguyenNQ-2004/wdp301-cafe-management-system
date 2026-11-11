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
const WorkSchedule = require('../models/WorkSchedule');

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
  app.use('/api/shift-handovers', require('../routes/shiftHandoverRoutes'));
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
    district: 'Hoàn Kiếm',
    items: [item], orderType: 'ONLINE', recipientName: '  Người nhận  ',
    recipientPhone: ' 090 123 4567 ', deliveryAddress: '  28 Tràng Tiền, Hà Nội  ',
    paymentMethod: 'MOMO', expectedTotal: 68000
  };

  assert.equal((await request('/api/orders', delivery)).status, 401);
  await require('../models/DeliveryArea').create({ district: 'Hoàn Kiếm', deliveryFee: 18000 });
  assert.equal((await request('/api/orders', { ...delivery, deliveryAddress: '   ' }, token)).status, 400);
  assert.equal((await request('/api/orders', { ...delivery, recipientPhone: 'abc' }, token)).status, 400);
  assert.equal((await request('/api/orders', { ...delivery, expectedTotal: 1 }, token)).status, 409);
  assert.equal(await Order.countDocuments(), 0);
  const unavailable = await request('/api/orders', delivery, token);
  assert.equal(unavailable.status, 409);
  assert.match(unavailable.data.message, /shipper đã check-in/);
  assert.equal(await Order.countDocuments(), 0);
  const availableShipper = await User.create({ fullName: 'Available Shipper', phone: '0999000017', email: 'test-0999000017@example.com', passwordHash: 'test-only', role: 'STAFF', position: 'SHIPPER' });
  await require('../models/ShopSetting').create({ settingKey: 'shift_morning', settingValue: '00:00-23:59' });
  const availableShift = await WorkSchedule.create({ user: availableShipper._id, workDate: new Date(), shiftName: 'MORNING', status: 'SCHEDULED' });
  assert.equal((await request('/api/orders', delivery, token)).status, 409, 'scheduled shipper has not checked in');
  await WorkSchedule.updateOne({ _id: availableShift._id }, { $set: { status: 'PRESENT', checkInTime: new Date(Date.now() - 60000) } });

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
  assert.equal((await put(`/api/orders/${demoOrder.data._id}/status`, { status: 'CANCELLED', cancelReason: 'Paid online' }, token)).status, 409);

  const cashier = await User.create({ fullName: 'UC13 Cashier', phone: '0999000013', email: 'test-0999000013@example.com', passwordHash: await bcrypt.hash('test-password', 4), role: 'STAFF', position: 'CASHIER' });
  const barista = await User.create({ fullName: 'UC13 Barista', phone: '0999000014', email: 'test-0999000014@example.com', passwordHash: await bcrypt.hash('test-password', 4), role: 'STAFF', position: 'BARISTA' });
  await WorkSchedule.create([cashier, barista].map((user, index) => ({ user: user._id, workDate: new Date(), shiftName: `TEST-${index}`, status: 'PRESENT', checkInTime: new Date(Date.now() - 60000) })));
  const admin = await User.create({ fullName: 'UC13 Admin', phone: '0999000016', email: 'test-0999000016@example.com', passwordHash: await bcrypt.hash('test-password', 4), role: 'ADMIN' });
  const cashierToken = (await request('/api/auth/login', { email: cashier.email, password: 'test-password' })).data.token;
  const adminToken = (await request('/api/auth/login', { email: admin.email, password: 'test-password' })).data.token;
  const baristaToken = (await request('/api/auth/login', { email: barista.email, password: 'test-password' })).data.token;
  await t.test('customizations, server topping prices and step-based points round trip and refund', async () => {
    await Product.updateOne({ _id: product._id }, { $set: { variantsConfig: { sizes: { M: 0 }, toppings: [{ name: 'Trân châu', price: 5000 }] } } });
    const customized = { ...item, customization: { sugar: '50%', ice: 'Ít đá', note: 'Đóng riêng', topping: ['Trân châu'] } };
    assert.equal((await request('/api/orders', { ...delivery, items: [{ ...customized, customization: { topping: ['Unknown'] } }], expectedTotal: 73000 }, token)).status, 400);
    const balance = (await User.findById(customer._id)).totalPoints;
    const result = await request('/api/orders', { ...delivery, items: [customized], pointsToRedeem: 29, expectedTotal: 69000 }, token);
    assert.equal(result.status, 201, JSON.stringify(result.data));
    assert.equal(result.data.items[0].unitPrice, 55000);
    assert.deepEqual(result.data.items[0].customization.topping, ['Trân châu']);
    assert.equal(result.data.items[0].customization.sugar, '50%');
    assert.equal(result.data.pointsRedeemed, 20);
    assert.equal((await User.findById(customer._id)).totalPoints, balance - 20);
    assert.equal((await put(`/api/orders/${result.data._id}/status`, { status: 'CANCELLED', cancelReason: 'Đổi món' }, token)).status, 200);
    assert.equal((await User.findById(customer._id)).totalPoints, balance);
    const pos = await request('/api/orders', { items: [customized], orderType: 'DINE_IN', customerId: String(customer._id), pointsToRedeem: 10 }, cashierToken);
    assert.equal(pos.status, 201);
    assert.equal(pos.data.finalAmount, 53000);
    const payment = await Payment.findOne({ order: pos.data._id });
    assert.equal((await request(`/api/payments/${payment._id}/counter-confirm`, { paymentMethod: 'CASH' }, cashierToken)).status, 200);
    assert.equal((await User.findById(customer._id)).totalPoints, balance - 10 + 53);
    const kitchen = await get('/api/orders', baristaToken);
    assert.equal(kitchen.data.find(order => order._id === pos.data._id)?.kitchenEligible, true);
    assert.equal(kitchen.data.some(order => order._id === pickup.data._id), false);
    assert.equal((await put(`/api/orders/${pos.data._id}/status`, { status: 'CANCELLED', cancelReason: 'Hủy tại quầy' }, cashierToken)).status, 409);
    assert.equal((await request(`/api/payments/order/${pos.data._id}/refund-and-cancel`, { amount: pos.data.finalAmount, refundMethod: 'CASH', cancelReason: 'Đã hoàn tiền mặt' }, cashierToken)).status, 403);
    const refundPath = `/api/payments/order/${pos.data._id}/refund-and-cancel`;
    assert.equal((await request(refundPath, { amount: 1, refundMethod: 'CASH', cancelReason: 'Sai số tiền' }, adminToken)).status, 409);
    assert.equal((await Payment.findById(payment._id)).status, 'SUCCESS');
    assert.equal((await request(refundPath, { amount: pos.data.finalAmount, refundMethod: 'CASH', cancelReason: 'Đã hoàn tiền mặt' }, adminToken)).status, 200);
    assert.equal((await Payment.findById(payment._id)).status, 'REFUNDED');
    assert.equal((await Order.findById(pos.data._id)).status, 'CANCELLED');
    assert.equal((await User.findById(customer._id)).totalPoints, balance);
    assert.equal((await request(refundPath, { amount: pos.data.finalAmount, refundMethod: 'CASH', cancelReason: 'Lặp lại' }, adminToken)).status, 409);
  });
  const shipper = await User.create({ fullName: 'UC14 Shipper', phone: '0999000015', email: 'test-0999000015@example.com', passwordHash: await bcrypt.hash('test-password', 4), role: 'STAFF', position: 'SHIPPER' });
  await WorkSchedule.create({ user: shipper._id, workDate: new Date(), shiftName: 'MORNING', status: 'PRESENT', checkInTime: new Date(Date.now() - 60000) });
  const shipperToken = (await request('/api/auth/login', { email: shipper.email, password: 'test-password' })).data.token;
  assert.equal((await get('/api/payments', token)).status, 403);
  assert.equal((await get('/api/payments', baristaToken)).status, 403);
  assert.equal((await get('/api/payments', cashierToken)).status, 200);
  const pickupPayment = await Payment.findOne({ order: pickup.data._id });
  assert.equal(pickupPayment.status, 'PENDING');
  const pickupPath = `/api/payments/${pickupPayment._id}/counter-confirm`;
  assert.equal((await request(pickupPath, { paymentMethod: 'CASH' }, token)).status, 403);
  assert.equal((await request(pickupPath, { paymentMethod: 'CASH' }, baristaToken)).status, 403);
  assert.equal((await request(pickupPath, { paymentMethod: 'BANK_TRANSFER' }, cashierToken)).status, 409);
  assert.equal((await request(`/api/payments/${demoPayment._id}/counter-confirm`, { paymentMethod: 'CASH' }, cashierToken)).status, 400);
  assert.equal((await request(pickupPath, { paymentMethod: 'CASH', receivedAmount: pickupPayment.amount - 1 }, cashierToken)).status, 400);
  const paidPickup = await request(pickupPath, { paymentMethod: 'CASH', receivedAmount: pickupPayment.amount + 10000 }, cashierToken);
  assert.equal(paidPickup.status, 200);
  assert.equal(paidPickup.data.payment.status, 'SUCCESS');
  assert.equal(paidPickup.data.payment.paymentMethod, 'CASH');
  assert.equal(paidPickup.data.payment.receivedAmount, pickupPayment.amount + 10000);
  assert.equal(paidPickup.data.payment.changeAmount, 10000);
  assert.equal((await request(pickupPath, { paymentMethod: 'CASH' }, cashierToken)).status, 200);
  assert.equal((await Order.findById(pickup.data._id)).paymentMethod, 'CASH');

  const qrOrder = await request('/api/orders', { items: [item], orderType: 'DINE_IN', tableNumber: 'A01', paymentMethod: 'BANK_TRANSFER' }, cashierToken);
  assert.equal(qrOrder.status, 201);
  const qrPayment = await Payment.findOne({ order: qrOrder.data._id });
  assert.equal(qrPayment.paymentMethod, 'BANK_TRANSFER');
  assert.equal(qrPayment.status, 'PENDING');
  assert.equal((await request(`/api/payments/${qrPayment._id}/counter-demo-confirm`, {}, token)).status, 403);
  assert.equal((await request(`/api/payments/${qrPayment._id}/counter-demo-confirm`, {}, cashierToken)).status, 200);
  assert.equal((await request(`/api/payments/${qrPayment._id}/counter-demo-confirm`, {}, cashierToken)).status, 200, 'repeat confirmation is idempotent');
  const settledQr = await Payment.findById(qrPayment._id);
  assert.equal(settledQr.status, 'SUCCESS');
  assert.equal(String(settledQr.receivedBy), String(cashier._id));
  assert.equal(settledQr.receivedAmount, undefined);
  assert.equal((await Order.findById(qrOrder.data._id)).status, 'CONFIRMED');
  const cashierSchedule = await WorkSchedule.findOne({ user: cashier._id, status: 'PRESENT' });
  const ledger = await get(`/api/shift-handovers/${cashierSchedule._id}`, cashierToken);
  assert.equal(ledger.status, 200);
  assert.equal(ledger.data.summary.methods.BANK_TRANSFER.sales, qrPayment.amount);
  assert.ok(ledger.data.summary.nonCashSales >= qrPayment.amount);

  for (const method of ['MOMO', 'VNPAY']) {
    const counterOrder = await request('/api/orders', {
      items: [item], orderType: 'TAKEAWAY', recipientName: 'Khách thử',
      recipientPhone: '0901234567', expectedTotal: 50000
    }, token);
    assert.equal(counterOrder.status, 201);
    const counterPayment = await Payment.findOne({ order: counterOrder.data._id });
    const path = `/api/payments/${counterPayment._id}/counter-confirm`;
    assert.equal((await request(path, { paymentMethod: method }, cashierToken)).status, 409);
    assert.equal((await request(path, { paymentMethod: method, transactionCode: `${method}-TEST-001` }, cashierToken)).status, 409);
    assert.equal((await Payment.findById(counterPayment._id)).status, 'PENDING');
  }

  const dineIn = await request('/api/orders', { items: [item], orderType: 'DINE_IN', tableNumber: 'B01', paymentMethod: 'CASH' }, cashierToken);
  assert.equal(dineIn.status, 201);
  const dineInPayment = await Payment.findOne({ order: dineIn.data._id });
  assert.equal(dineInPayment.status, 'PENDING');
  assert.equal((await put(`/api/orders/${dineIn.data._id}/status`, { status: 'COMPLETED' }, token)).status, 403);
  assert.equal((await put(`/api/orders/${dineIn.data._id}/status`, { status: 'DELIVERING' }, cashierToken)).status, 409);
  assert.equal((await put(`/api/orders/${dineIn.data._id}/status`, { status: 'PREPARING' }, baristaToken)).status, 409);
  assert.equal((await request(`/api/payments/${dineInPayment._id}/counter-confirm`, { paymentMethod: 'CASH' }, cashierToken)).status, 200);
  assert.equal((await put(`/api/orders/${dineIn.data._id}/status`, { status: 'PREPARING', shipperId: null }, baristaToken)).status, 403);
  assert.equal((await put(`/api/orders/${dineIn.data._id}/status`, { status: 'PREPARING' }, baristaToken)).status, 200);
  assert.equal((await put(`/api/orders/${dineIn.data._id}/status`, { status: 'READY' }, cashierToken)).status, 403);
  assert.equal((await put(`/api/orders/${dineIn.data._id}/items/0/prepared`, { isPrepared: true, autoReady: false }, baristaToken)).status, 200);
  assert.equal((await put(`/api/orders/${dineIn.data._id}/status`, { status: 'READY' }, baristaToken)).status, 200);
  assert.equal((await put(`/api/orders/${dineIn.data._id}/status`, { status: 'COMPLETED' }, cashierToken)).status, 200);
  assert.equal((await Payment.findById(dineInPayment._id)).status, 'SUCCESS');
  assert.equal((await request(`/api/payments/${dineInPayment._id}/counter-confirm`, { paymentMethod: 'CASH' }, cashierToken)).status, 200);
  assert.equal((await Payment.findById(dineInPayment._id)).status, 'SUCCESS');

  const deliveryOrder = await request('/api/orders', delivery, token);
  await Order.updateOne({ _id: deliveryOrder.data._id }, { $set: { status: 'READY' } });
  const deliveryPath = `/api/orders/${deliveryOrder.data._id}/status`;
  assert.equal((await put(deliveryPath, { status: 'DELIVERING' }, adminToken)).status, 409);
  assert.equal((await Order.findById(deliveryOrder.data._id)).status, 'READY');
  assert.equal((await put(deliveryPath, { status: 'READY', shipperId: String(shipper._id) }, shipperToken)).status, 200);
  await WorkSchedule.updateOne({ user: shipper._id }, { $set: { status: 'COMPLETED', checkOutTime: new Date() } });
  assert.equal((await put(deliveryPath, { status: 'DELIVERING' }, adminToken)).status, 409, 'assigned shipper has checked out');
  await WorkSchedule.updateOne({ user: shipper._id }, { $set: { status: 'PRESENT' }, $unset: { checkOutTime: 1 } });
  assert.equal((await put(deliveryPath, { status: 'DELIVERING' }, shipperToken)).status, 200);
  assert.equal((await put(deliveryPath, { status: 'READY', shipperId: null, orderNote: 'Khách hẹn giao lại' }, shipperToken)).status, 200);
  const returnedOrder = await Order.findById(deliveryOrder.data._id);
  assert.equal(returnedOrder.status, 'READY');
  assert.equal(returnedOrder.orderNote, 'Khách hẹn giao lại');
  assert.equal(returnedOrder.shipper, undefined);
  assert.equal((await put(deliveryPath, { status: 'READY', shipperId: String(shipper._id) }, shipperToken)).status, 200);
  assert.equal((await put(deliveryPath, { status: 'DELIVERING' }, shipperToken)).status, 200);
  assert.equal((await put(deliveryPath, { status: 'COMPLETED', collectedAmount: 1 }, shipperToken)).status, 409);
  assert.equal((await put(deliveryPath, { status: 'COMPLETED', collectedAmount: deliveryOrder.data.finalAmount }, shipperToken)).status, 200);
  assert.equal((await Payment.findOne({ order: deliveryOrder.data._id })).status, 'SUCCESS');
  const ownPayments = await get('/api/payments', shipperToken);
  assert.equal(ownPayments.status, 200);
  assert.ok(ownPayments.data.every(payment => payment.order._id === deliveryOrder.data._id));

  const cancelled = await request('/api/orders', { items: [item], orderType: 'DINE_IN', tableNumber: 'B02' }, cashierToken);
  const cancelledPayment = await Payment.findOne({ order: cancelled.data._id });
  await Order.updateOne({ _id: cancelled.data._id }, { $set: { status: 'CANCELLED' } });
  assert.equal((await request(`/api/payments/${cancelledPayment._id}/counter-confirm`, { paymentMethod: 'CASH' }, cashierToken)).status, 409);
  await Order.updateOne({ _id: cancelled.data._id }, { $set: { status: 'PENDING', finalAmount: 1 } });
  assert.equal((await request(`/api/payments/${cancelledPayment._id}/counter-confirm`, { paymentMethod: 'CASH' }, cashierToken)).status, 409);
  const { hasShipperOnShift } = require('../utils/shipperAvailability');
  const vnDate = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  await WorkSchedule.updateOne({ _id: availableShift._id }, { $set: { workDate: new Date(`${vnDate}T00:00:00Z`), status: 'PRESENT', checkInTime: new Date(`${vnDate}T01:00:00Z`) } });
  await require('../models/ShopSetting').updateOne({ settingKey: 'shift_morning' }, { $set: { settingValue: '07:00-12:00' } });
  assert.equal(await hasShipperOnShift(availableShipper._id, new Date(`${vnDate}T04:00:00Z`)), true, 'shipper is available at 11:00 VN');
  assert.equal(await hasShipperOnShift(availableShipper._id, new Date(`${vnDate}T06:00:00Z`)), false, 'forgotten checkout does not extend the 12:00 shift');
});
