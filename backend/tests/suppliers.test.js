const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

require('dotenv').config();
process.env.JWT_SECRET = 'suppliers-isolated-test-secret';

const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Ingredient = require('../models/Ingredient');
const PurchaseOrder = require('../models/PurchaseOrder');

test('supplier overview and protected CRUD flow', async (t) => {
  const dbName = `aura_cafe_suppliers_test_${randomBytes(4).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', { dbName, serverSelectionTimeoutMS: 5000 });
  const app = express();
  app.use(express.json());
  app.use('/api/suppliers', require('../routes/supplierRoutes'));
  const server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    if (!/^aura_cafe_suppliers_test_[0-9a-f]+$/.test(mongoose.connection.db.databaseName)) throw new Error('Refusing to drop a database outside the suppliers test namespace');
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const admin = await User.create({ fullName: 'Supplier Admin', phone: '0999333001', passwordHash: await bcrypt.hash('test-password', 4), role: 'ADMIN', position: 'MANAGER' });
  const customer = await User.create({ fullName: 'Supplier Customer', phone: '0999333002', passwordHash: await bcrypt.hash('test-password', 4), role: 'CUSTOMER' });
  const protectedSupplier = await Supplier.create({ name: 'Protected Supplier', phone: '0911000011', address: 'Hanoi', status: 'ACTIVE' });
  const ingredient = await Ingredient.create({ supplier: protectedSupplier._id, name: 'Coffee', unit: 'gram', currentStock: 10, minStockLevel: 2 });
  await PurchaseOrder.create({ supplier: protectedSupplier._id, creator: admin._id, totalCost: 100, status: 'DRAFT', items: [{ ingredient: ingredient._id, quantity: 10, unitPrice: 10 }] });
  const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const customerToken = jwt.sign({ id: customer._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, { method: options.method || 'GET', headers: { ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...(options.body ? { 'Content-Type': 'application/json' } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined });
    return { status: response.status, data: await response.json() };
  };

  assert.equal((await request('/api/suppliers/overview')).status, 401);
  assert.equal((await request('/api/suppliers/overview', { token: customerToken })).status, 403);
  const overview = await request('/api/suppliers/overview', { token: adminToken });
  assert.equal(overview.status, 200);
  assert.deepEqual(overview.data.summary, { supplierCount: 1, activeCount: 1, inactiveCount: 0, purchaseOrderCount: 1 });
  assert.deepEqual(overview.data.suppliers[0].ingredients, ['Coffee']);

  const duplicate = await request('/api/suppliers', { method: 'POST', token: adminToken, body: { name: 'protected supplier', phone: '0999000000', address: 'Hanoi' } });
  assert.equal(duplicate.status, 409);
  const created = await request('/api/suppliers', { method: 'POST', token: adminToken, body: { name: 'New Supplier', phone: '0911000022', address: 'Da Nang' } });
  assert.equal(created.status, 201);
  assert.equal(created.data.status, 'ACTIVE');
  const updated = await request(`/api/suppliers/${created.data._id}`, { method: 'PUT', token: adminToken, body: { name: 'New Supplier', phone: '0911000022', address: 'Ho Chi Minh City', status: 'INACTIVE' } });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.address, 'Ho Chi Minh City');
  assert.equal(updated.data.status, 'INACTIVE');
  assert.equal((await request(`/api/suppliers/${protectedSupplier._id}`, { method: 'DELETE', token: adminToken })).status, 409);
  assert.equal((await request(`/api/suppliers/${created.data._id}`, { method: 'DELETE', token: adminToken })).status, 200);
  assert.equal(await Supplier.exists({ _id: created.data._id }), null);
});
