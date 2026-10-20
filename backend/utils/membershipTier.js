const MembershipTier = require('../models/MembershipTier');
const Order = require('../models/Order');

async function ensureDefaultTiers() {
  const count = await MembershipTier.countDocuments();
  if (count === 0) {
    await MembershipTier.insertMany([
      {
        tierCode: 'BRONZE',
        tierName: 'Đồng',
        minPoints: 0,
        minSpent: 0,
        discountPercent: 0,
        pointMultiplier: 1.0,
        description: 'Hạng khởi đầu mặc định khi đăng ký hội viên.',
        color: '#b45309'
      },
      {
        tierCode: 'SILVER',
        tierName: 'Bạc',
        minPoints: 50,
        minSpent: 500000,
        discountPercent: 5,
        pointMultiplier: 1.1,
        description: 'Ngưỡng 50 điểm hoặc 500k chi tiêu. Giảm giá 5% và nhân 1.1 điểm.',
        color: '#64748b'
      },
      {
        tierCode: 'GOLD',
        tierName: 'Vàng',
        minPoints: 150,
        minSpent: 1500000,
        discountPercent: 10,
        pointMultiplier: 1.25,
        description: 'Ngưỡng 150 điểm hoặc 1.5tr chi tiêu. Giảm giá 10% và nhân 1.25 điểm.',
        color: '#eab308'
      },
      {
        tierCode: 'DIAMOND',
        tierName: 'Kim Cương',
        minPoints: 300,
        minSpent: 3000000,
        discountPercent: 15,
        pointMultiplier: 1.5,
        description: 'Ngưỡng 300 điểm hoặc 3tr chi tiêu. Giảm giá 15% và nhân 1.5 điểm.',
        color: '#06b6d4'
      }
    ]);
  }
}

async function evaluateAndUpdateTier(user) {
  if (!user || user.role !== 'CUSTOMER') return { newTier: 'BRONZE', changed: false, totalSpent: 0 };
  await ensureDefaultTiers();
  const tiers = await MembershipTier.find({}).sort({ minPoints: -1 });

  const completedOrders = await Order.find({ customer: user._id, status: 'COMPLETED' });
  const totalSpent = completedOrders.reduce((sum, o) => sum + (o.finalAmount || 0), 0);

  let newTier = 'BRONZE';
  for (const tier of tiers) {
    if ((user.totalPoints || 0) >= tier.minPoints || totalSpent >= tier.minSpent) {
      newTier = tier.tierCode;
      break;
    }
  }

  const changed = user.tierName !== newTier;
  if (changed) {
    user.tierName = newTier;
    await user.save();
  }
  return { newTier, changed, totalSpent };
}

module.exports = { ensureDefaultTiers, evaluateAndUpdateTier };
