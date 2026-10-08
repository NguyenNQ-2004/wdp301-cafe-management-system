const mongoose = require('mongoose');
const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  paymentMethod: { type: String, enum: ['CASH', 'VNPAY', 'MOMO', 'BANK_TRANSFER'], required: true },
  transactionCode: { type: String },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
  paidAt: { type: Date },
  paymentNote: { type: String }
});
module.exports = mongoose.model('Payment', paymentSchema);