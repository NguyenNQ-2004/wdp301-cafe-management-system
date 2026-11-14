const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, createHmac } = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const WorkSchedule = require('../models/WorkSchedule');
const Loyalty = require('../models/LoyaltyTransaction');

test('SWP gateway callback authenticates amount and transaction, is idempotent and never pays cancelled orders', async t => {
  const dbName = `aura_gateway_test_${randomBytes(5).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aura_cafe_erp', { dbName, serverSelectionTimeoutMS: 5000 });
  await Loyalty.init();
  const keys = ['PAYMENT_GATEWAY_URL', 'PAYMENT_CALLBACK_SECRET', 'PAYMENT_BANK_ID', 'PAYMENT_ACCOUNT_NO', 'PAYMENT_ACCOUNT_NAME'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) process.env[key] = key === 'PAYMENT_GATEWAY_URL' ? 'https://gateway.invalid' : 'fixture-only';
  const app = require('../server');
  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  t.after(async () => {
    for (const key of keys) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]; }
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    assert.match(mongoose.connection.db.databaseName, /^aura_gateway_test_[a-f0-9]+$/);
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  });
  const customer = await User.create({ fullName: 'Gateway Customer', phone: '0900000331', email: 'gateway@example.com', passwordHash: 'test-only', role: 'CUSTOMER' });
  const order = await Order.create({ orderCode: 'GATEWAY-ONLY', customer: customer._id, orderType: 'ONLINE', paymentMethod: 'BANK_TRANSFER', totalAmount: 40000, deliveryFee: 18000, finalAmount: 58000 });
  const payment = await Payment.create({ order: order._id, paymentMethod: 'BANK_TRANSFER', transactionCode: 'QR-ONLY', amount: 58000 });
  const signed = (changes = {}) => {
    const body = { orderCode: order.orderCode, transactionCode: payment.transactionCode, amount: '58000', status: 'SUCCESS', ...changes };
    body.signature = createHmac('sha256', process.env.PAYMENT_CALLBACK_SECRET).update(`${body.orderCode}|${body.transactionCode}|${body.amount}|${body.status}`).digest('hex');
    return body;
  };
  const callback = async body => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/payments/callback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  assert.equal((await callback({ ...signed(), signature: '0'.repeat(64) })).status, 401);
  assert.equal((await callback(signed({ amount: '1' }))).status, 409);
  assert.equal((await callback(signed({ transactionCode: 'WRONG' }))).status, 409);
  assert.equal((await callback(signed())).status, 200);
  assert.equal((await callback(signed())).status, 200);
  assert.equal((await Payment.findById(payment._id)).status, 'SUCCESS');
  assert.equal((await Order.findById(order._id)).status, 'CONFIRMED');
  assert.equal((await User.findById(customer._id)).totalPoints, 40);
  assert.equal(await Loyalty.countDocuments({ order: order._id, transactionType: 'EARN' }), 1);
  assert.equal((await callback(signed({ status: 'FAILED' }))).status, 409);
  const cashier = await User.create({ fullName: 'Gateway Cashier', phone: '0900000332', email: 'cashier-gateway@example.com', passwordHash: 'test-only', role: 'STAFF', position: 'CASHIER' });
  await WorkSchedule.create({ user: cashier._id, workDate: new Date(), shiftName: 'TEST', status: 'PRESENT', checkInTime: new Date(Date.now() - 60000) });
  const cashierToken = require('jsonwebtoken').sign({ id: cashier._id }, require('../config/jwtSecret')());
  const counterOrder = await Order.create({ orderCode: 'COUNTER-GATEWAY', orderType: 'TAKEAWAY', paymentMethod: 'BANK_TRANSFER', totalAmount: 40000, finalAmount: 40000 });
  const counterPayment = await Payment.create({ order: counterOrder._id, paymentMethod: 'BANK_TRANSFER', transactionCode: 'QR-COUNTER', amount: 40000 });
  for (const paymentMethod of ['BANK_TRANSFER', 'CASH', 'MOMO', 'VNPAY']) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/payments/${counterPayment._id}/counter-confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` }, body: JSON.stringify({ paymentMethod, transactionCode: 'FAKE-REFERENCE' }) });
    assert.equal(response.status, 409);
  }
  assert.equal((await Payment.findById(counterPayment._id)).status, 'PENDING');
  assert.equal((await callback(signed({ orderCode: counterOrder.orderCode, transactionCode: counterPayment.transactionCode, amount: '40000' }))).status, 200);
  assert.equal((await Payment.findById(counterPayment._id)).status, 'SUCCESS');
  assert.equal((await Order.findById(counterOrder._id)).status, 'CONFIRMED');
  const cancelled = await Order.create({ orderCode: 'CANCELLED-GATEWAY', customer: customer._id, orderType: 'ONLINE', paymentMethod: 'BANK_TRANSFER', totalAmount: 40000, finalAmount: 40000, status: 'CANCELLED' });
  await Payment.create({ order: cancelled._id, paymentMethod: 'BANK_TRANSFER', transactionCode: 'QR-CANCELLED', amount: 40000 });
  assert.equal((await callback(signed({ orderCode: cancelled.orderCode, transactionCode: 'QR-CANCELLED', amount: '40000' }))).status, 409);
  const switched = await Order.create({ orderCode: 'SWITCH-COD', customer: customer._id, orderType: 'ONLINE', paymentMethod: 'BANK_TRANSFER', totalAmount: 40000, finalAmount: 40000 });
  await Payment.create({ order: switched._id, paymentMethod: 'BANK_TRANSFER', transactionCode: 'QR-SWITCH', amount: 40000 });
  const token = require('jsonwebtoken').sign({ id: customer._id }, require('../config/jwtSecret')());
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/payments/order/${switched._id}/cod`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  assert.equal((await Order.findById(switched._id)).paymentMethod, 'COD');
  assert.equal((await Payment.findOne({ order: switched._id })).paymentMethod, 'CASH');
  assert.equal((await callback(signed({ orderCode: switched.orderCode, transactionCode: 'QR-SWITCH', amount: '40000' }))).status, 404);
  assert.equal((await User.findById(customer._id)).totalPoints, 40, 'COD is not credited before collection');
});
