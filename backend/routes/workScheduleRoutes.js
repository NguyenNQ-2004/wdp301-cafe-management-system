const express = require('express');
const mongoose = require('mongoose');
const WorkSchedule = require('../models/WorkSchedule');
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const WorkShift = require('../models/WorkShift');
const { mondayOf, withWeekLock, resolveShift, attachShiftInfo } = require('../utils/weeklyShifts');
const { protect, adminOnly, authorize } = require('../middlewares/authMiddleware');

const { atomicRouter } = require('../utils/atomicRoute');
const router = atomicRouter(express.Router());
router.use(protect, authorize('ADMIN', 'STAFF'));

const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
const parseDay = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw badRequest('Ngày làm việc phải có định dạng YYYY-MM-DD.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw badRequest('Ngày làm việc không hợp lệ.');
  return date;
};
const parseAssignment = (body, creating) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Dữ liệu phân ca không hợp lệ.');
  const fields = ['userId', 'workDate', 'shiftName', 'note'];
  if (Object.keys(body).some((key) => !fields.includes(key))) throw badRequest('Chỉ được thay đổi thông tin phân ca.');
  if (creating && ['userId', 'workDate', 'shiftName'].some((key) => body[key] === undefined)) throw badRequest('Thiếu nhân viên, ngày hoặc ca làm.');
  if (!creating && Object.keys(body).length === 0) throw badRequest('Chưa có thông tin cần cập nhật.');
  const data = {};
  if (body.userId !== undefined) {
    if (!mongoose.isValidObjectId(body.userId)) throw badRequest('Mã nhân viên không hợp lệ.');
    data.user = body.userId;
  }
  if (body.workDate !== undefined) data.workDate = parseDay(body.workDate);
  if (body.shiftName !== undefined) {
    if (typeof body.shiftName !== 'string' || !body.shiftName.trim() || body.shiftName.trim().length > 50) throw badRequest('Tên ca làm không hợp lệ.');
    data.shiftName = body.shiftName.trim();
  }
  if (body.note !== undefined) {
    if (typeof body.note !== 'string' || body.note.trim().length > 500) throw badRequest('Ghi chú không được quá 500 ký tự.');
    data.note = body.note.trim();
  }
  return data;
};
const handleError = (error, res) => {
  if (error.code === 11000) return res.status(409).json({ message: 'Nhân viên đã được phân vào ca này trong ngày.' });
  return res.status(error.status || (error.name === 'ValidationError' ? 400 : 500)).json({ message: error.message });
};
const populateUser = (query) => query.populate('user', 'fullName phone position status').sort({ workDate: 1, shiftName: 1 });
const vietnamDay = (date) => new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
const vietnamMinutes = (date) => {
  const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
};
const nextDayKey = (key) => {
  const date = parseDay(key);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};
const getShiftTime = resolveShift;

router.get('/cod-remittances', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && !['CASHIER', 'MANAGER'].includes(req.user.position)) return res.status(403).json({ message: 'Chỉ thu ngân hoặc quản lý được xem tiền COD chờ nhận.' });
    const rows = await WorkSchedule.find({ remittanceId: { $exists: true }, codReceivedAt: { $exists: false } })
      .select('user workDate shiftName remittanceId endingCashSystem endingCashActual checkOutTime note')
      .populate('user', 'fullName phone position').sort({ checkOutTime: 1 });
    res.json(rows);
  } catch (error) { handleError(error, res); }
});

