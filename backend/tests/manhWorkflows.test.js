const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../server');
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const WorkSchedule = require('../models/WorkSchedule');
const InventoryTransaction = require('../models/InventoryTransaction');
const Ingredient = require('../models/Ingredient');

test('Manh delivery acceptance, persisted issues and order guards', async t => {
  const dbName = `aura_manh_test_${randomBytes(6).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI, { dbName, serverSelectionTimeoutMS: 5000 });
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); assert.match(mongoose.connection.db.databaseName, /^aura_manh_test_/); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  const [admin, shipper, other, cashier] = await User.create([
    { fullName: 'Admin', phone: '0900100001', passwordHash: 'fixture', role: 'ADMIN' },
    { fullName: 'Shipper', phone: '0900100002', passwordHash: 'fixture', role: 'STAFF', position: 'SHIPPER' },
    { fullName: 'Other', phone: '0900100003', passwordHash: 'fixture', role: 'STAFF', position: 'SHIPPER' },
    { fullName: 'Cashier', phone: '0900100004', passwordHash: 'fixture', role: 'STAFF', position: 'CASHIER' }
  ]);
  for (const user of [shipper, other, cashier]) await WorkSchedule.create({ user: user._id, workDate: new Date(), shiftName: 'AUDIT', status: 'PRESENT', checkInTime: new Date(Date.now() - 60000) });
  const request = async (path, body, user = admin, method = 'PUT') => {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign({ id: user._id }, require('../config/jwtSecret')())}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const text = await res.text();
    return { status: res.status, data: res.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : { message: text } };
  };
  let n = 0;
  const order = async (extra = {}) => { const o = await Order.create({ orderCode: `MANH-${++n}`, orderType: 'ONLINE', status: 'READY', paymentMethod: 'COD', totalAmount: 30000, finalAmount: 30000, ...extra }); await Payment.create({ order: o._id, amount: 30000, status: 'PENDING', paymentMethod: 'CASH' }); return o; };
  await t.test('assigned shipper accepts before pickup and every stage is persisted', async () => {
    const o = await order(); const path = `/api/orders/${o._id}`;
    assert.equal((await request(`${path}/status`, { status: 'READY', shipperId: String(shipper._id) })).status, 200);
    assert.equal((await request(`${path}/status`, { status: 'DELIVERING' }, shipper)).status, 409);
    assert.equal((await request(`${path}/delivery/accept`, {}, other, 'POST')).status, 403);
    const accepted = await request(`${path}/delivery/accept`, {}, shipper, 'POST');
    assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
    assert.equal((await request(`${path}/status`, { status: 'DELIVERING' }, shipper)).status, 200);
    assert.equal((await request(`${path}/status`, { status: 'READY', shipperId: null })).status, 409);
    assert.equal((await request(`${path}/status`, { status: 'COMPLETED', collectedAmount: 30000 }, shipper)).status, 200);
    const saved = (await Order.findById(o._id)).delivery;
    assert.equal(saved.status, 'DELIVERED'); assert.ok(saved.acceptedAt); assert.ok(saved.pickedUpAt); assert.ok(saved.deliveredAt);
    assert.equal((await request(`${path}/delivery/issues`, { issueType: 'OTHER', description: 'Late', outcome: 'REPORT' }, shipper, 'POST')).status, 409);
  });
  await t.test('same-state mutations cannot alter terminal orders', async () => {
    const o = await order({ status: 'CANCELLED', cancelReason: 'Original reason' });
    assert.equal((await request(`/api/orders/${o._id}/status`, { status: 'CANCELLED', cancelReason: 'Rewrite history' })).status, 409);
    assert.equal((await Order.findById(o._id)).cancelReason, 'Original reason');
  });
  await t.test('typed issue history survives return and reassignment without truncating customer note', async () => {
    const o = await order({ shipper: shipper._id, status: 'DELIVERING', orderNote: 'Customer instructions' });
    const path = `/api/orders/${o._id}`;
    assert.equal((await request(`${path}/delivery/issues`, { issueType: 'BAD_ADDRESS', description: 'Gate closed', outcome: 'RETURN' }, other, 'POST')).status, 403);
    const reported = await request(`${path}/delivery/issues`, { issueType: 'BAD_ADDRESS', description: 'Gate closed', outcome: 'RETURN' }, shipper, 'POST');
    assert.equal(reported.status, 201, JSON.stringify(reported.data));
    assert.equal((await Order.findById(o._id)).orderNote, 'Customer instructions');
    assert.equal((await Order.findById(o._id)).status, 'READY');
    assert.equal((await request(`${path}/status`, { status: 'READY', shipperId: String(other._id) })).status, 200);
    const history = await request('/api/delivery-issues', null, shipper, 'GET');
    assert.equal(history.status, 200); assert.equal(history.data[0].description, 'Gate closed');
    assert.equal(String(history.data[0].order._id), String(o._id));
  });
  await t.test('cannot bypass COD payment integrity when delivering legacy records', async () => {
    const o = await order({ status: 'DELIVERING', shipper: shipper._id });
    await Payment.updateOne({ order: o._id }, { $set: { amount: 1 } });
    assert.equal((await request(`/api/orders/${o._id}/status`, { status: 'COMPLETED', collectedAmount: 30000 }, shipper)).status, 409);
    assert.equal((await Order.findById(o._id)).status, 'DELIVERING');
  });
  await t.test('completed counter retries are idempotent and cashier cannot complete online orders', async () => {
    const o = await order({ status: 'COMPLETED', orderType: 'TAKEAWAY' });
    await Payment.updateOne({ order: o._id }, { $set: { status: 'SUCCESS' } });
    assert.equal((await request(`/api/orders/${o._id}/status`, { status: 'COMPLETED' }, cashier)).status, 200);
  });
  await t.test('shipper cannot clock out or remit while holding an unfinished delivery', async () => {
    const before = await WorkSchedule.findOne({ user: shipper._id });
    const checkout = await request(`/api/work-schedules/${before._id}/shift-action`, { action: 'CHECK_OUT' }, shipper);
    assert.equal(checkout.status, 409, JSON.stringify(checkout.data));
    const remit = await request(`/api/work-schedules/${before._id}/shift-action`, { action: 'REMIT_COD', cash: 30000 }, shipper);
    assert.equal(remit.status, 409, JSON.stringify(remit.data));
    assert.equal((await WorkSchedule.findById(before._id)).status, 'PRESENT');
  });
  await t.test('cash collected then refunded by bank stays in the collecting cashier drawer', async () => {
    const o = await order({ orderType: 'TAKEAWAY', paymentMethod: 'CASH', status: 'CONFIRMED', cashier: cashier._id });
    await Payment.updateOne({ order: o._id }, { $set: { status: 'SUCCESS', paidAt: new Date(), receivedBy: cashier._id } });
    const shift = await WorkSchedule.findOne({ user: cashier._id });
    await WorkSchedule.updateOne({ _id: shift._id }, { $set: { startingCash: 100000 } });
    const refund = await request(`/api/payments/order/${o._id}/refund-and-cancel`, { amount: 30000, refundMethod: 'BANK_TRANSFER', refundReference: 'BANK-REFUND', cancelReason: 'Customer cancel' }, admin, 'POST');
    assert.equal(refund.status, 200);
    const ledger = await request(`/api/shift-handovers/${shift._id}`, null, cashier, 'GET');
    assert.equal(ledger.status, 200);
    assert.equal(ledger.data.expectedCash, 130000);
  });
  await t.test('cash refund debits its actual issuing shift and preserves the original receipt', async () => {
    const issuing = await User.create({ fullName: 'Refund Cashier', phone: '0900100009', passwordHash: 'fixture', role: 'STAFF', position: 'CASHIER' });
    const shift = await WorkSchedule.create({ user: issuing._id, workDate: new Date(), shiftName: 'REFUND', status: 'PRESENT', checkInTime: new Date(Date.now() - 60000), startingCash: 100000 });
    const o = await order({ orderType: 'TAKEAWAY', status: 'CONFIRMED', cashier: cashier._id, paymentMethod: 'CASH' });
    await Payment.updateOne({ order: o._id }, { $set: { status: 'SUCCESS', paidAt: new Date(), receivedBy: cashier._id } });
    const result = await request(`/api/payments/order/${o._id}/refund-and-cancel`, { amount: 30000, refundMethod: 'CASH', refundCashierId: String(issuing._id), cancelReason: 'Returned payment' }, admin, 'POST');
    assert.equal(result.status, 200, JSON.stringify(result.data));
    const preview = await request(`/api/shift-handovers/${shift._id}`, null, issuing, 'GET');
    assert.equal(preview.data.cashRefunds, 30000); assert.equal(preview.data.expectedCash, 70000);
    const close = await request(`/api/shift-handovers/${shift._id}/confirm`, { actualCash: 70000 }, issuing, 'POST');
    assert.equal(close.status, 200); assert.equal(close.data.cashRefunds, 30000);
    assert.equal((await request(`/api/shift-handovers/${shift._id}`, null, issuing, 'GET')).data.cashRefunds, 30000);
  });
  await t.test('failed issue persistence rolls back return and keeps previous issue history', async () => {
    const o = await order({ shipper: shipper._id, status: 'DELIVERING' });
    const Issue = require('../models/DeliveryIssue');
    const before = await Issue.countDocuments();
    const save = Order.prototype.save;
    try {
      Order.prototype.save = async function () { throw new Error('Injected order write failure'); };
      const result = await request(`/api/orders/${o._id}/delivery/issues`, { issueType: 'DELAY', description: 'Traffic jam', outcome: 'RETURN' }, shipper, 'POST');
      assert.equal(result.status, 500);
    } finally { Order.prototype.save = save; }
    assert.equal(await Issue.countDocuments(), before);
    assert.equal((await Order.findById(o._id)).status, 'DELIVERING');
  });
  await t.test('remittance recovers held COD collected before the current shift', async () => {
    const courier = await User.create({ fullName: 'Legacy Courier', phone: '0900100010', passwordHash: 'fixture', role: 'STAFF', position: 'SHIPPER' });
    const shift = await WorkSchedule.create({ user: courier._id, workDate: new Date(), shiftName: 'RECOVER', status: 'PRESENT', checkInTime: new Date(Date.now() - 60000) });
    const o = await order({ shipper: courier._id, status: 'COMPLETED' });
    await Payment.updateOne({ order: o._id }, { $set: { status: 'SUCCESS', receivedBy: courier._id, paidAt: new Date(Date.now() - 120000) } });
    const result = await request(`/api/work-schedules/${shift._id}/shift-action`, { action: 'REMIT_COD', cash: 30000 }, courier);
    assert.equal(result.status, 200, JSON.stringify(result.data));
    assert.equal(result.data.expectedCash, 30000);
    assert.equal(String((await Payment.findOne({ order: o._id })).remittanceSchedule), String(shift._id));
  });
  await t.test('reports include real ingredient consumption in the selected Vietnam date range', async () => {
    const ingredient = await Ingredient.create({ name: 'Beans', unit: 'g', currentStock: 90 });
    await InventoryTransaction.create({ ingredient: ingredient._id, quantity: 10, stockDelta: -10, transactionType: 'OUT_ORDER', referenceType: 'ORDER', createdAt: new Date('2026-02-01T17:00:00Z') });
    const result = await request('/api/reports?startDate=2026-02-02&endDate=2026-02-02', null, admin, 'GET');
    assert.equal(result.status, 200);
    assert.ok(Array.isArray(result.data.ingredientUsage), 'ingredient usage is required');
    assert.equal(result.data.ingredientUsage.find(row => row.ingredientId === String(ingredient._id)).quantity, 10);
  });
});
