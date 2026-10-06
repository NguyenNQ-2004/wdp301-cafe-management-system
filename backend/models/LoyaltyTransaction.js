const mongoose = require('mongoose');
const loyaltyTransactionSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  pointsChange: { type: Number, required: true },
  transactionType: { type: String, enum: ['EARN', 'REDEEM'], required: true }
}, { timestamps: true });
module.exports = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);