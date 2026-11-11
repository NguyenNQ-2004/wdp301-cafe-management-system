const express = require('express');
const ShopSetting = require('../models/ShopSetting');
const mongoose = require('mongoose');
const WorkShift = require('../models/WorkShift');
const WorkSchedule = require('../models/WorkSchedule');
const { invalid, parseWeek, assertEditable, withWeekLock, shiftJson } = require('../utils/weeklyShifts');
const { protect, adminOnly, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

const shiftDefinitions = [
  { code: 'MORNING', name: 'Ca sáng', key: 'shift_morning', defaultTime: '07:00-12:00' },
  { code: 'AFTERNOON', name: 'Ca chiều', key: 'shift_afternoon', defaultTime: '12:00-17:00' },
  { code: 'EVENING', name: 'Ca tối', key: 'shift_evening', defaultTime: '17:00-22:00' }
];

const minutes = (time) => {
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

const toShift = (definition, range) => {
  const [startTime, endTime] = range.split('-');
  return { code: definition.code, name: definition.name, startTime, endTime };
};

router.get('/', authorize('ADMIN', 'STAFF'), async (_req, res) => {
  try {
    if (_req.query.weekStart !== undefined) {
      const weekStart = parseWeek(_req.query.weekStart);
      const shifts = await WorkShift.find({ weekStart }).sort({ startTime: 1, shiftName: 1 });
      return res.json({ weekStart, shifts: shifts.map(shiftJson) });
    }
    const settings = await ShopSetting.find({ settingKey: { $in: shiftDefinitions.map((shift) => shift.key) } });
    const byKey = new Map(settings.map((setting) => [setting.settingKey, setting.settingValue]));
    const shifts = shiftDefinitions.map((definition) => {
      const stored = byKey.get(definition.key);
      const valid = typeof stored === 'string' && /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(stored);
      return toShift(definition, valid ? stored : definition.defaultTime);
    });
    res.json({ shifts });
  } catch (error) { res.status(error.status || 500).json({ message: error.message }); }
});

const weeklyError = (error, res) => res.status(error.code === 11000 || error.name === 'VersionError' ? 409 : error.status || (error.name === 'ValidationError' ? 400 : 500)).json({ message: error.code === 11000 ? 'Tên ca đã tồn tại trong tuần.' : error.message });
const parseShift = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['weekStart', 'shiftName', 'startTime', 'endTime'].includes(key))) throw invalid('Dữ liệu ca làm không hợp lệ.');
  if (typeof body.shiftName !== 'string' || !body.shiftName.trim() || body.shiftName.trim().length > 50) throw invalid('Tên ca phải từ 1 đến 50 ký tự.');
  const start = minutes(body.startTime), end = minutes(body.endTime);
  if (start === null || end === null || start >= end) throw invalid('Giờ bắt đầu phải trước giờ kết thúc (HH:mm).');
  return { weekStart: parseWeek(body.weekStart), shiftName: body.shiftName.trim(), startTime: body.startTime, endTime: body.endTime };
};
const assertNoOverlap = async (data, except) => {
  if (await WorkShift.exists({ weekStart: data.weekStart, ...(except ? { _id: { $ne: except } } : {}), startTime: { $lt: data.endTime }, endTime: { $gt: data.startTime } })) throw invalid('Khung giờ ca làm bị chồng lấn.', 409);
};
const hasSchedules = (shift) => {
  const end = new Date(shift.weekStart); end.setUTCDate(end.getUTCDate() + 7);
  return WorkSchedule.exists({ workDate: { $gte: shift.weekStart, $lt: end }, shiftName: shift.shiftName });
};
router.post('/copy', adminOnly, async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).some(key => key !== 'weekStart')) throw invalid('Chỉ nhận tuần đích.');
    const weekStart = parseWeek(req.body.weekStart); assertEditable(weekStart);
    const shifts = await withWeekLock(weekStart, async () => {
      if (await WorkShift.exists({ weekStart })) throw invalid('Chỉ sao chép vào tuần trống.', 409);
      const previous = await WorkShift.findOne({ weekStart: { $lt: weekStart } }).sort({ weekStart: -1 });
      if (!previous) throw invalid('Không có tuần trước để sao chép.', 404);
      const source = await WorkShift.find({ weekStart: previous.weekStart }).sort({ startTime: 1 });
      const ids = source.map(() => new mongoose.Types.ObjectId());
      try { return await WorkShift.insertMany(source.map((shift, i) => ({ _id: ids[i], weekStart, shiftName: shift.shiftName, startTime: shift.startTime, endTime: shift.endTime }))); }
      catch (error) { await WorkShift.deleteMany({ _id: { $in: ids } }); throw error; }
    });
    res.status(201).json({ weekStart, shifts: shifts.map(shiftJson) });
  } catch (error) { weeklyError(error, res); }
});
router.post('/', adminOnly, async (req, res) => {
  try {
    const data = parseShift(req.body); assertEditable(data.weekStart);
    const shift = await withWeekLock(data.weekStart, async () => { await assertNoOverlap(data); return WorkShift.create(data); });
    res.status(201).json(shiftJson(shift));
  } catch (error) { weeklyError(error, res); }
});
router.put('/:id', adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw invalid('Mã ca không hợp lệ.');
    const existing = await WorkShift.findById(req.params.id);
    if (!existing) throw invalid('Không tìm thấy ca.', 404);
    assertEditable(existing.weekStart);
    const data = parseShift({ ...req.body, weekStart: req.body?.weekStart || existing.weekStart.toISOString().slice(0,10) });
    if (+data.weekStart !== +existing.weekStart) throw invalid('Không được chuyển ca sang tuần khác.');
    const shift = await withWeekLock(existing.weekStart, async () => {
      const current = await WorkShift.findById(existing._id);
      if (!current) throw invalid('Ca đã được xóa.', 409);
      if (await hasSchedules(current)) throw invalid('Ca đã có nhân viên được phân công.', 409);
      await assertNoOverlap(data, existing._id);
      Object.assign(current, data); return current.save();
    });
    res.json(shiftJson(shift));
  } catch (error) { weeklyError(error, res); }
});
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw invalid('Mã ca không hợp lệ.');
    const shift = await WorkShift.findById(req.params.id);
    if (!shift) throw invalid('Không tìm thấy ca.', 404);
    assertEditable(shift.weekStart);
    await withWeekLock(shift.weekStart, async () => {
      const current = await WorkShift.findById(shift._id);
      if (!current) throw invalid('Ca đã được xóa.', 409);
      if (await hasSchedules(current)) throw invalid('Ca đã có nhân viên được phân công.', 409);
      await current.deleteOne();
    });
    res.json({ message: 'Đã xóa ca làm việc.' });
  } catch (error) { weeklyError(error, res); }
});

