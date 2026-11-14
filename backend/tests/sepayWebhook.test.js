const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
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
});
