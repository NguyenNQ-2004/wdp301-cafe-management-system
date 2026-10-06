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
  status: { type: String, enum: ['SCHEDULED', 'PRESENT', 'ABSENT', 'COMPLETED'], default: 'SCHEDULED' },
  note: { type: String }
});
module.exports = mongoose.model('WorkSchedule', workScheduleSchema);