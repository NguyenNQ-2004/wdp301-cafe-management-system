const express = require('express');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const User = require('../models/User');
const WorkSchedule = require('../models/WorkSchedule');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();
const isCashier = (user) => user.role === 'STAFF' && ['CASHIER', 'MANAGER'].includes(user.position);
router.use(protect, (req, res, next) => {
  if (req.user.role !== 'ADMIN' && !isCashier(req.user)) return res.status(403).json({ message: 'Chỉ thu ngân, quản lý hoặc Admin được xem bàn giao ca.' });
  next();
});

const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
const parseDay = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw badRequest('Ngày phải có định dạng YYYY-MM-DD.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw badRequest('Ngày không hợp lệ.');
  return date;
};
const handleError = (error, res) => res.status(error.status || (error.name === 'ValidationError' ? 400 : 500)).json({ message: error.message });
const canClose = (schedule) => schedule.status === 'COMPLETED' && !!schedule.checkInTime && !!schedule.checkOutTime && !schedule.handoverAt;

const cashLedger = async (schedule) => {
  const payments = await Payment.find({
    status: 'SUCCESS', paymentMethod: 'CASH',
    paidAt: { $gte: schedule.checkInTime, $lte: schedule.checkOutTime }
  }).select('order amount receivedBy').populate('order', 'orderType');
  const result = { cashRevenue: 0, paymentCount: 0, unattributedCash: 0, unattributedCount: 0 };
  for (const payment of payments) {
    if (!payment.order || !['TAKEAWAY', 'DINE_IN'].includes(payment.order.orderType)) continue;
    if (!Number.isSafeInteger(payment.amount) || payment.amount < 0) throw Object.assign(new Error('Có giao dịch tiền mặt không hợp lệ; cần kiểm tra trước khi bàn giao.'), { status: 409 });
    if (String(payment.receivedBy) === String(schedule.user)) {
      result.cashRevenue += payment.amount;
      result.paymentCount += 1;
    } else if (!payment.receivedBy) {
      result.unattributedCash += payment.amount;
      result.unattributedCount += 1;
    }
    if (!Number.isSafeInteger(result.cashRevenue) || !Number.isSafeInteger(result.unattributedCash)) throw Object.assign(new Error('Tổng giao dịch tiền mặt vượt giới hạn cho phép.'), { status: 409 });
  }
  return result;
};

const detail = (schedule, ledger) => {
  const saved = !!schedule.handoverAt;
  const openingCash = Number.isSafeInteger(schedule.startingCash) && schedule.startingCash >= 0 ? schedule.startingCash : null;
  const cashRevenue = saved ? schedule.handoverCashSales : ledger?.cashRevenue ?? 0;
  const expectedCash = saved ? schedule.endingCashSystem : openingCash === null ? null : openingCash + cashRevenue;
  const actualCash = saved ? schedule.endingCashActual : null;
  return {
    schedule: {
      _id: schedule._id, user: schedule.user, workDate: schedule.workDate, shiftName: schedule.shiftName,
      status: schedule.status, checkInTime: schedule.checkInTime, checkOutTime: schedule.checkOutTime
    },
    ready: canClose(schedule),
    handedOver: saved,
    handoverAt: schedule.handoverAt || null,
    openingCash,
    cashRevenue,
    paymentCount: saved ? schedule.handoverPaymentCount : ledger?.paymentCount ?? 0,
    unattributedCash: saved ? schedule.handoverUnattributedCash : ledger?.unattributedCash ?? 0,
    unattributedCount: saved ? schedule.handoverUnattributedCount : ledger?.unattributedCount ?? 0,
    expectedCash,
    actualCash,
    difference: saved ? actualCash - expectedCash : null,
    note: saved ? schedule.handoverNote || '' : ''
  };
};

const findSchedule = async (id, user) => {
  if (!mongoose.isValidObjectId(id)) throw badRequest('Mã ca làm không hợp lệ.');
  const schedule = await WorkSchedule.findById(id).populate('user', 'fullName phone position role');
  if (!schedule) return null;
  if (user.role === 'STAFF' && String(schedule.user?._id) !== String(user._id)) return false;
  if (!schedule.user || schedule.user.role !== 'STAFF' || !['CASHIER', 'MANAGER'].includes(schedule.user.position)) return false;
  return schedule;
};

