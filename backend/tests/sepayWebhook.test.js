const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const getJwtSecret = require('../config/jwtSecret');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const WorkSchedule = require('../models/WorkSchedule');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

test('SePay credits a matching transfer once and rejects forged or mismatched transfers', async t => {
  const dbName = `aura_sepay_test_${randomBytes(5).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI, { dbName, serverSelectionTimeoutMS: 5000 });
  const keys = ['SEPAY_WEBHOOK_API_KEY', 'PAYMENT_BANK_ID', 'PAYMENT_ACCOUNT_NO', 'PAYMENT_ACCOUNT_NAME'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, { SEPAY_WEBHOOK_API_KEY: 'sepay-test-key', PAYMENT_BANK_ID: 'BIDV', PAYMENT_ACCOUNT_NO: '0000000000', PAYMENT_ACCOUNT_NAME: 'Test Cafe' });
  const app = require('../server');
  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  t.after(async () => {
    for (const key of keys) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]; }
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    assert.match(mongoose.connection.db.databaseName, /^aura_sepay_test_[a-f0-9]+$/);
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  });
  const customer = await User.create({ fullName: 'SePay Customer', phone: '0900000871', email: 'sepay@example.com', passwordHash: 'test-only', role: 'CUSTOMER' });
  const order = await Order.create({ orderCode: 'SEPAY-TEST', customer: customer._id, orderType: 'ONLINE', paymentMethod: 'BANK_TRANSFER', totalAmount: 40000, deliveryFee: 18000, finalAmount: 58000 });
  const payment = await Payment.create({ order: order._id, paymentMethod: 'BANK_TRANSFER', amount: 58000, transactionCode: 'QR-TEST' });
  const code = `AU${String(payment._id).toUpperCase()}`;
  const payload = { id: 1234567, gateway: 'BIDV', transactionDate: '2026-11-14 12:00:00', accountNumber: '0000000000', code, content: `${code} thanh toan`, transferType: 'in', transferAmount: 58000 };
  const send = async (body, key = 'sepay-test-key') => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/payments/sepay-webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Apikey ${key}` }, body: JSON.stringify(body) });
    return response.status;
  };
  assert.equal(await send(payload, 'wrong'), 401);
  assert.equal(await send({ ...payload, transferAmount: 1 }), 409);
  assert.equal(await send({ ...payload, accountNumber: 'wrong' }), 400);
  assert.equal(await send({ ...payload, content: 'unrelated transfer' }), 400);
  assert.equal((await Payment.findById(payment._id)).status, 'PENDING');
  const vaPayload = { ...payload, accountNumber: 'main-bank-account', subAccount: '0000000000' };
  assert.equal(await send(vaPayload), 200);
  assert.equal(await send(vaPayload), 200);
  assert.equal((await Payment.findById(payment._id)).status, 'SUCCESS');
  assert.equal((await Payment.findById(payment._id)).sepayTransactionId, '1234567');
  assert.equal((await Order.findById(order._id)).status, 'CONFIRMED');
  assert.equal((await User.findById(customer._id)).totalPoints, 40);
  assert.equal(await send({ ...vaPayload, id: 1234568 }), 409);

  const cashier = await User.create({ fullName: 'SePay Cashier', phone: '0900000872', passwordHash: 'test-only', role: 'STAFF', position: 'CASHIER' });
  await WorkSchedule.create({ user: cashier._id, workDate: new Date(), shiftName: 'TEST', status: 'PRESENT', checkInTime: new Date(Date.now() - 60000) });
  const cashierToken = jwt.sign({ id: cashier._id }, getJwtSecret());
  const category = await Category.create({ name: 'SePay counter test' });
  const product = await Product.create({ name: 'Counter coffee', category: category._id, basePrice: 45000, isAvailable: true });
  const counterResponse = await fetch(`http://127.0.0.1:${server.address().port}/api/orders`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({ orderType: 'DINE_IN', tableNumber: 'T01', paymentMethod: 'BANK_TRANSFER', items: [{ productId: String(product._id), quantity: 1, size: 'M' }] })
  });
  assert.equal(counterResponse.status, 201, await counterResponse.text().catch(() => ''));
  const counterOrder = await Order.findOne({ cashier: cashier._id });
  const counterPayment = await Payment.findOne({ order: counterOrder._id });
  assert.equal(counterOrder.status, 'PENDING');
  assert.equal(counterOrder.paymentMethod, 'BANK_TRANSFER');
  assert.equal(counterPayment.paymentMethod, 'BANK_TRANSFER');
  assert.equal(counterPayment.status, 'PENDING');
  const gatewayResponse = await fetch(`http://127.0.0.1:${server.address().port}/api/payments/order/${counterOrder._id}/gateway`, {
    method: 'POST', headers: { Authorization: `Bearer ${cashierToken}` }
  });
  assert.equal(gatewayResponse.status, 200);
  const gateway = await gatewayResponse.json();
  const counterCode = `AU${String(counterPayment._id).toUpperCase()}`;
  assert.equal(gateway.paymentCode, counterCode);
  assert.equal(new URL(gateway.qrUrl).searchParams.get('des'), counterCode);
  const manualConfirm = await fetch(`http://127.0.0.1:${server.address().port}/api/payments/${counterPayment._id}/counter-confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({ paymentMethod: 'CASH', receivedAmount: counterOrder.finalAmount })
  });
  assert.equal(manualConfirm.status, 409);
  const counterPayload = { ...payload, id: 1234569, code: counterCode, content: `${counterCode} thanh toan`, transferAmount: counterOrder.finalAmount };
  assert.equal(await send({ ...counterPayload, transferAmount: 1 }), 409);
  assert.equal(await send(counterPayload), 200);
  assert.equal(await send(counterPayload), 200);
  assert.equal((await Payment.findById(counterPayment._id)).status, 'SUCCESS');
  assert.equal((await Order.findById(counterOrder._id)).status, 'CONFIRMED');

  await t.test('concurrent duplicate webhook deliveries award points once', async () => {
    const concurrentOrder = await Order.create({ orderCode: 'SEPAY-CONCURRENT', customer: customer._id, orderType: 'ONLINE', paymentMethod: 'BANK_TRANSFER', totalAmount: 10000, finalAmount: 10000 });
    const concurrentPayment = await Payment.create({ order: concurrentOrder._id, paymentMethod: 'BANK_TRANSFER', amount: 10000 });
    const concurrentCode = `AU${String(concurrentPayment._id).toUpperCase()}`;
    const body = { ...payload, id: 1234570, code: concurrentCode, content: concurrentCode, transferAmount: 10000 };
    const outcomes = await Promise.all([send(body), send(body)]);
    assert.ok(outcomes.includes(200), JSON.stringify(outcomes));
    assert.ok(outcomes.every(status => [200, 409].includes(status)), JSON.stringify(outcomes));
    assert.equal(await send(body), 200, 'A retry must acknowledge the committed transfer');
    assert.equal((await User.findById(customer._id)).totalPoints, 50);
    assert.equal(await require('../models/LoyaltyTransaction').countDocuments({ order: concurrentOrder._id, transactionType: 'EARN' }), 1);
  });

  await t.test('a failed loyalty write rolls back payment and order; retry completes once', async () => {
    const failedOrder = await Order.create({ orderCode: 'SEPAY-ROLLBACK', customer: customer._id, orderType: 'ONLINE', paymentMethod: 'BANK_TRANSFER', totalAmount: 10000, finalAmount: 10000 });
    const failedPayment = await Payment.create({ order: failedOrder._id, paymentMethod: 'BANK_TRANSFER', amount: 10000 });
    const failedCode = `AU${String(failedPayment._id).toUpperCase()}`;
    const body = { ...payload, id: 1234571, code: failedCode, content: failedCode, transferAmount: 10000 };
    const originalUpdate = User.findOneAndUpdate;
    User.findOneAndUpdate = function (filter, update, ...args) {
      if (String(filter._id) === String(customer._id) && update.$inc?.totalPoints) throw new Error('Injected loyalty write failure');
      return originalUpdate.call(this, filter, update, ...args);
    };
    try { assert.equal(await send(body), 500); }
    finally { User.findOneAndUpdate = originalUpdate; }
    assert.equal((await Payment.findById(failedPayment._id)).status, 'PENDING');
    assert.equal((await Order.findById(failedOrder._id)).status, 'PENDING');
    assert.equal((await User.findById(customer._id)).totalPoints, 50);
    assert.equal(await require('../models/LoyaltyTransaction').countDocuments({ order: failedOrder._id }), 0);
    assert.equal(await send(body), 200);
    assert.equal((await User.findById(customer._id)).totalPoints, 60);
  });
});
