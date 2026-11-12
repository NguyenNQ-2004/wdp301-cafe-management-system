const express = require('express');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const User = require('../models/User');
const WorkSchedule = require('../models/WorkSchedule');
const ShiftHandover = require('../models/ShiftHandover');
const { attachShiftInfo } = require('../utils/weeklyShifts');
const { protect } = require('../middlewares/authMiddleware');

const { atomicRouter } = require('../utils/atomicRoute');
const router = atomicRouter(express.Router());
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
const handleError = (error, res) => res.status(error.status || (error.name === 'VersionError' || error.code === 11000 || error.hasErrorLabel?.('TransientTransactionError') ? 409 : error.name === 'ValidationError' ? 400 : 500)).json({ message: error.message });
const canClose = (schedule) => !!schedule.checkInTime && !schedule.handoverAt && ((schedule.status === 'PRESENT' && !schedule.checkOutTime) || (schedule.status === 'COMPLETED' && !!schedule.checkOutTime));

const cashLedger = async (schedule) => {
  const endTime = schedule.checkOutTime || new Date();
  const startTime = schedule.checkInTime || schedule.workDate;
  const payments = await Payment.find({
    status: { $in: ['SUCCESS', 'REFUNDED'] },
    paidAt: { $gte: startTime, $lte: endTime }
  }).select('order amount paymentMethod receivedBy').populate('order', 'orderType cashier');

  const methods = {
    CASH: { count: 0, sales: 0 },
    BANK_TRANSFER: { count: 0, sales: 0 },
    VNPAY: { count: 0, sales: 0 },
    MOMO: { count: 0, sales: 0 }
  };
  const result = {
    cashRevenue: 0,
    cashRefunds: 0,
    codReceipts: 0,
    paymentCount: 0,
    unattributedCash: 0,
    unattributedCount: 0,
    nonCashSales: 0,
    totalSales: 0,
    orderCount: 0,
    methods
  };
  const orderIds = new Set();
  for (const payment of payments) {
    if (!payment.order || !['TAKEAWAY', 'DINE_IN'].includes(payment.order.orderType)) continue;
    if (!Number.isSafeInteger(payment.amount) || payment.amount < 0) throw Object.assign(new Error('Có giao dịch tiền mặt không hợp lệ; cần kiểm tra trước khi bàn giao.'), { status: 409 });
    // A later refund does not remove the original physical cash receipt.
    const isShiftUser = String(payment.receivedBy) === String(schedule.user);
    if (isShiftUser) {
      orderIds.add(String(payment.order._id || payment.order));
      const methodKey = ['CASH', 'BANK_TRANSFER', 'VNPAY', 'MOMO'].includes(payment.paymentMethod) ? payment.paymentMethod : 'CASH';
      methods[methodKey].count += 1;
      methods[methodKey].sales += payment.amount;
      result.totalSales += payment.amount;
      if (payment.paymentMethod === 'CASH') {
        result.cashRevenue += payment.amount;
        result.paymentCount += 1;
      } else {
        result.nonCashSales += payment.amount;
      }
    } else if (!payment.receivedBy && payment.paymentMethod === 'CASH') {
      result.unattributedCash += payment.amount;
      result.unattributedCount += 1;
    }
  }
  result.orderCount = orderIds.size;
  const refunds = await Payment.find({ status: 'REFUNDED', refundMethod: 'CASH', refundSchedule: schedule._id }).select('refundAmount');
  result.cashRefunds = refunds.reduce((sum, payment) => sum + payment.refundAmount, 0);
  if (!Number.isSafeInteger(result.cashRefunds) || result.cashRefunds < 0) throw Object.assign(new Error('Số tiền hoàn trong ca không hợp lệ.'), { status: 409 });
  const codShifts = await WorkSchedule.find({ codReceivingSchedule: schedule._id, codReceivedBy: schedule.user, codReceivedAt: { $gte: startTime, $lte: endTime } }).select('codReceivedAmount');
  result.codReceipts = codShifts.reduce((total, shift) => total + shift.codReceivedAmount, 0);
  if (!Number.isSafeInteger(result.codReceipts) || result.codReceipts < 0) throw Object.assign(new Error('Tiền COD nhận trong ca không hợp lệ.'), { status: 409 });
  if (!Number.isSafeInteger(result.cashRevenue) || !Number.isSafeInteger(result.unattributedCash)) throw Object.assign(new Error('Tổng giao dịch tiền mặt vượt giới hạn cho phép.'), { status: 409 });
  return result;
};

