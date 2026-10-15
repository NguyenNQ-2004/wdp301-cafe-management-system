const express = require('express');
const ShopSetting = require('../models/ShopSetting');
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
    const settings = await ShopSetting.find({ settingKey: { $in: shiftDefinitions.map((shift) => shift.key) } });
    const byKey = new Map(settings.map((setting) => [setting.settingKey, setting.settingValue]));
    const shifts = shiftDefinitions.map((definition) => {
      const stored = byKey.get(definition.key);
      const valid = typeof stored === 'string' && /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(stored);
      return toShift(definition, valid ? stored : definition.defaultTime);
    });
    res.json({ shifts });
  } catch (error) { res.status(500).json({ message: error.message }); }
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
