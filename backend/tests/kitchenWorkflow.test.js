const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = require('../server');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Ingredient = require('../models/Ingredient');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');
const Inventory = require('../models/InventoryTransaction');

test('KDS buttons persist start, per-item completion and READY without double-consuming stock', async t => {
  const dbName = `aura_kitchen_test_${randomBytes(6).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aura_cafe_erp', { dbName, serverSelectionTimeoutMS: 5000 });
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(async () => {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    assert.match(mongoose.connection.db.databaseName, /^aura_kitchen_test_[a-f0-9]+$/);
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  });
  const barista = await User.create({ fullName: 'KDS Barista', phone: '0900777001', role: 'STAFF', position: 'BARISTA', passwordHash: 'fixture-only' });
  const token = jwt.sign({ id: barista._id }, require('../config/jwtSecret')());
  const call = async (path, body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: body ? 'PUT' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  };
  const category = await Category.create({ name: 'KDS Drinks' });
  const ingredient = await Ingredient.create({ name: 'KDS Beans', unit: 'g', currentStock: 100 });
  const products = await Product.create([
    { name: 'KDS Coffee A', category: category._id, basePrice: 30000, recipe: [{ ingredient: ingredient._id, quantityRequired: 5 }] },
    { name: 'KDS Coffee B', category: category._id, basePrice: 30000, recipe: [{ ingredient: ingredient._id, quantityRequired: 10 }] }
  ]);
  const items = products.map(product => ({ product: product._id, productNameAtTime: product.name, quantity: 1, unitPrice: 30000, subtotal: 30000, isPrepared: false }));
  const order = await Order.create({ orderCode: 'KDS-BUTTON-FLOW', orderType: 'ONLINE', paymentMethod: 'COD', status: 'CONFIRMED', items, totalAmount: 60000, finalAmount: 78000 });
  await OrderItem.insertMany(items.map(item => ({ ...item, order: order._id })));
  await Payment.create({ order: order._id, paymentMethod: 'CASH', amount: 78000 });
  const path = `/api/orders/${order._id}`;
  assert.equal((await call('/api/orders')).data.find(row => row._id === String(order._id)).kitchenEligible, true);
  assert.equal((await call(`${path}/status`, { status: 'PREPARING' })).status, 200);
  let saved = await Order.findById(order._id);
  assert.equal(saved.status, 'PREPARING'); assert.equal(saved.inventoryProcessing, false);
  assert.equal((await Ingredient.findById(ingredient._id)).currentStock, 85);
  assert.equal((await call(`${path}/status`, { status: 'READY' })).status, 409);
  assert.equal((await call(`${path}/items/0/prepared`, { isPrepared: true, autoReady: false })).status, 200);
  saved = await Order.findById(order._id);
  assert.equal(saved.status, 'PREPARING'); assert.equal(saved.items[0].isPrepared, true); assert.equal(saved.items[1].isPrepared, false);
  assert.equal((await call(`${path}/status`, { status: 'READY' })).status, 409);
  // Repair an already-deducted legacy processing flag only on this explicit action.
  await Order.updateOne({ _id: order._id }, { $set: { inventoryProcessing: true } });
  assert.equal((await call(`${path}/items/1/prepared`, { isPrepared: true, autoReady: false })).status, 200);
  saved = await Order.findById(order._id);
  assert.equal(saved.status, 'PREPARING'); assert.equal(saved.inventoryProcessing, false);
  assert.ok(saved.items.every(item => item.isPrepared));
  assert.equal((await call(`${path}/status`, { status: 'READY' })).status, 200);
  assert.equal((await call(`${path}/status`, { status: 'READY' })).status, 200);
  const listed = (await call('/api/orders')).data.find(row => row._id === String(order._id));
  assert.equal(listed.status, 'READY'); assert.equal(listed.kitchenEligible, true);
  assert.equal((await Ingredient.findById(ingredient._id)).currentStock, 85);
  assert.equal(await Inventory.countDocuments({ referenceId: order._id, transactionType: 'OUT_ORDER' }), 1);
  assert.ok((await OrderItem.find({ order: order._id })).every(item => item.isPrepared));
});
