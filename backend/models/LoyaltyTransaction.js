const mongoose = require('mongoose');
const loyaltyTransactionSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  pointsChange: { type: Number, required: true },
  balanceAfter: { type: Number },
  automatic: { type: Boolean, default: false },
  redemptionRefund: { type: Boolean, default: false },
  earningReversal: { type: Boolean, default: false },
  transactionType: { type: String, enum: ['EARN', 'REDEEM', 'REFUND', 'ADJUST'], required: true },
  reason: { type: String },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
loyaltyTransactionSchema.index({ order: 1 }, { unique: true, partialFilterExpression: { automatic: true } });
loyaltyTransactionSchema.index({ order: 1 }, { name: 'order_redemption_refund', unique: true, partialFilterExpression: { redemptionRefund: true } });
loyaltyTransactionSchema.index({ order: 1 }, { name: 'order_earning_reversal', unique: true, partialFilterExpression: { earningReversal: true } });
module.exports = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);