router.post('/:id/confirm-cod', async (req, res) => {
  try {
    if (req.user.role !== 'STAFF' || !['CASHIER', 'MANAGER'].includes(req.user.position)) return res.status(403).json({ message: 'Chỉ thu ngân hoặc quản lý đang trong ca được nhận tiền COD.' });
    if (!mongoose.isValidObjectId(req.params.id)) throw badRequest('Mã ca giao hàng không hợp lệ.');
    const { cash, note } = req.body || {};
    if (!Number.isSafeInteger(cash) || cash < 0 || (note !== undefined && (typeof note !== 'string' || note.trim().length > 500))) throw badRequest('Số tiền hoặc ghi chú không hợp lệ.');
    if (Object.keys(req.body || {}).some(key => !['cash', 'note'].includes(key))) throw badRequest('Dữ liệu xác nhận COD không hợp lệ.');
    const now = new Date();
    const cashierShift = await WorkSchedule.findOne({ user: req.user._id, status: 'PRESENT', checkInTime: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), $lte: now }, checkOutTime: { $exists: false }, handoverAt: { $exists: false } }).sort({ checkInTime: -1 });
    if (!cashierShift) return res.status(409).json({ message: 'Thu ngân cần check-in ca trước khi nhận tiền COD.' });
    const shipperShift = await WorkSchedule.findById(req.params.id);
    if (!shipperShift) return res.status(404).json({ message: 'Không tìm thấy ca giao hàng.' });
    if (!shipperShift.remittanceId || shipperShift.codReceivedAt) return res.status(409).json({ message: 'Tiền COD chưa được nộp hoặc đã được nhận.' });
    if (cash !== shipperShift.endingCashActual && !note?.trim()) throw badRequest('Cần ghi lý do khi tiền nhận khác số shipper khai nộp.');
    const updated = await WorkSchedule.findOneAndUpdate(
      { _id: shipperShift._id, remittanceId: shipperShift.remittanceId, codReceivedAt: { $exists: false } },
      { $set: { codReceivedBy: req.user._id, codReceivedAt: now, codReceivedAmount: cash, codReceivedNote: note?.trim() || '', codReceivingSchedule: cashierShift._id } },
      { returnDocument: 'after', runValidators: true }
    ).select('user remittanceId endingCashSystem endingCashActual codReceivedBy codReceivedAt codReceivedAmount codReceivedNote codReceivingSchedule');
    if (!updated) return res.status(409).json({ message: 'Khoản COD vừa được người khác xác nhận.' });
    const claimedShift = await WorkSchedule.updateOne(
      { _id: cashierShift._id, status: 'PRESENT', handoverAt: { $exists: false }, checkOutTime: { $exists: false } },
      { $inc: { codLedgerVersion: 1 } }
    );
    if (claimedShift.modifiedCount !== 1) return res.status(409).json({ message: 'Ca thu ngân đã đóng; vui lòng chọn ca đang mở.' });
    res.json(updated);
  } catch (error) { handleError(error, res); }
});

router.get('/attendance', async (req, res) => {
  try {
    const from = parseDay(req.query.from);
    const to = parseDay(req.query.to);
    const days = Math.round((to.getTime() - from.getTime()) / 86400000);
    if (days < 0 || days > 30) throw badRequest('Khoảng xem chấm công phải từ 1 đến 31 ngày.');
    const after = new Date(to);
    after.setUTCDate(after.getUTCDate() + 1);
    const filter = { workDate: { $gte: from, $lt: after } };
    if (req.user.role === 'STAFF') filter.user = req.user._id;
    else if (req.query.userId !== undefined) {
      if (!mongoose.isValidObjectId(req.query.userId)) throw badRequest('Mã nhân viên không hợp lệ.');
      filter.user = req.query.userId;
    }
    const records = await WorkSchedule.find(filter)
      .select('user workDate shiftName checkInTime checkOutTime status note')
      .populate('user', 'fullName phone position status')
      .sort({ workDate: -1, shiftName: 1 });
    res.json(await attachShiftInfo(records));
  } catch (error) { handleError(error, res); }
});

