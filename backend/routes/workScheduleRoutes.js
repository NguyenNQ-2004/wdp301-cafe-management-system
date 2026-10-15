const express = require('express');
const mongoose = require('mongoose');
const WorkSchedule = require('../models/WorkSchedule');
const User = require('../models/User');
const ShopSetting = require('../models/ShopSetting');
const { protect, adminOnly, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect, authorize('ADMIN', 'STAFF'));

const shifts = ['MORNING', 'AFTERNOON', 'EVENING'];
const shiftSettings = {
  MORNING: { key: 'shift_morning', defaultTime: '07:00-12:00' },
  AFTERNOON: { key: 'shift_afternoon', defaultTime: '12:00-17:00' },
  EVENING: { key: 'shift_evening', defaultTime: '17:00-22:00' }
};
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
const getShiftTime = async (shiftName) => {
  const definition = shiftSettings[shiftName];
  const setting = await ShopSetting.findOne({ settingKey: definition.key });
  const range = setting?.settingValue || definition.defaultTime;
  if (!/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(range)) return definition.defaultTime;
  return range;
};

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
    res.json(records);
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
    if (req.user.role !== 'STAFF' || String(schedule.user) !== String(req.user._id)) return res.status(403).json({ message: 'Bạn chỉ được chấm công ca của mình.' });
    const { action, cash, note } = req.body || {};
    if (!['CHECK_IN', 'CHECK_OUT'].includes(action)) throw badRequest('Thao tác ca làm không hợp lệ.');
    if (Object.keys(req.body || {}).some((key) => !['action', 'cash', 'note'].includes(key))) throw badRequest('Dữ liệu chấm công không hợp lệ.');
    if (cash !== undefined && (typeof cash !== 'number' || !Number.isFinite(cash) || cash < 0)) throw badRequest('Số tiền không hợp lệ.');
    if (note !== undefined && (typeof note !== 'string' || note.trim().length > 300)) throw badRequest('Ghi chú không hợp lệ.');
    const now = new Date();
    const workDay = schedule.workDate.toISOString().slice(0, 10);
    const today = vietnamDay(now);
    const changes = {};
    if (action === 'CHECK_IN') {
      const [start, end] = (await getShiftTime(schedule.shiftName)).split('-');
      const startMinutes = Number(start.slice(0, 2)) * 60 + Number(start.slice(3));
      const endMinutes = Number(end.slice(0, 2)) * 60 + Number(end.slice(3));
      if (today !== workDay || vietnamMinutes(now) < startMinutes - 60 || vietnamMinutes(now) > endMinutes) {
        return res.status(409).json({ message: 'Chỉ check-in trong ngày được phân ca, từ 60 phút trước giờ bắt đầu đến giờ kết thúc.' });
      }
      changes.checkInTime = now;
      changes.status = 'PRESENT';
      if (cash !== undefined) changes.startingCash = cash;
    } else {
      if (today !== workDay && !(today === nextDayKey(workDay) && vietnamMinutes(now) < 360)) {
        return res.status(409).json({ message: 'Chỉ check-out trong ngày làm việc hoặc trước 06:00 sáng hôm sau.' });
      }
      if (!schedule.checkInTime || now < schedule.checkInTime) return res.status(409).json({ message: 'Cần check-in trước khi check-out.' });
      changes.checkOutTime = now;
      changes.status = 'COMPLETED';
      if (cash !== undefined) changes.endingCashActual = cash;
    }
    if (note !== undefined) changes.note = note.trim();
    const expectedStatus = action === 'CHECK_IN' ? 'SCHEDULED' : 'PRESENT';
    const guard = action === 'CHECK_IN' ? { checkInTime: { $exists: false } } : { checkOutTime: { $exists: false }, checkInTime: { $exists: true } };
    const updated = await WorkSchedule.findOneAndUpdate(
      { _id: schedule._id, user: req.user._id, status: expectedStatus, ...guard },
      { $set: changes }, { returnDocument: 'after' }
    ).select('user workDate shiftName checkInTime checkOutTime status note').populate('user', 'fullName phone position status');
    if (!updated) return res.status(409).json({ message: 'Ca đã được chấm công hoặc không ở trạng thái phù hợp.' });
    res.json({ message: action === 'CHECK_IN' ? 'Check-in thành công.' : 'Check-out thành công.', schedule: updated });
  } catch (error) { handleError(error, res); }
});

module.exports = router;
