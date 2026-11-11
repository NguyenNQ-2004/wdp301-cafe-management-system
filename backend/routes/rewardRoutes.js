const express = require('express');
const RewardItem = require('../models/RewardItem');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'CUSTOMER') return res.json({ totalPoints: 0, rewards: [], canRedeem: false });
    const rewards = await RewardItem.find({
      status: 'ACTIVE',
      pointsCost: { $gt: 0 },
      discountValue: { $gt: 0 },
      $or: [{ stock: -1 }, { stock: { $gt: 0 } }]
    }).sort({ pointsCost: 1 });
    return res.json({ totalPoints: req.user.totalPoints || 0, rewards, canRedeem: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
