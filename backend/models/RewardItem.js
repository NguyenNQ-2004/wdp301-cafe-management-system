const mongoose = require('mongoose');
const rewardItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  pointsCost: { type: Number, required: true },
  discountValue: { type: Number, default: 0 },
  minOrderValue: { type: Number, default: 0 },
  validDays: { type: Number, default: 30 },
  category: { type: String },
  imageIcon: { type: String, default: 'card_giftcard' },
  stock: { type: Number, default: -1 },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
});
module.exports = mongoose.model('RewardItem', rewardItemSchema);