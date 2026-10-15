const mongoose = require('mongoose');

const membershipTierSchema = new mongoose.Schema(
  {
    tierCode: {
      type: String,
      enum: ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'],
      required: true,
      unique: true
    },
    tierName: { type: String, required: true },
    minPoints: { type: Number, required: true, default: 0 },
    minSpent: { type: Number, required: true, default: 0 },
    discountPercent: { type: Number, default: 0 },
    pointMultiplier: { type: Number, default: 1.0 },
    description: { type: String },
    color: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('MembershipTier', membershipTierSchema);
