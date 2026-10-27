const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ quiet: true });
process.env.JWT_SECRET = 'counter-update-isolated-test';
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');

test('Counter order editing persists totals and rejects unsafe or stale mutations', async (t) => {
  const dbName = `cafe_counter_update_test_${randomBytes(6).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', { dbName, serverSelectionTimeoutMS: 5000 });
  const app = express(); app.use(express.json());
  app.use('/api/orders', require('../routes/orderRoutes'));
  app.use('/api/payments', require('../routes/paymentRoutes'));
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  t.after(async () => {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    assert.match(mongoose.connection.db.databaseName, /^cafe_counter_update_test_[a-f0-9]{12}$/);
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  });
  const tokenFor = async (role, position, phone) => {
    const user = await User.create({ fullName: role, role, position, phone, passwordHash: 'unused-test-hash' });
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  };
  const cashier = await tokenFor('STAFF', 'CASHIER', '0999111001');
  const barista = await tokenFor('STAFF', 'BARISTA', '0999111002');
  const customer = await tokenFor('CUSTOMER', undefined, '0999111003');
  const category = await Category.create({ name: 'Test category' });
  const coffee = await Product.create({ name: 'Coffee', category: category._id, basePrice: 30000, variantsConfig: { sizes: { M: 0, L: 10000 } }, isAvailable: true });
  const tea = await Product.create({ name: 'Tea', category: category._id, basePrice: 20000, isAvailable: true });
  const request = async (method, path, body, token = cashier) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const create = async () => {
    const result = await request('POST', '/api/orders', { orderType: 'DINE_IN', tableNumber: 'T01', items: [{ productId: String(coffee._id), size: 'M', quantity: 1 }] });
    assert.equal(result.status, 201); return result.body;
  };
  const order = await create();
  const path = `/api/orders/${order._id}/counter`;
  const update = { expectedUpdatedAt: order.updatedAt, tableNumber: 'T02', orderNote: 'No ice', items: [
    { productId: String(coffee._id), size: 'L', quantity: 2 }, { productId: String(tea._id), size: 'M', quantity: 1 },
  ] };
  await t.test('Only cashiers and managers can edit', async () => {
    assert.equal((await request('PUT', path, update, null)).status, 401);
    assert.equal((await request('PUT', path, update, customer)).status, 403);
    assert.equal((await request('PUT', path, update, barista)).status, 403);
    assert.equal((await request('PUT', '/api/orders/invalid/counter', update)).status, 400);
  });
  await t.test('Invalid lines, empty tables and forged totals leave the order unchanged', async () => {
    for (const patch of [{ items: [] }, { tableNumber: ' ' }, { finalAmount: 1 }, { items: [{ productId: String(coffee._id), quantity: 0 }] }, { items: [{ ...update.items[0], customization: { sugar: 'invalid' } }] }]) {
      assert.equal((await request('PUT', path, { ...update, ...patch })).status, 400);
    }
    assert.equal((await Order.findById(order._id)).finalAmount, 30000);
  });
  await t.test('Editing synchronizes order, item snapshots and pending payment', async () => {
    const result = await request('PUT', path, update); assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.order.finalAmount, 100000); assert.equal(result.body.order.tableNumber, 'T02');
    assert.equal(result.body.order.orderNote, 'No ice');
    const lines = await OrderItem.find({ order: order._id }); assert.equal(lines.length, 2);
    assert.equal(lines.reduce((sum, item) => sum + item.subtotal, 0), 100000);
    assert.equal((await Payment.findOne({ order: order._id })).amount, 100000);
    assert.equal((await request('PUT', path, update)).status, 409);
  });
  await t.test('Database lock blocks overlapping edits, preparation and payment', async () => {
    await Order.updateOne({ _id: order._id }, { $set: { mutationLock: 'another-process' } }, { timestamps: false });
    const payment = await Payment.findOne({ order: order._id });
    assert.equal((await request('PUT', path, update)).status, 409);
    assert.equal((await request('PUT', `/api/orders/${order._id}/items/0/prepared`, { isPrepared: true }, barista)).status, 409);
    assert.equal((await request('POST', `/api/payments/${payment._id}/counter-confirm`, { paymentMethod: 'CASH' })).status, 409);
    await Order.updateOne({ _id: order._id }, { $unset: { mutationLock: 1 } }, { timestamps: false });
  });
  await t.test('Item-write failure restores the original order and payment', async () => {
    const before = await Order.findById(order._id);
    const originalInsert = OrderItem.insertMany;
    let once = true;
    OrderItem.insertMany = async function (...args) { if (once) { once = false; throw new Error('Simulated write failure'); } return originalInsert.apply(this, args); };
    try {
      assert.equal((await request('PUT', path, { ...update, expectedUpdatedAt: before.updatedAt.toISOString(), items: [update.items[1]], tableNumber: 'T03' })).status, 500);
    } finally { OrderItem.insertMany = originalInsert; }
    const after = await Order.findById(order._id);
    assert.equal(after.finalAmount, before.finalAmount); assert.equal(after.tableNumber, before.tableNumber);
    assert.equal(after.updatedAt.toISOString(), before.updatedAt.toISOString());
    assert.equal(await OrderItem.countDocuments({ order: order._id }), 2);
    assert.equal((await Payment.findOne({ order: order._id })).amount, 100000);
  });
  await t.test('Prepared, paid and closed orders cannot be edited', async () => {
    const before = await Order.findById(order._id);
    const payload = { ...update, expectedUpdatedAt: before.updatedAt.toISOString() };
    await Order.updateOne({ _id: order._id }, { $set: { 'items.0.isPrepared': true } }, { timestamps: false });
    assert.equal((await request('PUT', path, payload)).status, 409);
    await Order.updateOne({ _id: order._id }, { $set: { 'items.0.isPrepared': false } }, { timestamps: false });
    const payment = await Payment.findOne({ order: order._id });
    assert.equal((await request('POST', `/api/payments/${payment._id}/counter-confirm`, { paymentMethod: 'CASH' })).status, 200);
    assert.equal((await request('PUT', path, payload)).status, 409);
    await Order.updateOne({ _id: order._id }, { $set: { status: 'CANCELLED' } });
    assert.equal((await request('PUT', path, payload)).status, 409);
    assert.equal(await Order.countDocuments({ mutationLock: { $exists: true } }), 0);
  });
});
