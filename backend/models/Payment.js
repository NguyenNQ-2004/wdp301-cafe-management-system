const mongoose = require('mongoose');
const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  paymentMethod: { type: String, enum: ['CASH', 'VNPAY', 'MOMO', 'BANK_TRANSFER', 'DEMO_ONLINE'], required: true },
  transactionCode: { type: String },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
  paidAt: { type: Date },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paymentNote: { type: String }
}, { timestamps: true });
paymentSchema.index({ status: 1, paymentMethod: 1, paidAt: 1 });
module.exports = mongoose.model('Payment', paymentSchema);
