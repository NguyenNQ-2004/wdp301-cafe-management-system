const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

require('dotenv').config();
process.env.JWT_SECRET = 'customer-crm-isolated-test-secret';

const User = require('../models/User');
const Order = require('../models/Order');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');

test('Screen 28: Customer CRM management flow and access control', async (t) => {
  const dbName = `aura_cafe_crm_test_${randomBytes(4).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', {
    dbName,
    serverSelectionTimeoutMS: 5000
  });

  const app = express();
  app.use(express.json());
  app.use('/api/users', require('../routes/userRoutes'));

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    if (!/^aura_cafe_crm_test_[0-9a-f]+$/.test(mongoose.connection.db.databaseName)) {
      throw new Error('Refusing to drop database outside the CRM test namespace');
    }
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, {
      method: options.method || 'GET',
      headers: {
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.body ? { 'Content-Type': 'application/json' } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    return { status: response.status, data: await response.json() };
  };

  const passwordHash = await bcrypt.hash('crm-test-pass', 4);
  const admin = await User.create({
    fullName: 'CRM Admin',
    phone: '0988000001',
    passwordHash,
    role: 'ADMIN'
  });
  const cashier = await User.create({
    fullName: 'CRM Cashier',
    phone: '0988000002',
    passwordHash,
    role: 'STAFF',
    position: 'CASHIER'
  });
  const customerUser = await User.create({
    fullName: 'CRM Normal Customer',
    phone: '0988000003',
    passwordHash,
    role: 'CUSTOMER'
  });

  const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const cashierToken = jwt.sign({ id: cashier._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const customerToken = jwt.sign({ id: customerUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // 1. Authentication and Authorization checks
  assert.equal((await request('/api/users/customers')).status, 401);
  assert.equal((await request('/api/users/customers', { token: customerToken })).status, 403);

  // 2. Create customer validation (Screen 28)
  const missingFields = await request('/api/users/customers', {
    method: 'POST',
    token: cashierToken,
    body: { fullName: '' }
  });
  assert.equal(missingFields.status, 400);

  // Create new customer with initial points (e.g., 160 points -> GOLD tier)
  const createdRes = await request('/api/users/customers', {
    method: 'POST',
    token: cashierToken,
    body: {
      fullName: 'Trần Khách VIP',
      phone: '0988111222',
      email: 'khachvip@example.com',
      address: '123 Đường Cà Phê, Q1',
      birthday: '1995-05-20',
      initialPoints: 160
    }
  });
  assert.equal(createdRes.status, 201);
  assert.equal(createdRes.data.customer.fullName, 'Trần Khách VIP');
  assert.equal(createdRes.data.customer.phone, '0988111222');
  assert.equal(createdRes.data.customer.totalPoints, 160);
  assert.equal(createdRes.data.customer.tierName, 'GOLD');
  assert.equal(createdRes.data.customer.passwordHash, undefined);

  // Initial points must generate a LoyaltyTransaction
  const newCustomerId = createdRes.data.customer._id;
  const initialLoyaltyTx = await LoyaltyTransaction.findOne({ customer: newCustomerId });
  assert.ok(initialLoyaltyTx);
  assert.equal(initialLoyaltyTx.pointsChange, 160);
  assert.equal(initialLoyaltyTx.transactionType, 'EARN');

  // Duplicate phone creation must fail with 400
  const duplicatePhone = await request('/api/users/customers', {
    method: 'POST',
    token: adminToken,
    body: {
      fullName: 'Trùng SĐT',
      phone: '0988111222'
    }
  });
  assert.equal(duplicatePhone.status, 400);

  // Seed sample completed order for customer to verify aggregation
  await Order.create({
    orderCode: 'ORD-CRM-01',
    customer: newCustomerId,
    totalAmount: 125000,
    finalAmount: 125000,
    status: 'COMPLETED',
    orderType: 'DINE_IN'
  });

  // 3. List customers with search, tier filter & order aggregation
  const listRes = await request('/api/users/customers?search=Trần&tier=GOLD', { token: adminToken });
  assert.equal(listRes.status, 200);
  assert.ok(listRes.data.customers.length >= 1);
  const foundCustomer = listRes.data.customers.find((c) => c._id === newCustomerId);
  assert.ok(foundCustomer);
  assert.equal(foundCustomer.totalOrders, 1);
  assert.equal(foundCustomer.completedOrders, 1);
  assert.equal(foundCustomer.totalSpent, 125000);
  assert.ok(listRes.data.stats);
  assert.ok(listRes.data.stats.totalCustomers >= 2);
  assert.ok(listRes.data.stats.totalMemberRevenue >= 125000);

  // 4. Get customer details by ID
  const detailRes = await request(`/api/users/customers/${newCustomerId}`, { token: cashierToken });
  assert.equal(detailRes.status, 200);
  assert.equal(detailRes.data.customer.fullName, 'Trần Khách VIP');
  assert.equal(detailRes.data.orders.length, 1);
  assert.equal(detailRes.data.loyaltyHistory.length, 1);

  // 5. Update customer profile
  const updateRes = await request(`/api/users/customers/${newCustomerId}`, {
    method: 'PUT',
    token: adminToken,
    body: {
      fullName: 'Trần Khách VIP Updated',
      address: '456 Phố Trà Sữa',
      tierName: 'DIAMOND'
    }
  });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.data.customer.fullName, 'Trần Khách VIP Updated');
  assert.equal(updateRes.data.customer.address, '456 Phố Trà Sữa');
  assert.equal(updateRes.data.customer.tierName, 'DIAMOND');

  // 6. Toggle lock / unlock customer status
  const lockRes = await request(`/api/users/customers/${newCustomerId}/toggle-lock`, {
    method: 'PATCH',
    token: cashierToken
  });
  assert.equal(lockRes.status, 200);
  assert.equal(lockRes.data.status, 'LOCKED');

  const unlockRes = await request(`/api/users/customers/${newCustomerId}/toggle-lock`, {
    method: 'PATCH',
    token: adminToken
  });
  assert.equal(unlockRes.status, 200);
  assert.equal(unlockRes.data.status, 'ACTIVE');
});
