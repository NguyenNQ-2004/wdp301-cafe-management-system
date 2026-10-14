const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config();
process.env.JWT_SECRET = 'uc11-isolated-test-secret';

const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');
const RewardItem = require('../models/RewardItem');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');

test('UC11 creates delivery and pickup orders with verified contact and totals', async (t) => {
  const dbName = `aura_cafe_uc11_test_${randomBytes(4).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp', {
    dbName,
    serverSelectionTimeoutMS: 5000
  });

  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../routes/authRoutes'));
  app.use('/api/orders', require('../routes/orderRoutes'));
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    if (!/^aura_cafe_uc11_test_[0-9a-f]+$/.test(mongoose.connection.db.databaseName)) {
      throw new Error('Refusing to drop a database outside the UC11 test namespace');
    }
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, body, token) => {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body)
    });
    return { status: response.status, data: await response.json() };
  };

  const customer = await User.create({
    fullName: 'UC11 Customer', phone: '0999000011',
    passwordHash: await bcrypt.hash('test-password', 4), role: 'CUSTOMER', totalPoints: 200
  });
  const category = await Category.create({ name: 'UC11 Test Category' });
  const product = await Product.create({ category: category._id, name: 'UC11 Test Coffee', basePrice: 50000, isAvailable: true });
  await Cart.create({ customer: customer._id, items: [{ product: product._id, quantity: 1, size: 'M', checked: true }] });

  assert.equal((await request('/api/auth/login', { phone: customer.phone, password: 'demo_hash' })).status, 401);
  assert.equal((await request('/api/auth/login', { phone: customer.phone })).status, 400);
  const login = await request('/api/auth/login', { phone: customer.phone, password: 'test-password' });
  assert.equal(login.status, 200);
  const token = login.data.token;
  const item = { productId: String(product._id), quantity: 1, size: 'M' };
  const delivery = {
    items: [item], orderType: 'ONLINE', recipientName: '  Người nhận  ',
    recipientPhone: ' 090 123 4567 ', deliveryAddress: '  28 Tràng Tiền, Hà Nội  ',
    paymentMethod: 'MOMO', expectedTotal: 68000
  };

  assert.equal((await request('/api/orders', delivery)).status, 401);
  assert.equal((await request('/api/orders', { ...delivery, deliveryAddress: '   ' }, token)).status, 400);
  assert.equal((await request('/api/orders', { ...delivery, recipientPhone: 'abc' }, token)).status, 400);
  assert.equal((await request('/api/orders', { ...delivery, expectedTotal: 1 }, token)).status, 409);
  assert.equal(await Order.countDocuments(), 0);

  const placed = await request('/api/orders', delivery, token);
  assert.equal(placed.status, 201);
  assert.equal(placed.data.recipientName, 'Người nhận');
  assert.equal(placed.data.recipientPhone, '090 123 4567');
  assert.equal(placed.data.deliveryAddress, '28 Tràng Tiền, Hà Nội');
  assert.equal(placed.data.paymentMethod, 'COD');
  assert.equal(placed.data.deliveryFee, 18000);
  assert.equal(placed.data.finalAmount, 68000);
  assert.equal(placed.data.status, 'PENDING');
  assert.equal(await OrderItem.countDocuments({ order: placed.data._id }), 1);
  assert.equal((await Payment.findOne({ order: placed.data._id })).status, 'PENDING');
  assert.equal((await Cart.findOne({ customer: customer._id })).items.length, 0);

  const pickup = await request('/api/orders', {
    items: [item], orderType: 'TAKEAWAY', recipientName: 'Người nhận',
    recipientPhone: '0901234567', expectedTotal: 50000
  }, token);
  assert.equal(pickup.status, 201);
  assert.equal(pickup.data.paymentMethod, 'PAY_AT_COUNTER');
  assert.equal(pickup.data.deliveryAddress, undefined);
  assert.equal(pickup.data.deliveryFee, 0);
  assert.equal(pickup.data.finalAmount, 50000);

  const reward = await RewardItem.create({
    name: 'UC11 Test Reward', pointsCost: 100, discountValue: 15000,
    minOrderValue: 50000, stock: 1
  });
  const redeemed = await request('/api/orders', {
    ...delivery, rewardId: String(reward._id), expectedTotal: 53000
  }, token);
  assert.equal(redeemed.status, 201);
  assert.equal(redeemed.data.discountAmount, 15000);
  assert.equal(redeemed.data.pointsRedeemed, 100);
  assert.equal(redeemed.data.finalAmount, 53000);
  assert.equal((await User.findById(customer._id)).totalPoints, 100);
  assert.equal((await RewardItem.findById(reward._id)).stock, 0);
  assert.equal(await LoyaltyTransaction.countDocuments({ order: redeemed.data._id, transactionType: 'REDEEM' }), 1);
});