router.get('/', async (req, res) => {
  try {
    const from = parseDay(req.query.from);
    const to = parseDay(req.query.to);
    const days = Math.round((to.getTime() - from.getTime()) / 86400000);
    if (days < 0 || days > 30) throw badRequest('Khoảng xem bàn giao phải từ 1 đến 31 ngày.');
    const after = new Date(to);
    after.setUTCDate(after.getUTCDate() + 1);
    const filter = { workDate: { $gte: from, $lt: after } };
    if (req.user.role === 'STAFF') filter.user = req.user._id;
    else {
      const cashierIds = await User.distinct('_id', { role: 'STAFF', position: { $in: ['CASHIER', 'MANAGER'] } });
      filter.user = { $in: cashierIds };
      if (req.query.userId !== undefined) {
        if (!mongoose.isValidObjectId(req.query.userId)) throw badRequest('Mã nhân viên không hợp lệ.');
        filter.user = cashierIds.find((id) => String(id) === req.query.userId) || { $in: [] };
      }
    }
    const schedules = await WorkSchedule.find(filter)
      .select('user workDate shiftName status checkInTime checkOutTime handoverAt')
      .populate('user', 'fullName phone position')
      .sort({ workDate: -1, shiftName: 1 });
    res.json(schedules);
  } catch (error) { handleError(error, res); }
});

router.get('/:id', async (req, res) => {
  try {
    const schedule = await findSchedule(req.params.id, req.user);
    if (schedule === null) return res.status(404).json({ message: 'Không tìm thấy ca làm.' });
    if (schedule === false) return res.status(403).json({ message: 'Không được xem bàn giao ca này.' });
    const ledger = canClose(schedule) ? await cashLedger({ ...schedule.toObject(), user: schedule.user._id }) : null;
    res.json(detail(schedule, ledger));
  } catch (error) { handleError(error, res); }
});

router.post('/:id/confirm', async (req, res) => {
  try {
    if (!isCashier(req.user)) return res.status(403).json({ message: 'Chỉ nhân viên thu ngân hoặc quản lý được bàn giao ca của mình.' });
    const schedule = await findSchedule(req.params.id, req.user);
    if (schedule === null) return res.status(404).json({ message: 'Không tìm thấy ca làm.' });
    if (schedule === false) return res.status(403).json({ message: 'Chỉ được bàn giao ca của mình.' });
    if (!canClose(schedule)) return res.status(409).json({ message: 'Cần check-in và check-out trước khi bàn giao; ca đã bàn giao không thể sửa.' });
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((key) => !['actualCash', 'openingCash', 'note'].includes(key))) throw badRequest('Dữ liệu bàn giao không hợp lệ.');
    if (!Number.isSafeInteger(body.actualCash) || body.actualCash < 0) throw badRequest('Tiền thực tế phải là số nguyên không âm.');
    const hasOpening = Number.isSafeInteger(schedule.startingCash) && schedule.startingCash >= 0;
    if (hasOpening && body.openingCash !== undefined) throw badRequest('Tiền đầu ca đã được ghi nhận khi check-in.');
    if (!hasOpening && (!Number.isSafeInteger(body.openingCash) || body.openingCash < 0)) throw badRequest('Cần nhập số tiền đầu ca.');
    if (body.note !== undefined && (typeof body.note !== 'string' || body.note.trim().length > 500)) throw badRequest('Ghi chú không được quá 500 ký tự.');
    const openingCash = hasOpening ? schedule.startingCash : body.openingCash;
    const ledger = await cashLedger({ ...schedule.toObject(), user: req.user._id });
    const expectedCash = openingCash + ledger.cashRevenue;
    if (!Number.isSafeInteger(expectedCash)) throw badRequest('Tổng tiền hệ thống không hợp lệ.');
    if (body.actualCash !== expectedCash && !body.note?.trim()) throw badRequest('Cần ghi lý do khi tiền thực tế chênh lệch với hệ thống.');
    const updated = await WorkSchedule.findOneAndUpdate(
      { _id: schedule._id, user: req.user._id, status: 'COMPLETED', handoverAt: { $exists: false }, checkInTime: { $exists: true }, checkOutTime: { $exists: true } },
      { $set: {
        startingCash: openingCash, endingCashSystem: expectedCash, endingCashActual: body.actualCash,
        handoverCashSales: ledger.cashRevenue, handoverPaymentCount: ledger.paymentCount,
        handoverUnattributedCash: ledger.unattributedCash, handoverUnattributedCount: ledger.unattributedCount,
        handoverAt: new Date(), handoverNote: body.note?.trim() || ''
      } }, { returnDocument: 'after', runValidators: true }
    ).populate('user', 'fullName phone position role');
    if (!updated) return res.status(409).json({ message: 'Ca đã được bàn giao. Vui lòng tải lại.' });
    res.json(detail(updated));
  } catch (error) { handleError(error, res); }
});

module.exports = router;