const detail = (schedule, ledger, handover = null) => {
  const saved = !!schedule.handoverAt;
  const openingCash = Number.isSafeInteger(schedule.startingCash) && schedule.startingCash >= 0 ? schedule.startingCash : null;
  const cashRevenue = saved ? schedule.handoverCashSales : ledger?.cashRevenue ?? 0;
  const codReceipts = saved ? (schedule.handoverCodReceipts ?? 0) : (ledger?.codReceipts ?? 0);
  const cashRefunds = saved ? (schedule.handoverCashRefunds ?? 0) : (ledger?.cashRefunds ?? 0);
  const expectedCash = saved ? schedule.endingCashSystem : openingCash === null ? null : openingCash + cashRevenue + codReceipts - cashRefunds;
  const actualCash = saved ? schedule.endingCashActual : null;
  const status = handover?.status || (saved ? 'SUBMITTED' : null);

  return {
    schedule: {
      _id: schedule._id, user: schedule.user, workDate: schedule.workDate, shiftName: schedule.shiftName,
      shiftInfo: schedule.shiftInfo, status: schedule.status, checkInTime: schedule.checkInTime, checkOutTime: schedule.checkOutTime
    },
    ready: canClose(schedule),
    handedOver: saved,
    handoverAt: schedule.handoverAt || null,
    status,
    handoverId: handover?._id || null,
    reviewedBy: handover?.reviewedBy || null,
    reviewedAt: handover?.reviewedAt || null,
    reviewerNote: handover?.reviewerNote || null,
    resubmittedAt: handover?.resubmittedAt || null,
    revision: handover?.revision || 0,
    history: handover?.history || [],
    openingCash,
    cashRevenue,
    cashRefunds,
    codReceipts,
    paymentCount: saved ? schedule.handoverPaymentCount : ledger?.paymentCount ?? 0,
    unattributedCash: saved ? schedule.handoverUnattributedCash : ledger?.unattributedCash ?? 0,
    unattributedCount: saved ? schedule.handoverUnattributedCount : ledger?.unattributedCount ?? 0,
    expectedCash,
    actualCash,
    difference: saved ? actualCash - expectedCash : null,
    note: saved ? (handover?.note ?? schedule.handoverNote ?? '') : '',
    summary: {
      cashSales: cashRevenue,
      codReceipts,
      paymentCount: saved ? schedule.handoverPaymentCount : ledger?.paymentCount ?? 0,
      nonCashSales: ledger?.nonCashSales ?? 0,
      totalSales: (saved ? schedule.handoverCashSales : (ledger?.cashRevenue ?? 0)) + (ledger?.nonCashSales ?? 0),
      successfulOrderCount: ledger?.orderCount ?? (saved ? schedule.handoverPaymentCount : 0),
      methods: ledger?.methods ?? {
        CASH: { count: saved ? schedule.handoverPaymentCount : 0, sales: cashRevenue },
        BANK_TRANSFER: { count: 0, sales: 0 },
        VNPAY: { count: 0, sales: 0 },
        MOMO: { count: 0, sales: 0 }
      }
    }
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
      .select('user workDate shiftName status checkInTime checkOutTime handoverAt startingCash endingCashSystem endingCashActual handoverCashSales handoverCodReceipts handoverPaymentCount handoverNote')
      .populate('user', 'fullName phone position')
      .sort({ workDate: -1, shiftName: 1 });

    const scheduleIds = schedules.map(s => s._id);
    const handovers = await ShiftHandover.find({ schedule: { $in: scheduleIds } })
      .populate('reviewedBy', 'fullName phone');
    const handoverMap = new Map(handovers.map(h => [String(h.schedule), h]));

    const schedulesWithShift = await attachShiftInfo(schedules);
    const response = schedulesWithShift.map(obj => {
      const h = handoverMap.get(String(obj._id));
      obj.handoverStatus = h?.status || (obj.handoverAt ? 'SUBMITTED' : null);
      obj.handoverDoc = h || null;
      obj.reviewerNote = h?.reviewerNote || null;
      obj.reviewedBy = h?.reviewedBy || null;
      obj.reviewedAt = h?.reviewedAt || null;
      obj.resubmittedAt = h?.resubmittedAt || null;
      return obj;
    });

    res.json(response);
  } catch (error) { handleError(error, res); }
});

router.get('/:id', async (req, res) => {
  try {
    const schedule = await findSchedule(req.params.id, req.user);
    if (schedule === null) return res.status(404).json({ message: 'Không tìm thấy ca làm.' });
    if (schedule === false) return res.status(403).json({ message: 'Không được xem bàn giao ca này.' });
    const [enriched] = await attachShiftInfo([schedule]);
    const ledger = (canClose(schedule) || schedule.status === 'PRESENT' || !!schedule.handoverAt) ? await cashLedger({ ...schedule.toObject(), user: schedule.user._id }) : null;
    const handover = await ShiftHandover.findOne({ schedule: schedule._id }).populate('reviewedBy', 'fullName phone');
    res.json(detail(enriched, ledger, handover));
  } catch (error) { handleError(error, res); }
});

