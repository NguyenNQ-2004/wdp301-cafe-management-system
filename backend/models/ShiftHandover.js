const mongoose = require('mongoose');

const shiftHandoverSchema = new mongoose.Schema({
  schedule: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkSchedule', required: true, unique: true },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workDate: { type: Date, required: true },
  shiftName: { type: String, required: true, trim: true, maxlength: 50 },
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  openingCash: { type: Number, required: true },
  cashSales: { type: Number, required: true, default: 0 },
  expectedCash: { type: Number, required: true },
  actualCash: { type: Number, required: true },
  difference: { type: Number, required: true, default: 0 },
  note: { type: String, maxlength: 500, default: '' },
  status: {
    type: String,
    enum: ['SUBMITTED', 'CONFIRMED', 'REJECTED'],
    default: 'SUBMITTED',
    required: true
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reviewerNote: { type: String, maxlength: 500 },
  resubmittedAt: { type: Date },
  revision: { type: Number, default: 0 },
  history: [{ action: String, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: Date,
    fromStatus: String, toStatus: String, note: String, actualCash: Number, expectedCash: Number }]
}, { timestamps: true, optimisticConcurrency: true });

shiftHandoverSchema.index({ cashier: 1, workDate: 1 });
shiftHandoverSchema.index({ status: 1 });

module.exports = mongoose.model('ShiftHandover', shiftHandoverSchema);
