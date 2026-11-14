const mongoose = require('mongoose');

const workShiftSchema = new mongoose.Schema({
  weekStart: { type: Date, required: true },
  shiftName: { type: String, required: true, trim: true, maxlength: 50 },
  startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ }
}, { timestamps: true, optimisticConcurrency: true });
workShiftSchema.index({ weekStart: 1, shiftName: 1 }, { unique: true });
workShiftSchema.pre('validate', function () {
  if (this.weekStart && (this.weekStart.getUTCDay() !== 1 || this.weekStart.getUTCHours() !== 0)) this.invalidate('weekStart', 'Tuần phải bắt đầu vào thứ Hai.');
  if (this.startTime >= this.endTime) this.invalidate('endTime', 'Giờ kết thúc phải sau giờ bắt đầu.');
});
module.exports = mongoose.model('WorkShift', workShiftSchema);
