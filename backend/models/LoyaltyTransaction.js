const mongoose = require('mongoose');
const loyaltyTransactionSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  pointsChange: { type: Number, required: true },
  balanceAfter: { type: Number },
  transactionType: { type: String, enum: ['EARN', 'REDEEM'], required: true },
  reason: { type: String },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
module.exports = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);