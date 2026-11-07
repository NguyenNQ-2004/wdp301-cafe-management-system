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
const shiftJson = (shift) => ({ _id: shift._id, weekStart: shift.weekStart, code: shift.shiftName, name: shift.shiftName, startTime: shift.startTime, endTime: shift.endTime });
async function resolveShift(schedule) {
  const week = mondayOf(schedule.workDate);
  const shift = await WorkShift.findOne({ weekStart: week, shiftName: schedule.shiftName });
  if (shift) return `${shift.startTime}-${shift.endTime}`;
  // Existing schedules remain usable without rewriting historical data.
  const defaults = { MORNING: '07:00-12:00', AFTERNOON: '12:00-17:00', EVENING: '17:00-22:00' };
  if (await WorkShift.exists({ weekStart: week }) || !defaults[schedule.shiftName]) throw invalid('Ca làm không thuộc tuần của lịch phân công.', 409);
  const setting = await ShopSetting.findOne({ settingKey: `shift_${schedule.shiftName.toLowerCase()}` });
  return setting?.settingValue || defaults[schedule.shiftName];
}
module.exports = { invalid, parseDay, parseWeek, mondayOf, currentWeek, assertEditable, withWeekLock, shiftJson, resolveShift };
