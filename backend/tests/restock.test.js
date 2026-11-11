const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

require('dotenv').config();
process.env.JWT_SECRET = 'restock-isolated-test-secret';

const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Ingredient = require('../models/Ingredient');
const PurchaseOrder = require('../models/PurchaseOrder');
const PurchaseOrderItem = require('../models/PurchaseOrderItem');

test('restock overview and proposal approval flow', async (t) => {
  const dbName = `aura_cafe_restock_test_${randomBytes(4).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', { dbName, serverSelectionTimeoutMS: 5000 });
  const app = express();
  app.use(express.json());
  app.use('/api/purchase-orders', require('../routes/purchaseOrderRoutes'));
  const server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    if (!/^aura_cafe_restock_test_[0-9a-f]+$/.test(mongoose.connection.db.databaseName)) throw new Error('Refusing to drop a database outside the restock test namespace');
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const admin = await User.create({ fullName: 'Restock Admin', phone: '0999222001', passwordHash: await bcrypt.hash('test-password', 4), role: 'ADMIN', position: 'MANAGER' });
  const customer = await User.create({ fullName: 'Restock Customer', phone: '0999222002', passwordHash: await bcrypt.hash('test-password', 4), role: 'CUSTOMER' });
  const supplier = await Supplier.create({ name: 'Main Supplier', status: 'ACTIVE' });
  const otherSupplier = await Supplier.create({ name: 'Other Supplier', status: 'ACTIVE' });
  const lowIngredient = await Ingredient.create({ supplier: supplier._id, name: 'Low ingredient', unit: 'gram', currentStock: 5, minStockLevel: 10 });
  const safeIngredient = await Ingredient.create({ supplier: otherSupplier._id, name: 'Safe ingredient', unit: 'ml', currentStock: 20, minStockLevel: 10 });
  const existingDraft = await PurchaseOrder.create({ supplier: supplier._id, creator: admin._id, totalCost: 800, status: 'DRAFT', items: [{ ingredient: lowIngredient._id, quantity: 20, unitPrice: 40 }] });
  await PurchaseOrderItem.create({ purchaseOrder: existingDraft._id, ingredient: lowIngredient._id, quantity: 20, unitPrice: 40 });

  const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const customerToken = jwt.sign({ id: customer._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, { method: options.method || 'GET', headers: { ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...(options.body ? { 'Content-Type': 'application/json' } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined });
    return { status: response.status, data: await response.json() };
  };

  assert.equal((await request('/api/purchase-orders/restock-overview')).status, 401);
  assert.equal((await request('/api/purchase-orders/restock-overview', { token: customerToken })).status, 403);
  const overview = await request('/api/purchase-orders/restock-overview', { token: adminToken });
  assert.equal(overview.status, 200);
  assert.deepEqual(overview.data.summary, { lowStockCount: 1, draftCount: 1, orderedCount: 0, pendingValue: 800 });
  assert.equal(overview.data.ingredients.find((item) => item.name === 'Low ingredient').needsRestock, true);

  const mismatch = await request('/api/purchase-orders', { method: 'POST', token: adminToken, body: { supplier: supplier._id, items: [{ ingredient: safeIngredient._id, quantity: 2, unitPrice: 10 }] } });
  assert.equal(mismatch.status, 400);
  const created = await request('/api/purchase-orders', { method: 'POST', token: adminToken, body: { supplier: supplier._id, items: [{ ingredient: lowIngredient._id, quantity: 30, unitPrice: 50 }], note: 'Restock test' } });
  assert.equal(created.status, 201);
  assert.equal(created.data.status, 'DRAFT');
  assert.equal(created.data.totalCost, 1500);
  assert.equal(await PurchaseOrderItem.countDocuments({ purchaseOrder: created.data._id }), 1);

  const approved = await request(`/api/purchase-orders/${created.data._id}/status`, { method: 'PUT', token: adminToken, body: { status: 'ORDERED' } });
  assert.equal(approved.status, 200);
  assert.equal(approved.data.purchaseOrder.status, 'ORDERED');
  assert.equal((await request(`/api/purchase-orders/${created.data._id}/status`, { method: 'PUT', token: adminToken, body: { status: 'ORDERED' } })).status, 409);
});