router.post('/:id/confirm', async (req, res) => {
  try {
    if (!isCashier(req.user)) return res.status(403).json({ message: 'Chỉ nhân viên thu ngân hoặc quản lý được bàn giao ca của mình.' });
    const schedule = await findSchedule(req.params.id, req.user);
    if (schedule === null) return res.status(404).json({ message: 'Không tìm thấy ca làm.' });
    if (schedule === false) return res.status(403).json({ message: 'Chỉ được bàn giao ca của mình.' });
    if (!canClose(schedule)) return res.status(409).json({ message: 'Cần ca đã check-in và chưa bàn giao. Ca đã bàn giao không thể sửa.' });
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((key) => !['actualCash', 'openingCash', 'note'].includes(key))) throw badRequest('Dữ liệu bàn giao không hợp lệ.');
    if (!Number.isSafeInteger(body.actualCash) || body.actualCash < 0) throw badRequest('Tiền thực tế phải là số nguyên không âm.');
    const hasOpening = Number.isSafeInteger(schedule.startingCash) && schedule.startingCash >= 0;
    if (hasOpening && body.openingCash !== undefined) throw badRequest('Tiền đầu ca đã được ghi nhận khi check-in.');
    if (!hasOpening && (!Number.isSafeInteger(body.openingCash) || body.openingCash < 0)) throw badRequest('Cần nhập số tiền đầu ca.');
    if (body.note !== undefined && (typeof body.note !== 'string' || body.note.trim().length > 500)) throw badRequest('Ghi chú không được quá 500 ký tự.');
    const openingCash = hasOpening ? schedule.startingCash : body.openingCash;
    const ledger = await cashLedger({ ...schedule.toObject(), user: req.user._id });
    const expectedCash = openingCash + ledger.cashRevenue + ledger.codReceipts - ledger.cashRefunds;
    if (!Number.isSafeInteger(expectedCash)) throw badRequest('Tổng tiền hệ thống không hợp lệ.');
    if (body.actualCash !== expectedCash && !body.note?.trim()) throw badRequest('Cần ghi lý do khi tiền thực tế chênh lệch với hệ thống.');
    const updated = await WorkSchedule.findOneAndUpdate(
      { _id: schedule._id, user: req.user._id, status: schedule.status, codLedgerVersion: schedule.codLedgerVersion ? schedule.codLedgerVersion : { $in: [null, 0] }, handoverAt: { $exists: false }, checkInTime: { $exists: true }, ...(schedule.status === 'PRESENT' ? { checkOutTime: { $exists: false } } : { checkOutTime: schedule.checkOutTime }) },
      { $set: {
        status: 'COMPLETED', checkOutTime: schedule.checkOutTime || new Date(),
        startingCash: openingCash, endingCashSystem: expectedCash, endingCashActual: body.actualCash,
        handoverCashSales: ledger.cashRevenue, handoverCodReceipts: ledger.codReceipts, handoverCashRefunds: ledger.cashRefunds, handoverPaymentCount: ledger.paymentCount,
        handoverUnattributedCash: ledger.unattributedCash, handoverUnattributedCount: ledger.unattributedCount,
        handoverAt: new Date(), handoverNote: body.note?.trim() || ''
      } }, { returnDocument: 'after', runValidators: true }
    ).populate('user', 'fullName phone position role');
    if (!updated) return res.status(409).json({ message: 'Ca đã được bàn giao. Vui lòng tải lại.' });

    const handover = await ShiftHandover.findOneAndUpdate(
      { schedule: updated._id },
      {
        $set: {
          cashier: req.user._id,
          workDate: updated.workDate,
          shiftName: updated.shiftName,
          checkInTime: updated.checkInTime,
          checkOutTime: updated.checkOutTime,
          openingCash,
          cashSales: ledger.cashRevenue,
          codReceipts: ledger.codReceipts,
          cashRefunds: ledger.cashRefunds,
          expectedCash,
          actualCash: body.actualCash,
          difference: body.actualCash - expectedCash,
          note: body.note?.trim() || '',
          status: 'SUBMITTED'
        },
        $push: { history: { action: 'SUBMIT', actor: req.user._id, at: new Date(), toStatus: 'SUBMITTED', note: body.note?.trim() || '', actualCash: body.actualCash, expectedCash } }
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );

    const [enriched] = await attachShiftInfo([updated]);
    res.json(detail(enriched, ledger, handover));
  } catch (error) { handleError(error, res); }
});

