const mongoose = require('mongoose');
const voucherSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  discountType: { type: String, enum: ['PERCENT', 'FIXED_AMOUNT'], required: true },
  discountValue: { type: Number, required: true },
  minOrderValue: { type: Number, default: 0 },
  maxDiscount: { type: Number },
  startDate: { type: Date },
  validUntil: { type: Date },
  usageLimit: { type: Number },
  usedCount: { type: Number, default: 0 },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
});
module.exports = mongoose.model('Voucher', voucherSchema);