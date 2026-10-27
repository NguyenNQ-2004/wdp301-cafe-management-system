const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ quiet: true });
process.env.JWT_SECRET = 'counter-customization-test';
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');

test('Editing and cancelling customized counter orders preserves every independent cup', async t => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', { dbName: `cafe_counter_customization_test_${randomBytes(6).toString('hex')}`, serverSelectionTimeoutMS: 5000 });
  const app = express(); app.use(express.json()); app.use('/api/orders', require('../routes/orderRoutes'));
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  t.after(async () => {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    assert.match(mongoose.connection.db.databaseName, /^cafe_counter_customization_test_[a-f0-9]{12}$/);
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  });
  const cashier = await User.create({ fullName: 'Cashier', phone: '0999444001', passwordHash: 'unused', role: 'STAFF', position: 'CASHIER' });
  const token = jwt.sign({ id: cashier._id }, process.env.JWT_SECRET);
  const request = async (method, path, body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  const category = await Category.create({ name: 'Coffee' });
  const product = await Product.create({ category: category._id, name: 'Coffee', basePrice: 30000, variantsConfig: { sizes: { M: 0, L: 10000 }, toppings: [{ name: 'Pearl', price: 5000 }, { name: 'Jelly', price: 4000 }] }, isAvailable: true });
  const line = (quantity, customization) => ({ productId: String(product._id), quantity, size: 'M', customization });
  const created = await request('POST', '/api/orders', { orderType: 'DINE_IN', tableNumber: 'T01', items: [
    line(1, { size: 'M', sugar: '0%', ice: 'Ít đá', topping: ['Pearl'], note: 'First cup' }),
    line(2, { size: 'M', sugar: '100%', ice: 'Không đá', topping: ['Jelly'], note: 'Second cups' }),
  ] });
  assert.equal(created.status, 201);
  const id = created.data._id;
  const payload = { expectedUpdatedAt: created.data.updatedAt, tableNumber: 'T02', orderNote: 'Keep cups separate', expectedTotal: 172000, items: [
    line(3, { size: 'M', sugar: '70%', ice: 'Không đá', topping: ['Jelly'], note: 'Second cups' }),
    line(2, { size: 'M', sugar: '0%', ice: 'Ít đá', topping: ['Pearl'], note: 'First cup' }),
  ] };
  await t.test('Incomplete legacy requests, invalid options and stale prices never erase saved options', async () => {
    assert.equal((await request('PUT', `/api/orders/${id}/counter`, { ...payload, items: [{ productId: String(product._id), size: 'M', quantity: 1 }] })).status, 400);
    assert.equal((await request('PUT', `/api/orders/${id}/counter`, { ...payload, expectedTotal: 1 })).status, 409);
    assert.equal((await request('PUT', `/api/orders/${id}/counter`, { ...payload, items: [line(1, { sugar: '20%' })] })).status, 400);
    const unchanged = await Order.findById(id);
    assert.equal(unchanged.items[0].customization.note, 'First cup'); assert.deepEqual(unchanged.items[0].customization.topping, ['Pearl']);
    assert.equal(unchanged.updatedAt.toISOString(), created.data.updatedAt);
  });
  await t.test('Reordered duplicate product/size lines keep distinct options and synchronized prices', async () => {
    const updated = await request('PUT', `/api/orders/${id}/counter`, payload); assert.equal(updated.status, 200, JSON.stringify(updated.data));
    assert.equal(updated.data.order.finalAmount, 172000); assert.equal(updated.data.order.items.length, 2);
    assert.equal(updated.data.order.items[0].customization.sugar, '70%'); assert.equal(updated.data.order.items[1].customization.sugar, '0%');
    assert.equal(updated.data.order.items[0].customization.note, 'Second cups'); assert.equal(updated.data.order.items[1].customization.note, 'First cup');
    assert.equal((await Payment.findOne({ order: id })).amount, 172000);
    const lines = await OrderItem.find({ order: id }).sort({ _id: 1 });
    assert.equal(lines[0].quantity, 3); assert.equal(lines[0].unitPrice, 34000); assert.deepEqual(lines[1].customization.topping, ['Pearl']);
  });
  await t.test('Retired toppings must be removed explicitly and the new total must match', async () => {
    await Product.updateOne({ _id: product._id }, { $set: { 'variantsConfig.toppings': [{ name: 'Jelly', price: 4000 }] } });
    const order = await Order.findById(id);
    const changed = { ...payload, expectedUpdatedAt: order.updatedAt.toISOString() };
    assert.equal((await request('PUT', `/api/orders/${id}/counter`, changed)).status, 400);
    changed.items = [payload.items[0], line(2, { size: 'M', sugar: '0%', ice: 'Ít đá', topping: [], note: 'First cup' })];
    changed.expectedTotal = 162000;
    assert.equal((await request('PUT', `/api/orders/${id}/counter`, changed)).status, 200);
    assert.equal((await Payment.findOne({ order: id })).amount, 162000);
  });
  await t.test('An unpaid topped order can be cancelled without losing item snapshots', async () => {
    assert.equal((await request('PUT', `/api/orders/${id}/counter-cancel`, { cancelReason: 'Customer requested cancellation' })).status, 200);
    assert.equal((await Order.findById(id)).status, 'CANCELLED'); assert.equal((await Payment.findOne({ order: id })).status, 'FAILED');
    const lines = await OrderItem.find({ order: id }).sort({ _id: 1 }); assert.equal(lines.length, 2); assert.deepEqual(lines[0].customization.topping, ['Jelly']);
  });
});
