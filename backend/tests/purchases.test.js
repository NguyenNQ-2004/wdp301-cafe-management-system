const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

require('dotenv').config();
process.env.JWT_SECRET = 'purchases-isolated-test-secret';

const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Ingredient = require('../models/Ingredient');
const PurchaseOrder = require('../models/PurchaseOrder');
const PurchaseOrderItem = require('../models/PurchaseOrderItem');
const InventoryTransaction = require('../models/InventoryTransaction');

test('purchase order creation, ordering and receiving update real stock once', async (t) => {
  const dbName = `aura_cafe_purchases_test_${randomBytes(4).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', { dbName, serverSelectionTimeoutMS: 5000 });
  const app = express();
  app.use(express.json());
  app.use('/api/purchase-orders', require('../routes/purchaseOrderRoutes'));
  const server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    if (!/^aura_cafe_purchases_test_[0-9a-f]+$/.test(mongoose.connection.db.databaseName)) throw new Error('Refusing to drop a database outside the purchases test namespace');
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const admin = await User.create({ fullName: 'Purchase Admin', phone: '0999444001', passwordHash: await bcrypt.hash('test-password', 4), role: 'ADMIN', position: 'MANAGER' });
  const supplier = await Supplier.create({ name: 'Purchase Supplier', phone: '0911444001', status: 'ACTIVE' });
  const coffee = await Ingredient.create({ supplier: supplier._id, name: 'Coffee', unit: 'gram', currentStock: 10, minStockLevel: 2 });
  const milk = await Ingredient.create({ supplier: supplier._id, name: 'Milk', unit: 'ml', currentStock: 20, minStockLevel: 5 });
  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, { method: options.method || 'GET', headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined });
    return { status: response.status, data: await response.json() };
  };

  const emptyOverview = await request('/api/purchase-orders/management-overview');
  assert.equal(emptyOverview.status, 200);
  assert.deepEqual(emptyOverview.data.summary, { DRAFT: 0, ORDERED: 0, RECEIVED: 0, CANCELLED: 0 });
  assert.equal(emptyOverview.data.suppliers.length, 1);
  assert.equal(emptyOverview.data.ingredients.length, 2);

  const created = await request('/api/purchase-orders', { method: 'POST', body: { supplier: supplier._id, note: 'Weekly restock', items: [{ ingredient: coffee._id, quantity: 5, unitPrice: 100 }, { ingredient: milk._id, quantity: 10, unitPrice: 20 }] } });
  assert.equal(created.status, 201);
  assert.equal(created.data.status, 'DRAFT');
  assert.equal(created.data.totalCost, 700);
  assert.equal(await PurchaseOrderItem.countDocuments({ purchaseOrder: created.data._id }), 2);

  assert.equal((await request(`/api/purchase-orders/${created.data._id}/status`, { method: 'PUT', body: { status: 'ORDERED' } })).status, 200);
  const received = await request(`/api/purchase-orders/${created.data._id}/status`, { method: 'PUT', body: { status: 'RECEIVED' } });
  assert.equal(received.status, 200);
  assert.equal(received.data.purchaseOrder.status, 'RECEIVED');
  assert.equal((await Ingredient.findById(coffee._id)).currentStock, 15);
  assert.equal((await Ingredient.findById(milk._id)).currentStock, 30);
  const purchaseOrderId = new mongoose.Types.ObjectId(created.data._id);
  assert.equal(await InventoryTransaction.countDocuments({ referenceId: purchaseOrderId, transactionType: 'IN_PURCHASE' }), 2);

  assert.equal((await request(`/api/purchase-orders/${created.data._id}/status`, { method: 'PUT', body: { status: 'RECEIVED' } })).status, 409);
  assert.equal((await Ingredient.findById(coffee._id)).currentStock, 15);
  assert.equal(await InventoryTransaction.countDocuments({ referenceId: purchaseOrderId }), 2);
  const overview = await request('/api/purchase-orders/management-overview');
  assert.deepEqual(overview.data.summary, { DRAFT: 0, ORDERED: 0, RECEIVED: 1, CANCELLED: 0 });
  assert.equal(await PurchaseOrder.countDocuments(), 1);
});
