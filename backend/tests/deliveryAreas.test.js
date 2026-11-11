const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = require('../server');
const User = require('../models/User');
const WorkSchedule = require('../models/WorkSchedule');
const Category = require('../models/Category');
const Product = require('../models/Product');
const DeliveryArea = require('../models/DeliveryArea');
const ShopSetting = require('../models/ShopSetting');
const Order = require('../models/Order');
const jwtSecret = require('../config/jwtSecret')();

test('UC71 DeliveryArea: CRUD, district fee calculation, freeship override and inactive district guard', async (t) => {
  const dbName = `aura_delivery_area_test_${randomBytes(5).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aura_cafe_erp', { dbName, serverSelectionTimeoutMS: 5000 });

  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    assert.match(mongoose.connection.db.databaseName, /^aura_delivery_area_test_[a-f0-9]+$/);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const request = async (method, path, body, token) => {
    if (path === '/api/orders' && body?.checkoutFlow) body = { ...body, checkoutSessionId: '00000000-0000-4000-8000-000000000001', idempotencyKey: require('crypto').randomUUID() };
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  };

  await ShopSetting.create([
    { settingKey: 'delivery_fee', settingValue: '18000', settingGroup: 'DELIVERY' },
    { settingKey: 'freeship_threshold', settingValue: '150000', settingGroup: 'DELIVERY' },
    { settingKey: 'shift_morning', settingValue: '00:00-23:59' }
  ]);

  const customer = await User.create({ fullName: 'Khách Test Khu Vực', phone: '0901112233', role: 'CUSTOMER', passwordHash: 'pwd' });
  const shipper = await User.create({ fullName: 'Delivery Shipper', phone: '0901112244', role: 'STAFF', position: 'SHIPPER', passwordHash: 'pwd' });
  await WorkSchedule.create({ user: shipper._id, workDate: new Date(), shiftName: 'MORNING', status: 'PRESENT', checkInTime: new Date(Date.now() - 60000) });
  assert.deepEqual((await request('GET', '/api/delivery-areas/availability')).data, { available: true });
  const admin = await User.create({ fullName: 'Admin Cấu Hình', phone: '0904445566', role: 'ADMIN', passwordHash: 'pwd' });
  const custToken = jwt.sign({ id: customer._id }, jwtSecret);
  const adminToken = jwt.sign({ id: admin._id }, jwtSecret);

  const cat = await Category.create({ name: 'Đồ uống', status: 'ACTIVE' });
  const coffee = await Product.create({
    name: 'Cà phê Phin',
    category: cat._id,
    basePrice: 30000,
    isAvailable: true,
    variantsConfig: { sizes: { S: 0, M: 5000 }, toppings: [] }
  });

  // 1. Public reads do not seed. Set up a served district explicitly as Admin.
  const initialRes = await request('GET', '/api/delivery-areas', null, custToken);
  assert.equal(initialRes.status, 200);
  assert.deepEqual(initialRes.data, []);
  assert.equal(await DeliveryArea.countDocuments(), 0);
  assert.equal((await request('POST', '/api/delivery-areas', { district: 'Cầu Giấy', deliveryFee: 18000 }, adminToken)).status, 201);

  // 2. Customer cannot create or modify delivery areas -> 403
  const custCreateRes = await request('POST', '/api/delivery-areas', { district: 'Thị xã Sơn Tây', deliveryFee: 35000 }, custToken);
  assert.equal(custCreateRes.status, 403);

  // 3. Admin creates new district with custom fee -> 201
  const adminCreateRes = await request('POST', '/api/delivery-areas', { district: 'Huyện Gia Lâm', deliveryFee: 30000 }, adminToken);
  assert.equal(adminCreateRes.status, 201);
  assert.equal(adminCreateRes.data.district, 'Huyện Gia Lâm');
  assert.equal(adminCreateRes.data.deliveryFee, 30000);
  const giaLamId = adminCreateRes.data._id;

  // 4. Duplicate district rejected -> 409
  const dupRes = await request('POST', '/api/delivery-areas', { district: 'huyện gia lâm', deliveryFee: 32000 }, adminToken);
  assert.equal(dupRes.status, 409);

  // 5. Checkout to Gia Lâm applies Gia Lâm fee (30000) when order < 150000
  // Order: 2 coffees M = 2 * 35000 = 70000 < 150000 -> shipping = 30000 -> total = 100000
  const orderGiaLam = await request('POST', '/api/orders', {
    checkoutFlow: true,
    orderType: 'ONLINE',
    recipientName: 'Khách Gia Lâm',
    recipientPhone: '0901112233',
    district: 'Huyện Gia Lâm',
    ward: 'Trâu Quỳ',
    addressDetail: 'Học viện Nông Nghiệp',
    expectedTotal: 100000,
    items: [{ productId: coffee._id, size: 'M', quantity: 2 }]
  }, custToken);

  assert.equal(orderGiaLam.status, 201);
  assert.equal(orderGiaLam.data.deliveryFee, 30000);
  assert.equal(orderGiaLam.data.finalAmount, 100000);
  assert.equal(orderGiaLam.data.district, 'Huyện Gia Lâm');

  // Cancel order so customer has no pending blocking
  await request('PUT', `/api/orders/${orderGiaLam.data._id}/status`, { status: 'CANCELLED' }, custToken);

  // 6. Large order to Gia Lâm (>= 150000) gets free shipping (fee = 0)
  // 5 coffees M = 5 * 35000 = 175000 >= 150000 -> shipping = 0 -> total = 175000
  const orderFreeGiaLam = await request('POST', '/api/orders', {
    checkoutFlow: true,
    orderType: 'ONLINE',
    recipientName: 'Khách Gia Lâm',
    recipientPhone: '0901112233',
    district: 'Huyện Gia Lâm',
    ward: 'Trâu Quỳ',
    addressDetail: 'Học viện Nông Nghiệp',
    expectedTotal: 175000,
    items: [{ productId: coffee._id, size: 'M', quantity: 5 }]
  }, custToken);

  assert.equal(orderFreeGiaLam.status, 201);
  assert.equal(orderFreeGiaLam.data.deliveryFee, 0);
  assert.equal(orderFreeGiaLam.data.finalAmount, 175000);

  await request('PUT', `/api/orders/${orderFreeGiaLam.data._id}/status`, { status: 'CANCELLED' }, custToken);

  // 7. Admin deactivates Gia Lâm
  const deactivateRes = await request('PUT', `/api/delivery-areas/${giaLamId}`, { isActive: false }, adminToken);
  assert.equal(deactivateRes.status, 200);
  assert.equal(deactivateRes.data.isActive, false);

  // Public list excludes inactive area
  const publicAreas = await request('GET', '/api/delivery-areas', null, custToken);
  assert.ok(!publicAreas.data.some(d => d._id === giaLamId));

  // Admin list with ?all=true includes inactive area
  const allAreas = await request('GET', '/api/delivery-areas?all=true', null, adminToken);
  assert.ok(allAreas.data.some(d => d._id === giaLamId && d.isActive === false));

  // Attempt to order to deactivated district -> 400
  const inactiveOrderRes = await request('POST', '/api/orders', {
    checkoutFlow: true,
    orderType: 'ONLINE',
    recipientName: 'Khách Gia Lâm',
    recipientPhone: '0901112233',
    district: 'Huyện Gia Lâm',
    ward: 'Trâu Quỳ',
    addressDetail: 'Học viện Nông Nghiệp',
    expectedTotal: 100000,
    items: [{ productId: coffee._id, size: 'M', quantity: 2 }]
  }, custToken);

  assert.equal(inactiveOrderRes.status, 400);
  assert.match(inactiveOrderRes.data.message, /tạm ngưng/i);

  // 8. Admin deletes area -> 200
  const deleteRes = await request('DELETE', `/api/delivery-areas/${giaLamId}`, null, adminToken);
  assert.equal(deleteRes.status, 200);
});