router.put('/', adminOnly, async (req, res) => {
  try {
    const items = req.body?.shifts;
    if (!Array.isArray(items) || items.length !== shiftDefinitions.length) return res.status(400).json({ message: 'Cần khai báo đủ ba ca sáng, chiều và tối.' });
    const byCode = new Map();
    for (const item of items) {
      if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).some((key) => !['code', 'startTime', 'endTime'].includes(key))) return res.status(400).json({ message: 'Dữ liệu ca làm không hợp lệ.' });
      if (!shiftDefinitions.some((definition) => definition.code === item.code) || byCode.has(item.code)) return res.status(400).json({ message: 'Mã ca làm không hợp lệ hoặc bị trùng.' });
      const start = minutes(item.startTime);
      const end = minutes(item.endTime);
      if (start === null || end === null || start >= end) return res.status(400).json({ message: 'Giờ bắt đầu phải trước giờ kết thúc và đúng định dạng HH:mm.' });
      byCode.set(item.code, { startTime: item.startTime, endTime: item.endTime, start, end });
    }
    const [morning, afternoon, evening] = shiftDefinitions.map((definition) => byCode.get(definition.code));
    if (morning.end > afternoon.start || afternoon.end > evening.start) return res.status(400).json({ message: 'Các khung giờ ca không được chồng lấn.' });

    await ShopSetting.bulkWrite(shiftDefinitions.map((definition) => {
      const shift = byCode.get(definition.code);
      return { updateOne: { filter: { settingKey: definition.key }, update: { $set: { settingValue: `${shift.startTime}-${shift.endTime}` } }, upsert: true } };
    }));
    res.json({ shifts: shiftDefinitions.map((definition) => {
      const shift = byCode.get(definition.code);
      return { code: definition.code, name: definition.name, startTime: shift.startTime, endTime: shift.endTime };
    }) });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;
