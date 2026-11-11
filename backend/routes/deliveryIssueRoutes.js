const router = require('express').Router();
const DeliveryIssue = require('../models/DeliveryIssue');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, async (req, res, next) => {
  try {
    const admin = req.user.role === 'ADMIN' || (req.user.role === 'STAFF' && req.user.position === 'MANAGER');
    if (!admin && !(req.user.role === 'STAFF' && req.user.position === 'SHIPPER')) return res.status(403).json({ message: 'Không có quyền xem sự cố giao hàng.' });
    const issues = await DeliveryIssue.find(admin ? {} : { reporter: req.user._id })
      .populate('order', 'orderCode status').populate('reporter', 'fullName').sort({ createdAt: -1 });
    res.json(issues);
  } catch (error) { next(error); }
});

module.exports = router;
