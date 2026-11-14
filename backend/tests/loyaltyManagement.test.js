const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

require('dotenv').config();
process.env.JWT_SECRET = 'loyalty-management-isolated-test-secret';

const User = require('../models/User');
const Order = require('../models/Order');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const ShopSetting = require('../models/ShopSetting');

test('Screen 29: Loyalty rules, phone lookup, point adjustment without membership tiers', async (t) => {
  const dbName = `aura_cafe_loyalty_test_${randomBytes(4).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', {
    dbName,
    serverSelectionTimeoutMS: 5000
  });

  const app = express();
  app.use(express.json());
  app.use('/api/loyalty-transactions', require('../routes/loyaltyRoutes'));

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    if (!/^aura_cafe_loyalty_test_[0-9a-f]+$/.test(mongoose.connection.db.databaseName)) {
      throw new Error('Refusing to drop database outside the loyalty test namespace');
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

  const passwordHash = await bcrypt.hash('loyalty-pass', 4);
  const admin = await User.create({
    fullName: 'Loyalty Admin',
    phone: '0977000001',
    passwordHash,
    role: 'ADMIN'
  });
  const staff = await User.create({
    fullName: 'Loyalty Cashier',
    phone: '0977000002',
    passwordHash,
    role: 'STAFF',
    position: 'CASHIER'
  });
  const member = await User.create({
    fullName: 'Nguyễn Thành Viên',
    phone: '0977123456',
    passwordHash,
    role: 'CUSTOMER',
    totalPoints: 20,
  });

  const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const staffToken = jwt.sign({ id: staff._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const memberToken = jwt.sign({ id: member._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  // Historical tier data must neither leak into responses nor affect point balances.
  await User.collection.updateOne({ _id: member._id }, { $set: { tierName: 'DIAMOND' } });

  // 1. Auth check
  assert.equal((await request('/api/loyalty-transactions/rules')).status, 401);

  // Rules expose only phone-based earning and redemption, without creating tiers.
  const rulesRes = await request('/api/loyalty-transactions/rules', { token: memberToken });
  assert.equal(rulesRes.status, 200);
  assert.equal(rulesRes.data.tiers, undefined);
  assert.equal(await mongoose.connection.db.listCollections({ name: 'membershiptiers' }).hasNext(), false);
  // 3. Admin updates rules
  assert.equal(
    (
      await request('/api/loyalty-transactions/rules', {
        method: 'PUT',
        token: memberToken,
        body: { points_earn_unit: 1000 }
      })
    ).status,
    403
  );

  const updateRulesRes = await request('/api/loyalty-transactions/rules', {
    method: 'PUT',
    token: adminToken,
    body: {
      points_earn_unit: 1000,
      points_step: 10,
      points_step_value: 5000
    }
  });
  assert.equal(updateRulesRes.status, 200);

  assert.equal((await request('/api/loyalty-transactions/rules', { method: 'PUT', token: adminToken, body: { tiers: [] } })).status, 400);
  // 4. Lookup customer by phone number (Screen 29)
  const missingPhone = await request('/api/loyalty-transactions/lookup?phone=', { token: staffToken });
  assert.equal(missingPhone.status, 400);

  const notFoundPhone = await request('/api/loyalty-transactions/lookup?phone=0999999999', { token: staffToken });
  assert.equal(notFoundPhone.status, 404);

  const lookupRes = await request('/api/loyalty-transactions/lookup?phone=0977123456', { token: staffToken });
  assert.equal(lookupRes.status, 200);
  assert.equal(lookupRes.data.user.phone, '0977123456');
  assert.equal(lookupRes.data.user.tierName, undefined);
  assert.equal(lookupRes.data.user.totalPoints, 20);
  assert.equal(lookupRes.data.cashValue, 10000); // 20 / 10 * 5000 = 10000

  // 5. Adjust points: validation & insufficient points check
  const zeroChange = await request('/api/loyalty-transactions/adjust', {
    method: 'POST',
    token: staffToken,
    body: { phone: '0977123456', pointsChange: 0 }
  });
  assert.equal(zeroChange.status, 400);

  const excessiveDeduction = await request('/api/loyalty-transactions/adjust', {
    method: 'POST',
    token: staffToken,
    body: { phone: '0977123456', pointsChange: -50 } // Member only has 20 points
  });
  assert.equal(excessiveDeduction.status, 400);

  // 6. Adjusting points updates the phone account balance without a tier promotion.
  const earnRes = await request('/api/loyalty-transactions/adjust', {
    method: 'POST',
    token: staffToken,
    body: {
      customerId: member._id,
      pointsChange: 50,
      reason: 'Mua đồ uống sinh nhật'
    }
  });
  assert.equal(earnRes.status, 201);
  assert.equal(earnRes.data.user.totalPoints, 70);
  assert.equal(earnRes.data.user.tierName, undefined);
  assert.equal(earnRes.data.tierPromoted, undefined);
  assert.equal((await User.collection.findOne({ _id: member._id })).tierName, 'DIAMOND');
  assert.equal(earnRes.data.transaction.pointsChange, 50);
  assert.equal(earnRes.data.transaction.transactionType, 'ADJUST');

  // 7. Redeem points
  const redeemRes = await request('/api/loyalty-transactions/adjust', {
    method: 'POST',
    token: staffToken,
    body: {
      phone: '0977123456',
      pointsChange: -20,
      reason: 'Đổi voucher 10k'
    }
  });
  assert.equal(redeemRes.status, 201);
  assert.equal(redeemRes.data.user.totalPoints, 50);
  assert.equal(redeemRes.data.transaction.pointsChange, -20);
  assert.equal(redeemRes.data.transaction.transactionType, 'ADJUST');

  // 8. Stats & Transaction audit trail
  const statsRes = await request('/api/loyalty-transactions/stats', { token: staffToken });
  assert.equal(statsRes.status, 200);
  assert.ok(statsRes.data.totalPoints >= 50);
  assert.ok(statsRes.data.totalTransactions >= 2);

  const txLogsRes = await request('/api/loyalty-transactions?type=ADJUST', { token: adminToken });
  assert.equal(txLogsRes.status, 200);
  assert.ok(txLogsRes.data.transactions.length >= 1);
  assert.equal(txLogsRes.data.transactions[0].transactionType, 'ADJUST');
});
