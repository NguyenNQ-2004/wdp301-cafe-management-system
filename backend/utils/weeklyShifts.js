const WorkShift = require('../models/WorkShift');
const ShopSetting = require('../models/ShopSetting');

const invalid = (message, status = 400) => Object.assign(new Error(message), { status });
const parseDay = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw invalid('Ngày phải có định dạng YYYY-MM-DD.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw invalid('Ngày không hợp lệ.');
  return date;
};
const mondayOf = (value) => {
  const date = typeof value === 'string' ? parseDay(value) : new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date;
};
const parseWeek = (value) => {
  const day = parseDay(value);
  if (day.getUTCDay() !== 1) throw invalid('weekStart phải là ngày thứ Hai.');
  return day;
};
const currentWeek = () => mondayOf(new Date(Date.now() + 7 * 3600000));
const assertEditable = (week) => {
  if (week < currentWeek()) throw invalid('Tuần đã qua chỉ được xem.', 409);
};
const locks = new Map();
async function withWeekLock(week, action) {
  const key = new Date(week).toISOString();
  const previous = locks.get(key) || Promise.resolve();
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  locks.set(key, barrier);
  await previous;
  try { return await action(); }
  finally { release(); if (locks.get(key) === barrier) locks.delete(key); }
}
const DEFAULT_SHIFT_LABELS = { MORNING: 'Ca sáng', AFTERNOON: 'Ca chiều', EVENING: 'Ca tối' };
const DEFAULT_SHIFT_TIMES = { MORNING: '07:00-12:00', AFTERNOON: '12:00-17:00', EVENING: '17:00-22:00' };
const VALID_TIME_RANGE = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;

const shiftJson = (shift) => ({ _id: shift._id, weekStart: shift.weekStart, code: shift.shiftName, name: shift.shiftName, startTime: shift.startTime, endTime: shift.endTime });
async function resolveShift(schedule) {
  const week = mondayOf(schedule.workDate);
  const shift = await WorkShift.findOne({ weekStart: week, shiftName: schedule.shiftName });
  if (shift) return `${shift.startTime}-${shift.endTime}`;
  // Existing schedules remain usable without rewriting historical data.
  if (await WorkShift.exists({ weekStart: week }) || !DEFAULT_SHIFT_TIMES[schedule.shiftName]) throw invalid('Ca làm không thuộc tuần của lịch phân công.', 409);
  const setting = await ShopSetting.findOne({ settingKey: `shift_${schedule.shiftName.toLowerCase()}` });
  return setting?.settingValue || DEFAULT_SHIFT_TIMES[schedule.shiftName];
}

async function attachShiftInfo(schedules) {
  const items = schedules.map((item) => (typeof item?.toObject === 'function' ? item.toObject() : { ...item }));
  if (!items.length) return items;

  const weekMap = new Map();
  for (const item of items) {
    if (!item.workDate) continue;
    const date = new Date(item.workDate);
    if (Number.isNaN(date.getTime())) continue;
    const week = mondayOf(date);
    weekMap.set(week.toISOString().slice(0, 10), week);
  }

  const [workShifts, settings] = await Promise.all([
    weekMap.size ? WorkShift.find({ weekStart: { $in: Array.from(weekMap.values()) } }).lean() : Promise.resolve([]),
    ShopSetting.find({ settingKey: { $in: ['shift_morning', 'shift_afternoon', 'shift_evening'] } }).lean()
  ]);

  const byWeekAndName = new Map(
    workShifts.map((ws) => [`${new Date(ws.weekStart).toISOString().slice(0, 10)}::${ws.shiftName}`, ws])
  );
  const settingRanges = new Map(
    settings.map((s) => [s.settingKey.replace('shift_', '').toUpperCase(), s.settingValue])
  );

  return items.map((obj) => {
    const name = obj.shiftName || '';
    let weekKey = '';
    if (obj.workDate && !Number.isNaN(new Date(obj.workDate).getTime())) {
      weekKey = mondayOf(obj.workDate).toISOString().slice(0, 10);
    }
    const ws = weekKey ? byWeekAndName.get(`${weekKey}::${name}`) : null;
    if (ws) {
      obj.shiftInfo = {
        code: name,
        name: DEFAULT_SHIFT_LABELS[name] || ws.shiftName || name,
        startTime: ws.startTime,
        endTime: ws.endTime
      };
      return obj;
    }
    if (DEFAULT_SHIFT_TIMES[name]) {
      const stored = settingRanges.get(name);
      const range = typeof stored === 'string' && VALID_TIME_RANGE.test(stored) ? stored : DEFAULT_SHIFT_TIMES[name];
      const [startTime, endTime] = range.split('-');
      obj.shiftInfo = { code: name, name: DEFAULT_SHIFT_LABELS[name], startTime, endTime };
      return obj;
    }
    obj.shiftInfo = { code: name, name: name || 'Ca làm', startTime: '', endTime: '' };
    return obj;
  });
}

module.exports = { invalid, parseDay, parseWeek, mondayOf, currentWeek, assertEditable, withWeekLock, shiftJson, resolveShift, attachShiftInfo };
