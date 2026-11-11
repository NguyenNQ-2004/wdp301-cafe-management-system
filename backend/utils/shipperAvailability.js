const User = require('../models/User');
const WorkSchedule = require('../models/WorkSchedule');
const { resolveShift } = require('./weeklyShifts');

const vnDay = (date) => new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);
const vnMinutes = (date) => {
  const local = new Date(date.getTime() + 7 * 3600000);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
};

async function hasShipperOnShift(shipperId, now = new Date()) {
  const filter = { role: 'STAFF', position: 'SHIPPER', status: 'ACTIVE' };
  if (shipperId) filter._id = shipperId;
  const ids = await User.distinct('_id', filter);
  if (!ids.length) return false;
  const schedules = await WorkSchedule.find({
    user: { $in: ids }, status: 'PRESENT',
    checkInTime: { $gte: new Date(now.getTime() - 24 * 3600000), $lte: now },
    checkOutTime: { $exists: false }, handoverAt: { $exists: false }
  });
  for (const schedule of schedules) {
    if (vnDay(schedule.workDate) !== vnDay(now)) continue;
    try {
      const [start, end] = (await resolveShift(schedule)).split('-');
      const startMinutes = Number(start.slice(0, 2)) * 60 + Number(start.slice(3));
      const endMinutes = Number(end.slice(0, 2)) * 60 + Number(end.slice(3));
      const currentMinutes = vnMinutes(now);
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) return true;
    } catch {
      // An invalid or removed shift cannot make a shipper available.
    }
  }
  return false;
}

module.exports = { hasShipperOnShift };
