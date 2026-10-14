const express = require('express');
const mongoose = require('mongoose');
const WorkSchedule = require('../models/WorkSchedule');
const User = require('../models/User');
const { protect, adminOnly, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect, authorize('ADMIN', 'STAFF'));

const shifts = ['MORNING', 'AFTERNOON', 'EVENING'];
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
    if (!shifts.includes(body.shiftName)) throw badRequest('Mã ca làm không hợp lệ.');
    data.shiftName = body.shiftName;
  }
  if (body.note !== undefined) {
    if (typeof body.note !== 'string' || body.note.trim().length > 300) throw badRequest('Ghi chú không được quá 300 ký tự.');
    data.note = body.note.trim();
  }
  return data;
};
const handleError = (error, res) => {
  if (error.code === 11000) return res.status(409).json({ message: 'Nhân viên đã được phân vào ca này trong ngày.' });
  return res.status(error.status || (error.name === 'ValidationError' ? 400 : 500)).json({ message: error.message });
};
const populateUser = (query) => query.populate('user', 'fullName phone position status').sort({ workDate: 1, shiftName: 1 });

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
    const schedule = await WorkSchedule.create(data);
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
    Object.assign(schedule, changes);
    await schedule.save();
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

// Giữ đường dẫn chấm công cho màn hình 26, nhưng nhân viên chỉ được thao tác ca của mình.
router.put('/:id/shift-action', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw badRequest('Mã lịch làm việc không hợp lệ.');
    const schedule = await WorkSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Không tìm thấy ca làm.' });
    if (req.user.role !== 'ADMIN' && String(schedule.user) !== String(req.user._id)) return res.status(403).json({ message: 'Bạn chỉ được chấm công ca của mình.' });
    const { action, cash, note } = req.body || {};
    if (!['CHECK_IN', 'CHECK_OUT'].includes(action)) throw badRequest('Thao tác ca làm không hợp lệ.');
    if (cash !== undefined && (typeof cash !== 'number' || !Number.isFinite(cash) || cash < 0)) throw badRequest('Số tiền không hợp lệ.');
    if (note !== undefined && (typeof note !== 'string' || note.trim().length > 300)) throw badRequest('Ghi chú không hợp lệ.');
    if (action === 'CHECK_IN') {
      schedule.checkInTime = new Date();
      schedule.status = 'PRESENT';
      if (cash !== undefined) schedule.startingCash = cash;
    } else {
      schedule.checkOutTime = new Date();
      schedule.status = 'COMPLETED';
      if (cash !== undefined) schedule.endingCashActual = cash;
    }
    if (note !== undefined) schedule.note = note.trim();
    await schedule.save();
    res.json({ message: 'Cập nhật ca làm thành công!', schedule });
  } catch (error) { handleError(error, res); }
});

module.exports = router;