// Admin review: CONFIRM or REJECT
router.post('/:id/review', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Chỉ Admin mới có quyền duyệt hoặc từ chối biên bản bàn giao.' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) throw badRequest('Mã biên bản/ca làm không hợp lệ.');
    let handover = await ShiftHandover.findOne({
      $or: [{ _id: req.params.id }, { schedule: req.params.id }]
    }).populate('cashier', 'fullName phone position');
    if (!handover) return res.status(404).json({ message: 'Không tìm thấy biên bản bàn giao.' });
    if (handover.status !== 'SUBMITTED') {
      return res.status(409).json({ message: 'Chỉ có thể duyệt hoặc từ chối biên bản đang ở trạng thái chờ duyệt (SUBMITTED).' });
    }
    const { action, reviewerNote } = req.body || {};
    if (reviewerNote !== undefined && (typeof reviewerNote !== 'string' || reviewerNote.trim().length > 500)) throw badRequest('Ghi chú duyệt tối đa 500 ký tự.');
    if (!['CONFIRM', 'REJECT'].includes(action)) {
      throw badRequest('Hành động không hợp lệ (CONFIRM hoặc REJECT).');
    }
    if (action === 'REJECT') {
      if (!reviewerNote || typeof reviewerNote !== 'string' || !reviewerNote.trim()) {
        throw badRequest('Cần nhập lý do từ chối biên bản bàn giao.');
      }
      if (reviewerNote.trim().length > 500) {
        throw badRequest('Lý do từ chối không được vượt quá 500 ký tự.');
      }
      handover.status = 'REJECTED';
      handover.reviewerNote = reviewerNote.trim();
    } else {
      handover.status = 'CONFIRMED';
      if (reviewerNote && typeof reviewerNote === 'string') {
        handover.reviewerNote = reviewerNote.trim();
      }
    }
    handover.reviewedBy = req.user._id;
    handover.reviewedAt = new Date();
    handover.history.push({ action, actor: req.user._id, at: handover.reviewedAt, fromStatus: 'SUBMITTED', toStatus: handover.status, note: handover.reviewerNote || '', actualCash: handover.actualCash, expectedCash: handover.expectedCash });
    handover.revision += 1;
    await handover.save();
    await handover.populate('reviewedBy', 'fullName phone');
    res.json(handover);
  } catch (error) { handleError(error, res); }
});

// Cashier resubmit after REJECTED
router.post('/:id/resubmit', async (req, res) => {
  try {
    if (!isCashier(req.user)) {
      return res.status(403).json({ message: 'Chỉ nhân viên thu ngân hoặc quản lý được gửi lại giải trình biên bản.' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) throw badRequest('Mã biên bản/ca làm không hợp lệ.');
    let handover = await ShiftHandover.findOne({
      $or: [{ _id: req.params.id }, { schedule: req.params.id }]
    });
    if (!handover) return res.status(404).json({ message: 'Không tìm thấy biên bản bàn giao.' });
    if (String(handover.cashier) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Chỉ chủ ca mới có quyền gửi lại giải trình biên bản của mình.' });
    }
    if (handover.status !== 'REJECTED') {
      return res.status(409).json({ message: 'Chỉ có thể gửi lại biên bản đang bị từ chối (REJECTED).' });
    }
    const { note, actualCash } = req.body || {};
    if (!note || typeof note !== 'string' || !note.trim()) {
      throw badRequest('Cần nhập nội dung giải trình bổ sung khi gửi lại biên bản.');
    }
    if (note.trim().length > 500) {
      throw badRequest('Nội dung giải trình không được vượt quá 500 ký tự.');
    }
    if (actualCash !== undefined) {
      if (!Number.isSafeInteger(actualCash) || actualCash < 0) {
        throw badRequest('Tiền thực tế phải là số nguyên không âm.');
      }
      handover.actualCash = actualCash;
      handover.difference = actualCash - handover.expectedCash;
      await WorkSchedule.updateOne({ _id: handover.schedule }, { $set: { endingCashActual: actualCash, handoverNote: note.trim() } });
    } else {
      await WorkSchedule.updateOne({ _id: handover.schedule }, { $set: { handoverNote: note.trim() } });
    }
    handover.note = note.trim();
    handover.status = 'SUBMITTED';
    handover.resubmittedAt = new Date();
    handover.history.push({ action: 'RESUBMIT', actor: req.user._id, at: handover.resubmittedAt, fromStatus: 'REJECTED', toStatus: 'SUBMITTED', note: note.trim(), actualCash: handover.actualCash, expectedCash: handover.expectedCash });
    handover.revision += 1;
    await handover.save();
    await handover.populate('cashier', 'fullName phone position');
    res.json(handover);
  } catch (error) { handleError(error, res); }
});

module.exports = router;