router.get('/', async (req, res) => {
  try {
    const weekStart = parseDay(req.query.weekStart);
    if (weekStart.getUTCDay() !== 1) throw badRequest('weekStart phải là ngày thứ Hai.');
    const nextWeek = new Date(weekStart);
    nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
    const filter = { workDate: { $gte: weekStart, $lt: nextWeek } };
    if (req.user.role === 'STAFF') filter.user = req.user._id;
    else if (req.query.userId !== undefined) {
      if (!mongoose.isValidObjectId(req.query.userId)) throw badRequest('Mã nhân viên không hợp lệ.');
      filter.user = req.query.userId;
    }
    res.json(await populateUser(WorkSchedule.find(filter)));
  } catch (error) { handleError(error, res); }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const data = parseAssignment(req.body, true);
    const employee = await User.findOne({ _id: data.user, role: 'STAFF', status: 'ACTIVE' });
    if (!employee) return res.status(400).json({ message: 'Chỉ phân ca cho nhân viên đang hoạt động.' });
    const schedule = await withWeekLock(mondayOf(data.workDate), async () => {
      const shift = await WorkShift.findOne({ weekStart: mondayOf(data.workDate), shiftName: data.shiftName });
      if (!shift) throw badRequest('Ca làm không tồn tại trong tuần của ngày làm việc.');
      return WorkSchedule.create({ ...data, shift: shift._id });
    });
    await schedule.populate('user', 'fullName phone position status');
    res.status(201).json(schedule);
  } catch (error) { handleError(error, res); }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw badRequest('Mã lịch làm việc không hợp lệ.');
    const changes = parseAssignment(req.body, false);
    const schedule = await WorkSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Không tìm thấy lịch làm việc.' });
    if (schedule.checkInTime || schedule.checkOutTime || schedule.status !== 'SCHEDULED') return res.status(409).json({ message: 'Ca đã chấm công không thể đổi phân công.' });
    if (changes.user) {
      const employee = await User.findOne({ _id: changes.user, role: 'STAFF', status: 'ACTIVE' });
      if (!employee) return res.status(400).json({ message: 'Chỉ phân ca cho nhân viên đang hoạt động.' });
    }
    const targetDate = changes.workDate || schedule.workDate;
    await withWeekLock(mondayOf(targetDate), async () => {
      const shift = await WorkShift.findOne({ weekStart: mondayOf(targetDate), shiftName: changes.shiftName || schedule.shiftName });
      if (!shift) throw badRequest('Ca làm không tồn tại trong tuần của ngày làm việc.');
      Object.assign(schedule, changes, { shift: shift._id });
      await schedule.save();
    });
    await schedule.populate('user', 'fullName phone position status');
    res.json(schedule);
  } catch (error) { handleError(error, res); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw badRequest('Mã lịch làm việc không hợp lệ.');
    const schedule = await WorkSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Không tìm thấy lịch làm việc.' });
    if (schedule.checkInTime || schedule.checkOutTime || schedule.status !== 'SCHEDULED') return res.status(409).json({ message: 'Ca đã chấm công không thể xóa.' });
    await schedule.deleteOne();
    res.json({ message: 'Đã bỏ phân ca.' });
  } catch (error) { handleError(error, res); }
});

router.patch('/:id/absence', adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw badRequest('Mã lịch làm việc không hợp lệ.');
    if (req.body && Object.keys(req.body).length) throw badRequest('Thao tác này không nhận dữ liệu bổ sung.');
    const schedule = await WorkSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Không tìm thấy ca làm.' });
    if (schedule.workDate.toISOString().slice(0, 10) >= vietnamDay(new Date())) return res.status(409).json({ message: 'Chỉ đánh dấu vắng cho ca đã qua ngày làm việc.' });
    const updated = await WorkSchedule.findOneAndUpdate(
      { _id: schedule._id, status: 'SCHEDULED', checkInTime: { $exists: false } },
      { $set: { status: 'ABSENT' } }, { returnDocument: 'after' }
    ).select('user workDate shiftName checkInTime checkOutTime status note').populate('user', 'fullName phone position status');
    if (!updated) return res.status(409).json({ message: 'Ca đã có chấm công hoặc đã được xử lý.' });
    res.json(updated);
  } catch (error) { handleError(error, res); }
});

