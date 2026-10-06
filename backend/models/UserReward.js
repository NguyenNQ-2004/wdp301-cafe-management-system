const mongoose = require('mongoose');
const userRewardSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reward: { type: mongoose.Schema.Types.ObjectId, ref: 'RewardItem', required: true },
  voucher: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' }
}, { timestamps: true });
module.exports = mongoose.model('UserReward', userRewardSchema);