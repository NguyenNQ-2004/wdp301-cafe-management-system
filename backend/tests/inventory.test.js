const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

require('dotenv').config();
process.env.JWT_SECRET = 'inventory-isolated-test-secret';

const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Ingredient = require('../models/Ingredient');
const PurchaseOrderItem = require('../models/PurchaseOrderItem');
const InventoryTransaction = require('../models/InventoryTransaction');

test('inventory overview, filters and stock adjustments', async (t) => {
  const dbName = `aura_cafe_inventory_test_${randomBytes(4).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', { dbName, serverSelectionTimeoutMS: 5000 });
  const app = express();
  app.use(express.json());
  app.use('/api/inventory-transactions', require('../routes/inventoryTransactionRoutes'));
  const server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    if (!/^aura_cafe_inventory_test_[0-9a-f]+$/.test(mongoose.connection.db.databaseName)) throw new Error('Refusing to drop a database outside the inventory test namespace');
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const admin = await User.create({ fullName: 'Inventory Admin', phone: '0999111001', passwordHash: await bcrypt.hash('test-password', 4), role: 'ADMIN', position: 'MANAGER' });
  const customer = await User.create({ fullName: 'Inventory Customer', phone: '0999111002', passwordHash: await bcrypt.hash('test-password', 4), role: 'CUSTOMER' });
  const supplier = await Supplier.create({ name: 'Inventory Supplier' });
  const coffee = await Ingredient.create({ supplier: supplier._id, name: 'Coffee beans', unit: 'gram', currentStock: 100, minStockLevel: 20 });
  const milk = await Ingredient.create({ supplier: supplier._id, name: 'Fresh milk', unit: 'ml', currentStock: 5, minStockLevel: 10 });
  await PurchaseOrderItem.create({ ingredient: coffee._id, quantity: 50, unitPrice: 400 });
  await InventoryTransaction.create({ ingredient: coffee._id, transactionType: 'IN_PURCHASE', quantity: 50, stockDelta: 50, referenceType: 'PURCHASE_ORDER' });

  const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const customerToken = jwt.sign({ id: customer._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, {
      method: options.method || 'GET',
      headers: { ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    return { status: response.status, data: await response.json() };
  };

  assert.equal((await request('/api/inventory-transactions/overview')).status, 401);
  assert.equal((await request('/api/inventory-transactions/overview', { token: customerToken })).status, 403);
  const overview = await request('/api/inventory-transactions/overview', { token: adminToken });
  assert.equal(overview.status, 200);
  assert.deepEqual(overview.data.summary, { estimatedValue: 40000, ingredientCount: 2, lowStockCount: 1, transactionCount: 1 });
  assert.equal(overview.data.ingredients.find((item) => item.name === 'Coffee beans').status, 'SAFE');
  assert.equal(overview.data.ingredients.find((item) => item.name === 'Fresh milk').status, 'LOW_STOCK');

  assert.equal((await request('/api/inventory-transactions?transactionType=INVALID', { token: adminToken })).status, 400);
  const forbidden = await request('/api/inventory-transactions', { method: 'POST', token: customerToken, body: { ingredient: coffee._id, transactionType: 'ADJUSTMENT', quantity: 10, isAddition: true } });
  assert.equal(forbidden.status, 403);
  const added = await request('/api/inventory-transactions', { method: 'POST', token: adminToken, body: { ingredient: coffee._id, transactionType: 'ADJUSTMENT', quantity: 10, isAddition: true, note: 'Kiểm kê' } });
  assert.equal(added.status, 201);
  assert.equal(added.data.updatedStock, 110);
  assert.equal(added.data.transaction.stockDelta, 10);
  const excessive = await request('/api/inventory-transactions', { method: 'POST', token: adminToken, body: { ingredient: milk._id, transactionType: 'SPOILAGE', quantity: 6 } });
  assert.equal(excessive.status, 409);
  assert.equal((await Ingredient.findById(milk._id)).currentStock, 5);
  assert.equal(await InventoryTransaction.countDocuments({ ingredient: milk._id }), 0);
});
