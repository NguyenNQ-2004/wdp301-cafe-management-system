const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes, createHmac } = require('node:crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = require('../server');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');
const Loyalty = require('../models/LoyaltyTransaction');
const DeliveryArea = require('../models/DeliveryArea');
const WorkSchedule = require('../models/WorkSchedule');
const Handover = require('../models/ShiftHandover');
const { runWithTransaction } = require('../utils/mongoTransaction');

test('Final baseline: checkout identity, rollback, payment integrity and atomic handover', async t => {
  const dbName = `aura_final_test_${randomBytes(6).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aura_cafe_erp', { dbName, serverSelectionTimeoutMS: 5000 });
  for (const name of mongoose.modelNames()) await mongoose.model(name).init();
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(async () => {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    assert.match(mongoose.connection.db.databaseName, /^aura_final_test_[a-f0-9]+$/);
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  });
  const customer = await User.create({ fullName: 'Final Customer', phone: '0900000101', passwordHash: 'fixture', role: 'CUSTOMER', totalPoints: 120 });
  const cashier = await User.create({ fullName: 'Final Cashier', phone: '0900000102', passwordHash: 'fixture', role: 'STAFF', position: 'CASHIER' });
  const admin = await User.create({ fullName: 'Final Admin', phone: '0900000103', passwordHash: 'fixture', role: 'ADMIN' });
  const foreign = await User.create({ fullName: 'Other Cashier', phone: '0900000104', passwordHash: 'fixture', role: 'STAFF', position: 'CASHIER' });
  const shipper = await User.create({ fullName: 'Final Shipper', phone: '0900000105', passwordHash: 'fixture', role: 'STAFF', position: 'SHIPPER' });
  await WorkSchedule.create({ user: shipper._id, workDate: new Date(), shiftName: 'CHECKOUT', status: 'PRESENT', checkInTime: new Date(Date.now() - 60000) });
  const token = u => jwt.sign({ id: u._id }, require('../config/jwtSecret')());
  const request = async (method, path, body, user = customer) => {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: res.status, data: await res.json() };
  };
  const category = await Category.create({ name: 'Final Category' });
  const product = await Product.create({ name: 'Final Coffee', category: category._id, basePrice: 45000 });
  const session = randomUUID();
  const input = changes => ({ checkoutFlow: true, checkoutSessionId: session, idempotencyKey: randomUUID(), orderType: 'ONLINE', recipientName: 'Customer', recipientPhone: '0900000101', district: 'Cầu Giấy', ward: 'Dịch Vọng', addressDetail: 'Số 8 Tôn Thất Thuyết', items: [{ productId: String(product._id), quantity: 1, size: 'M' }], pointsToRedeem: 20, expectedTotal: 59000, ...changes });
  let current, firstBody;
  const snapshot = async () => JSON.stringify({ orders: await Order.find().sort('_id').lean(), payments: await Payment.find().sort('_id').lean(), points: (await User.findById(customer._id)).totalPoints, ledger: await Loyalty.find().sort('_id').lean(), items: await OrderItem.find().sort('_id').lean() });

  await t.test('public delivery read never seeds; unknown districts are rejected', async () => {
    assert.deepEqual((await request('GET', '/api/delivery-areas', null, null)).data, []);
    assert.equal(await DeliveryArea.countDocuments(), 0);
    assert.equal((await request('POST', '/api/orders', input())).status, 400);
    assert.equal(await Order.countDocuments(), 0);
    await DeliveryArea.create({ district: 'Cầu Giấy', deliveryFee: 18000 });
  });
  await t.test('checkout reserves points once and persists the session/key/hash', async () => {
    firstBody = input();
    const result = await request('POST', '/api/orders', firstBody);
    assert.equal(result.status, 201, JSON.stringify(result.data)); current = result.data;
    assert.equal(current.checkoutSessionId, session); assert.match(current.requestHash, /^[a-f0-9]{64}$/);
    assert.equal((await User.findById(customer._id)).totalPoints, 100);
  });
  await t.test('identical retry returns the original order without spending twice', async () => {
    const before = await snapshot();
    const retry = await request('POST', '/api/orders', firstBody);
    assert.equal(retry.status, 201); assert.equal(retry.data._id, current._id);
    assert.equal(await snapshot(), before);
    assert.equal((await request('POST', '/api/orders', { ...firstBody, recipientName: 'Changed' })).status, 409);
    assert.equal(await snapshot(), before);
  });
  await t.test('invalid replacements preserve every old order/payment/point record', async () => {
    for (const patch of [{ expectedTotal: 1 }, { district: 'Unknown' }, { recipientPhone: 'x' }, { pointsToRedeem: 999 }, { items: [{ productId: String(product._id), quantity: 0 }] }]) {
      const before = await snapshot();
      assert.ok([400, 409].includes((await request('POST', '/api/orders', input(patch))).status));
      assert.equal(await snapshot(), before);
    }
  });
  await t.test('failure after replacement/order writes rolls back the entire checkout', async () => {
    const before = await snapshot();
    const create = Payment.create;
    try {
      Payment.create = async () => { throw new Error('Injected payment insert failure'); };
      assert.equal((await request('POST', '/api/orders', input())).status, 500);
    } finally { Payment.create = create; }
    assert.equal(await snapshot(), before);
  });
  await t.test('valid same-session replacement refunds old points and holds new points atomically', async () => {
    const oldId = current._id;
    const result = await request('POST', '/api/orders', input());
    assert.equal(result.status, 201); current = result.data;
    assert.equal((await Order.findById(oldId)).status, 'CANCELLED');
    assert.equal((await Payment.findOne({ order: oldId })).status, 'FAILED');
    assert.equal((await User.findById(customer._id)).totalPoints, 100);
  });
  await t.test('a different tab/session does not cancel this checkout', async () => {
    const result = await request('POST', '/api/orders', input({ checkoutSessionId: randomUUID(), pointsToRedeem: 0, expectedTotal: 63000 }));
    assert.equal(result.status, 201);
    assert.equal((await Order.findById(current._id)).status, 'PENDING');
  });
  await t.test('hidden categories cannot be ordered by a known product ID', async () => {
    await Category.updateOne({ _id: category._id }, { $set: { status: 'INACTIVE' } });
    const before = await snapshot();
    assert.equal((await request('POST', '/api/orders', input())).status, 400);
    assert.equal(await snapshot(), before);
    await Category.updateOne({ _id: category._id }, { $set: { status: 'ACTIVE' } });
  });
  await t.test('callback side-effect failure leaves payment/order/points unchanged; retry earns once', async () => {
    const keys = ['PAYMENT_GATEWAY_URL', 'PAYMENT_CALLBACK_SECRET', 'PAYMENT_BANK_ID', 'PAYMENT_ACCOUNT_NO', 'PAYMENT_ACCOUNT_NAME'];
    const old = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    keys.forEach(key => { process.env[key] = key === 'PAYMENT_GATEWAY_URL' ? 'https://fixture.invalid' : 'fixture'; });
    const payment = await Payment.findOne({ order: current._id });
    const body = { orderCode: current.orderCode, transactionCode: payment.transactionCode, amount: current.finalAmount, status: 'SUCCESS' };
    body.signature = createHmac('sha256', 'fixture').update(`${body.orderCode}|${body.transactionCode}|${body.amount}|SUCCESS`).digest('hex');
    try {
      const before = await snapshot(); const create = Loyalty.create;
      try { Loyalty.create = async () => { throw new Error('Injected ledger failure'); }; assert.equal((await request('POST', '/api/payments/callback', body, null)).status, 500); }
      finally { Loyalty.create = create; }
      assert.equal(await snapshot(), before);
      assert.equal((await request('POST', '/api/payments/callback', body, null)).status, 200);
      assert.equal((await request('POST', '/api/payments/callback', body, null)).status, 200);
      assert.equal(await Loyalty.countDocuments({ order: current._id, transactionType: 'EARN' }), 1);
      assert.equal((await request('PUT', `/api/orders/${current._id}/status`, { status: 'CANCELLED', cancelReason: 'Customer cancel' })).status, 409);
    } finally { keys.forEach(key => { if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]; }); }
  });

  let shift, handoverId;
  await t.test('failed PRESENT close rolls back attendance and handover together', async () => {
    shift = await WorkSchedule.create({ user: cashier._id, workDate: new Date(), shiftName: 'FINAL', status: 'PRESENT', checkInTime: new Date(Date.now() - 60000), startingCash: 100000 });
    const order = await Order.create({ orderCode: 'FINAL-CASH', orderType: 'DINE_IN', totalAmount: 45000, finalAmount: 45000, cashier: cashier._id });
    await Payment.create({ order: order._id, amount: 45000, paymentMethod: 'CASH', status: 'SUCCESS', paidAt: new Date(), receivedBy: cashier._id });
    const write = Handover.findOneAndUpdate;
    try { Handover.findOneAndUpdate = async () => { throw new Error('Injected handover failure'); }; assert.equal((await request('POST', `/api/shift-handovers/${shift._id}/confirm`, { actualCash: 145000 }, cashier)).status, 500); }
    finally { Handover.findOneAndUpdate = write; }
    assert.equal((await WorkSchedule.findById(shift._id)).status, 'PRESENT');
    assert.equal((await WorkSchedule.findById(shift._id)).checkOutTime, undefined);
    assert.equal(await Handover.countDocuments({ schedule: shift._id }), 0);
  });
  await t.test('PRESENT close commits COMPLETED and a SUBMITTED cash snapshot together', async () => {
    const result = await request('POST', `/api/shift-handovers/${shift._id}/confirm`, { actualCash: 145000 }, cashier);
    assert.equal(result.status, 200, JSON.stringify(result.data)); handoverId = result.data.handoverId;
    assert.equal(result.data.expectedCash, 145000); assert.equal(result.data.status, 'SUBMITTED');
    assert.equal((await WorkSchedule.findById(shift._id)).status, 'COMPLETED');
    assert.equal((await Handover.findById(handoverId)).history.length, 1);
  });
  await t.test('concurrent review accepts one decision and preserves rejection/resubmission history', async () => {
    const results = await Promise.all([1, 2].map(() => request('POST', `/api/shift-handovers/${handoverId}/review`, { action: 'REJECT', reviewerNote: 'Check count' }, admin)));
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    assert.equal((await request('POST', `/api/shift-handovers/${handoverId}/resubmit`, { note: 'Explanation' }, foreign)).status, 403);
    assert.equal((await request('POST', `/api/shift-handovers/${handoverId}/resubmit`, { note: 'Recounted', actualCash: 146000 }, cashier)).status, 200);
    assert.equal((await request('POST', `/api/shift-handovers/${handoverId}/review`, { action: 'CONFIRM' }, admin)).status, 200);
    const saved = await Handover.findById(handoverId);
    assert.deepEqual(saved.history.map(h => h.action), ['SUBMIT', 'REJECT', 'RESUBMIT', 'CONFIRM']);
    assert.equal(saved.history[0].actualCash, 145000); assert.equal(saved.actualCash, 146000);
    assert.equal((await WorkSchedule.findById(shift._id)).endingCashActual, 146000);
  });
  await t.test('unsupported transactions fail before executing business writes', async () => {
    const adminCommand = mongoose.connection.db.admin;
    let executed = false;
    try {
      mongoose.connection.db.admin = () => ({ command: async () => ({ ok: 1, logicalSessionTimeoutMinutes: 30 }) });
      await assert.rejects(runWithTransaction(async () => { executed = true; }), error => error.status === 503);
      assert.equal(executed, false);
    } finally { mongoose.connection.db.admin = adminCommand; }
  });
  await t.test('COD remittance uses collection time and claims each payment only once', async () => {
    const start = new Date(Date.now() - 60000);
    const first = await WorkSchedule.create({ user: shipper._id, workDate: new Date(), shiftName: 'COD-A', status: 'PRESENT', checkInTime: start });
    const second = await WorkSchedule.create({ user: shipper._id, workDate: new Date(), shiftName: 'COD-B', status: 'PRESENT', checkInTime: start });
    const order = await Order.create({ orderCode: 'COD-OLD-ORDER', orderType: 'ONLINE', paymentMethod: 'COD', status: 'COMPLETED', shipper: shipper._id, totalAmount: 45000, finalAmount: 63000, createdAt: new Date('2025-01-01') });
    const payment = await Payment.create({ order: order._id, paymentMethod: 'CASH', status: 'SUCCESS', receivedBy: shipper._id, paidAt: new Date(), amount: 63000 });
    const result = await request('PUT', `/api/work-schedules/${first._id}/shift-action`, { action: 'REMIT_COD', cash: 63000 }, shipper);
    assert.equal(result.status, 200, JSON.stringify(result.data)); assert.equal(result.data.expectedCash, 63000);
    assert.ok((await Payment.findById(payment._id)).remittanceId);
    const again = await request('PUT', `/api/work-schedules/${second._id}/shift-action`, { action: 'REMIT_COD', cash: 0 }, shipper);
    assert.equal(again.status, 200); assert.equal(again.data.expectedCash, 0);
    assert.equal((await Payment.findById(payment._id)).remittanceSchedule.toString(), first._id.toString());
    assert.equal((await request('POST', `/api/work-schedules/${first._id}/confirm-cod`, { cash: 63000 }, shipper)).status, 403);
    assert.equal((await request('POST', `/api/work-schedules/${first._id}/confirm-cod`, { cash: 63000 }, cashier)).status, 409);
    const cashierShift = await WorkSchedule.create({ user: cashier._id, workDate: new Date(), shiftName: 'COD-RECEIVE', status: 'PRESENT', checkInTime: start, startingCash: 100000 });
    const pending = await request('GET', '/api/work-schedules/cod-remittances', null, cashier);
    assert.equal(pending.status, 200);
    assert.ok(pending.data.some(row => row._id === String(first._id)));
    assert.equal((await request('POST', `/api/work-schedules/${first._id}/confirm-cod`, { cash: 62000 }, cashier)).status, 400);
    const received = await request('POST', `/api/work-schedules/${first._id}/confirm-cod`, { cash: 63000 }, cashier);
    assert.equal(received.status, 200, JSON.stringify(received.data));
    assert.equal(received.data.codReceivingSchedule, String(cashierShift._id));
    assert.equal((await request('POST', `/api/work-schedules/${first._id}/confirm-cod`, { cash: 63000 }, cashier)).status, 409);
    const preview = await request('GET', `/api/shift-handovers/${cashierShift._id}`, null, cashier);
    assert.equal(preview.data.codReceipts, 63000);
    assert.equal(preview.data.expectedCash, 100000 + preview.data.cashRevenue + 63000);
    const closed = await request('POST', `/api/shift-handovers/${cashierShift._id}/confirm`, { actualCash: preview.data.expectedCash }, cashier);
    assert.equal(closed.status, 200, JSON.stringify(closed.data));
    assert.equal(closed.data.codReceipts, 63000);
  });
  await t.test('callback versus replacement leaves a single consistent payment outcome', async () => {
    const raceSession = randomUUID();
    const placed = await request('POST', '/api/orders', input({ checkoutSessionId: raceSession, pointsToRedeem: 0, expectedTotal: 63000 }));
    assert.equal(placed.status, 201);
    const payment = await Payment.findOne({ order: placed.data._id });
    const keys = ['PAYMENT_GATEWAY_URL', 'PAYMENT_CALLBACK_SECRET', 'PAYMENT_BANK_ID', 'PAYMENT_ACCOUNT_NO', 'PAYMENT_ACCOUNT_NAME'];
    const old = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    keys.forEach(key => { process.env[key] = key === 'PAYMENT_GATEWAY_URL' ? 'https://fixture.invalid' : 'fixture'; });
    try {
      const body = { orderCode: placed.data.orderCode, transactionCode: payment.transactionCode, amount: 63000, status: 'SUCCESS' };
      body.signature = createHmac('sha256', 'fixture').update(`${body.orderCode}|${body.transactionCode}|63000|SUCCESS`).digest('hex');
      const results = await Promise.all([request('POST', '/api/payments/callback', body, null), request('POST', '/api/orders', input({ checkoutSessionId: raceSession, pointsToRedeem: 0, expectedTotal: 63000 }))]);
      assert.ok(results.every(result => [200, 201, 409].includes(result.status)), JSON.stringify(results));
      const saved = await Order.findById(placed.data._id);
      const paid = await Payment.findById(payment._id);
      if (saved.status === 'CANCELLED') { assert.equal(paid.status, 'FAILED'); assert.equal(await Loyalty.countDocuments({ order: saved._id, transactionType: 'EARN' }), 0); }
      else { assert.equal(saved.status, 'CONFIRMED'); assert.equal(paid.status, 'SUCCESS'); assert.equal(await Loyalty.countDocuments({ order: saved._id, transactionType: 'EARN' }), 1); }
    } finally { keys.forEach(key => { if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]; }); }
  });
});
