const mongoose = require('mongoose');
const workScheduleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workDate: { type: Date, required: true },
  shiftName: { type: String, enum: ['MORNING', 'AFTERNOON', 'EVENING'], required: true },
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  startingCash: { type: Number },
  endingCashSystem: { type: Number },
  endingCashActual: { type: Number },
  handoverCashSales: { type: Number, min: 0 },
  handoverPaymentCount: { type: Number, min: 0 },
  handoverUnattributedCash: { type: Number, min: 0 },
  handoverUnattributedCount: { type: Number, min: 0 },
  handoverAt: { type: Date },
  handoverNote: { type: String, maxlength: 500 },
  status: { type: String, enum: ['SCHEDULED', 'PRESENT', 'ABSENT', 'COMPLETED'], default: 'SCHEDULED' },
  note: { type: String }
}, { timestamps: true });

workScheduleSchema.index({ user: 1, workDate: 1, shiftName: 1 }, { unique: true });

module.exports = mongoose.model('WorkSchedule', workScheduleSchema);
