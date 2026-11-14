const mongoose = require('mongoose');
const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  paymentMethod: { type: String, enum: ['CASH', 'VNPAY', 'MOMO', 'BANK_TRANSFER', 'DEMO_ONLINE'], required: true },
  demoProvider: { type: String, enum: ['MOMO', 'VNPAY', 'BANK_TRANSFER'] },
  transactionCode: { type: String },
  sepayTransactionId: { type: String },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'], default: 'PENDING' },
  paidAt: { type: Date },
  receivedAmount: { type: Number },
  changeAmount: { type: Number },
  refundedAt: { type: Date },
  refundAmount: { type: Number },
  refundMethod: { type: String, enum: ['CASH', 'BANK_TRANSFER', 'MOMO', 'VNPAY', 'DEMO_ONLINE'] },
  refundReference: { type: String },
  refundNote: { type: String },
  refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remittanceId: String,
  remittanceSchedule: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkSchedule' },
  remittedAt: Date,
  paymentNote: { type: String }
}, { timestamps: true });
paymentSchema.index({ status: 1, paymentMethod: 1, paidAt: 1 });
paymentSchema.index({ sepayTransactionId: 1 }, { unique: true, sparse: true });
module.exports = mongoose.model('Payment', paymentSchema);
