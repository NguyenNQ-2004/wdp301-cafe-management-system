const { invalid, objectBody } = require('./adminValidation');
const SHIFT_DEFAULTS = { shift_morning: '07:00-12:00', shift_afternoon: '12:00-17:00', shift_evening: '17:00-22:00' };
const MINIMUMS = { freeship_threshold: 0, delivery_fee: 0, delivery_minutes: 1, points_step: 1, points_step_value: 0, points_earn_unit: 1 };
const isPublicSettingKey = key => typeof key === 'string' && key !== 'membership_tiers' && !/(password|secret|token|smtp|jwt|payment_|mongo|credential|private|api_key|database_uri)/i.test(key);
function validateSettings(body, current = {}) {
  objectBody(body);
  if (!Object.keys(body).length) throw invalid('Chưa có cài đặt cần lưu.');
  const changes = {};
  for (const [key, raw] of Object.entries(body)) {
    if (!isPublicSettingKey(key)) throw invalid('Thông tin bảo mật phải nằm trong cấu hình máy chủ.');
    if (key === 'membership_tiers') throw invalid('Hệ thống chỉ tích điểm theo số điện thoại.');
    if (!/^[a-z][a-z0-9_]{1,49}$/.test(key) || !['string', 'number'].includes(typeof raw)) throw invalid('Mã hoặc giá trị cài đặt không hợp lệ.');
    const value = key in SHIFT_DEFAULTS ? String(raw).replace(/\s/g, '') : String(raw).trim();
    if (!value || value.length > 1000) throw invalid('Giá trị cài đặt không hợp lệ.');
    if (key in MINIMUMS && (!Number.isSafeInteger(Number(value)) || Number(value) < MINIMUMS[key])) throw invalid(`${key} phải là số nguyên từ ${MINIMUMS[key]}.`);
    changes[key] = value;
  }
  if (Object.keys(body).some(key => key in SHIFT_DEFAULTS)) {
    const merged = { ...SHIFT_DEFAULTS, ...current, ...changes };
    const ranges = Object.keys(SHIFT_DEFAULTS).map(key => {
      const value = merged[key];
      if (!/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw invalid('Giờ ca phải đúng định dạng HH:mm-HH:mm.');
      const [start, end] = value.split('-').map(time => { const [h, m] = time.split(':').map(Number); return h * 60 + m; });
      if (start >= end) throw invalid('Giờ bắt đầu ca phải trước giờ kết thúc.');
      return { start, end };
    });
    if (ranges[0].end > ranges[1].start || ranges[1].end > ranges[2].start) throw invalid('Các khung giờ ca không được chồng lấn.');
  }
  return changes;
}
module.exports = { validateSettings, isPublicSettingKey };