router.put('/:id/shift-action', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw badRequest('Mã lịch làm việc không hợp lệ.');
    const schedule = await WorkSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Không tìm thấy ca làm.' });
    const isAdmin = req.user.role === 'ADMIN';
    if (!isAdmin && (req.user.role !== 'STAFF' || String(schedule.user) !== String(req.user._id))) return res.status(403).json({ message: 'Bạn chỉ được chấm công ca của mình.' });
    const { action, cash, note } = req.body || {};
    if (!['CHECK_IN', 'CHECK_OUT', 'REMIT_COD'].includes(action)) throw badRequest('Thao tác ca làm không hợp lệ.');
    if (Object.keys(req.body || {}).some((key) => !['action', 'cash', 'note'].includes(key))) throw badRequest('Dữ liệu chấm công không hợp lệ.');
    if (cash !== undefined && (typeof cash !== 'number' || !Number.isSafeInteger(cash) || cash < 0)) throw badRequest('Số tiền phải là số nguyên không âm hợp lệ.');
    if (note !== undefined && (typeof note !== 'string' || note.trim().length > 500)) throw badRequest('Ghi chú không hợp lệ.');
    const now = new Date();
    const workDay = schedule.workDate.toISOString().slice(0, 10);
    const today = vietnamDay(now);
    const changes = {};
    let shiftStart;
    let shiftEnd;
    if (action === 'CHECK_IN' || (action === 'CHECK_OUT' && isAdmin)) {
      [shiftStart, shiftEnd] = (await getShiftTime(schedule)).split('-');
    }
    if (req.user.position === 'SHIPPER' && ['CHECK_OUT', 'REMIT_COD'].includes(action)) {
      if (await Order.exists({ shipper: req.user._id, orderType: 'ONLINE', status: { $nin: ['COMPLETED', 'CANCELLED'] } })) return res.status(409).json({ message: 'Cần giao xong hoặc trả các đơn được phân công về quán trước khi chốt ca.' });
      if (action === 'CHECK_OUT' && await Payment.exists({ receivedBy: req.user._id, paymentMethod: 'CASH', status: 'SUCCESS', remittanceId: { $exists: false } })) return res.status(409).json({ message: 'Còn tiền COD chưa nộp. Hãy mở Đối soát COD và dùng Nộp tiền & chốt ca.' });
    }
    if (action === 'REMIT_COD') {
      if (req.user.role !== 'STAFF' || req.user.position !== 'SHIPPER') return res.status(403).json({ message: 'Chỉ shipper được nộp tiền COD của ca giao hàng.' });
      if (schedule.status !== 'PRESENT' || !schedule.checkInTime || schedule.checkOutTime) return res.status(409).json({ message: 'Ca phải đang mở để nộp COD.' });
      if (cash === undefined) throw badRequest('Cần nhập số tiền mặt thực nộp.');
      const orders = await Order.find({ shipper: req.user._id, orderType: 'ONLINE', paymentMethod: 'COD', status: 'COMPLETED' }).select('_id');
      // Include older cash still held by this shipper; a new shift must not strand it.
      const payments = await Payment.find({ order: { $in: orders.map(order => order._id) }, receivedBy: req.user._id, paidAt: { $lte: now }, remittanceId: { $exists: false }, paymentMethod: 'CASH', status: 'SUCCESS' }).select('amount');
      const expectedCash = payments.reduce((sum, payment) => sum + payment.amount, 0);
      if (!Number.isSafeInteger(expectedCash) || expectedCash < 0) throw badRequest('Tổng tiền COD không hợp lệ.');
      if (cash !== expectedCash && !note?.trim()) throw badRequest('Cần ghi lý do chênh lệch tiền COD.');
      const remittanceId = require('crypto').randomUUID();
      const claim = await Payment.updateMany({ _id: { $in: payments.map(payment => payment._id) }, remittanceId: { $exists: false } }, { $set: { remittanceId, remittanceSchedule: schedule._id, remittedAt: now } });
      if (claim.modifiedCount !== payments.length) return res.status(409).json({ message: 'Giao dịch COD vừa được đối soát ở yêu cầu khác.' });
      const updated = await WorkSchedule.findOneAndUpdate(
        { _id: schedule._id, user: req.user._id, status: 'PRESENT', checkInTime: { $exists: true }, checkOutTime: { $exists: false } },
        { $set: { remittanceId, codPaymentIds: payments.map(payment => payment._id), endingCashSystem: expectedCash, endingCashActual: cash, checkOutTime: now, status: 'COMPLETED', note: [schedule.note, `Nộp COD ${cash}`, note?.trim()].filter(Boolean).join(' | ') } },
        { returnDocument: 'after' }
      ).populate('user', 'fullName phone position status');
      if (!updated) return res.status(409).json({ message: 'Ca đã được chốt hoặc không còn mở.' });
      return res.json({ message: 'Đã gửi bảng kê COD và chốt ca giao hàng. Chờ thu ngân xác nhận đã nhận tiền.', schedule: updated, expectedCash });
    }
    if (action === 'CHECK_IN') {
      const startMinutes = Number(shiftStart.slice(0, 2)) * 60 + Number(shiftStart.slice(3));
      const endMinutes = Number(shiftEnd.slice(0, 2)) * 60 + Number(shiftEnd.slice(3));
      if ((!isAdmin && (today !== workDay || vietnamMinutes(now) < startMinutes - 60 || vietnamMinutes(now) > endMinutes)) || (isAdmin && workDay > today)) {
        return res.status(409).json({ message: 'Ch\u1ec9 check-in trong ng\u00e0y \u0111\u01b0\u1ee3c ph\u00e2n ca, t\u1eeb 60 ph\u00fat tr\u01b0\u1edbc gi\u1edd b\u1eaft \u0111\u1ea7u \u0111\u1ebfn gi\u1edd k\u1ebft th\u00fac.' });
      }
      if (isAdmin && workDay < today) {
        const [year, month, day] = workDay.split('-').map(Number);
        const [hour, minute] = shiftStart.split(':').map(Number);
        changes.checkInTime = new Date(Date.UTC(year, month - 1, day, hour - 7, minute));
      } else {
        changes.checkInTime = now;
      }
      changes.status = 'PRESENT';
      if (cash !== undefined) changes.startingCash = cash;
    } else {
      if ((!isAdmin && today !== workDay && !(today === nextDayKey(workDay) && vietnamMinutes(now) < 360)) || (isAdmin && workDay > today)) {
        return res.status(409).json({ message: 'Ch\u1ec9 check-out trong ng\u00e0y l\u00e0m vi\u1ec7c ho\u1eb7c tr\u01b0\u1edbc 06:00 s\u00e1ng h\u00f4m sau.' });
      }
      if (!schedule.checkInTime || now < schedule.checkInTime) return res.status(409).json({ message: 'C\u1ea7n check-in tr\u01b0\u1edbc khi check-out.' });
      if (isAdmin && workDay < today) {
        const [year, month, day] = workDay.split('-').map(Number);
        const [hour, minute] = shiftEnd.split(':').map(Number);
        changes.checkOutTime = new Date(Date.UTC(year, month - 1, day, hour - 7, minute));
      } else {
        changes.checkOutTime = now;
      }
      changes.status = 'COMPLETED';
      if (cash !== undefined) changes.endingCashActual = cash;
    }
    if (note !== undefined) changes.note = note.trim();
    const expectedStatus = action === 'CHECK_IN' && isAdmin ? { $in: ['SCHEDULED', 'ABSENT'] } : action === 'CHECK_IN' ? 'SCHEDULED' : 'PRESENT';
    const guard = action === 'CHECK_IN' ? { checkInTime: { $exists: false } } : { checkOutTime: { $exists: false }, checkInTime: { $exists: true } };
    const updated = await WorkSchedule.findOneAndUpdate(
      { _id: schedule._id, ...(isAdmin ? {} : { user: req.user._id }), status: expectedStatus, ...guard },
      { $set: changes }, { returnDocument: 'after' }
    ).select('user workDate shiftName checkInTime checkOutTime status note').populate('user', 'fullName phone position status');
    if (!updated) return res.status(409).json({ message: 'Ca đã được chấm công hoặc không ở trạng thái phù hợp.' });
    res.json({ message: action === 'CHECK_IN' ? 'Check-in thành công.' : 'Check-out thành công.', schedule: updated });
  } catch (error) { handleError(error, res); }
});

module.exports = router;
