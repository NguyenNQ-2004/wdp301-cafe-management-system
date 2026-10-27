const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ quiet: true });
process.env.JWT_SECRET = 'counter-cancel-test';
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

test('Counter cancellation persists reason and closes only unpaid orders', async t => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', { dbName: `cafe_counter_cancel_test_${randomBytes(6).toString('hex')}`, serverSelectionTimeoutMS: 5000 });
  const app = express(); app.use(express.json()); app.use('/api/orders', require('../routes/orderRoutes')); app.use('/api/payments', require('../routes/paymentRoutes'));
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  t.after(async () => {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    assert.match(mongoose.connection.db.databaseName, /^cafe_counter_cancel_test_[a-f0-9]{12}$/);
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  });
  const users = await User.create([
    { fullName: 'Cashier', phone: '0999777001', passwordHash: 'unused', role: 'STAFF', position: 'CASHIER' },
    { fullName: 'Barista', phone: '0999777002', passwordHash: 'unused', role: 'STAFF', position: 'BARISTA' },
    { fullName: 'Customer', phone: '0999777003', passwordHash: 'unused', role: 'CUSTOMER' },
  ]);
  const tokens = users.map(user => jwt.sign({ id: user._id }, process.env.JWT_SECRET));
  let sequence = 0;
  const fixture = async (patch = {}, paymentPatch = {}) => {
    const order = await Order.create({ orderCode: `CANCEL-${++sequence}`, orderType: 'DINE_IN', status: 'PREPARING', cashier: users[0]._id, totalAmount: 30000, finalAmount: 30000, ...patch });
    const payment = await Payment.create({ order: order._id, paymentMethod: 'CASH', amount: 30000, status: 'PENDING', ...paymentPatch });
    return { order, payment };
  };
  const request = async (path, body, token = tokens[0], method = 'PUT') => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  const { order, payment } = await fixture();
  const path = `/api/orders/${order._id}/counter-cancel`;
  const reason = { cancelReason: '  Customer changed plans  ' };
  await t.test('Authorization and reason validation', async () => {
    assert.equal((await request(path, reason, null)).status, 401);
    assert.equal((await request(path, reason, tokens[1])).status, 403);
    assert.equal((await request(path, reason, tokens[2])).status, 403);
    for (const body of [{}, { cancelReason: ' ' }, { cancelReason: 'a'.repeat(501) }, { ...reason, status: 'COMPLETED' }]) assert.equal((await request(path, body)).status, 400);
    assert.equal((await Order.findById(order._id)).status, 'PREPARING');
  });
  await t.test('Cancellation updates the order and pending payment; retry is idempotent', async () => {
    assert.equal((await request(path, reason)).status, 200);
    const saved = await Order.findById(order._id); assert.equal(saved.status, 'CANCELLED'); assert.equal(saved.cancelReason, reason.cancelReason.trim());
    assert.equal((await Payment.findById(payment._id)).status, 'FAILED');
    assert.equal((await request(path, reason)).status, 200);
    assert.equal((await request(path, { cancelReason: 'Different reason' })).status, 409);
    assert.equal((await request(`/api/payments/${payment._id}/counter-confirm`, { paymentMethod: 'CASH' }, tokens[0], 'POST')).status, 409);
  });
  await t.test('Paid orders cannot bypass protection through either endpoint', async () => {
    const { order: paid } = await fixture({}, { status: 'SUCCESS' });
    assert.equal((await request(`/api/orders/${paid._id}/counter-cancel`, reason)).status, 409);
    assert.equal((await request(`/api/orders/${paid._id}/status`, { status: 'CANCELLED', ...reason })).status, 409);
    assert.equal((await Order.findById(paid._id)).status, 'PREPARING');
    const { order: legacy, payment: legacyPayment } = await fixture();
    assert.equal((await request(`/api/orders/${legacy._id}/status`, { status: 'CANCELLED', ...reason })).status, 200);
    assert.equal((await Payment.findById(legacyPayment._id)).status, 'FAILED');
  });
  await t.test('Online, completed and reward orders require their own handling', async () => {
    for (const patch of [{ orderType: 'ONLINE' }, { status: 'COMPLETED' }, { pointsRedeemed: 50 }]) {
      const { order: blocked } = await fixture(patch);
      assert.equal((await request(`/api/orders/${blocked._id}/counter-cancel`, reason)).status, 409);
    }
  });
  await t.test('Order-write failure restores the pending payment', async () => {
    const { order: pending, payment: pendingPayment } = await fixture();
    const originalSave = Order.prototype.save;
    Order.prototype.save = async function (...args) { if (String(this._id) === String(pending._id)) throw new Error('Simulated order failure'); return originalSave.apply(this, args); };
    try { assert.equal((await request(`/api/orders/${pending._id}/counter-cancel`, reason)).status, 500); }
    finally { Order.prototype.save = originalSave; }
    assert.equal((await Order.findById(pending._id)).status, 'PREPARING');
    assert.equal((await Payment.findById(pendingPayment._id)).status, 'PENDING');
    assert.equal(await Order.countDocuments({ mutationLock: { $exists: true } }), 0);
  });
});
