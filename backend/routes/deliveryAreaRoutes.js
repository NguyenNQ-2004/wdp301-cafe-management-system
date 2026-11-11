const express = require('express');
const mongoose = require('mongoose');
const DeliveryArea = require('../models/DeliveryArea');
const { protect } = require('../middlewares/authMiddleware');
const { hasShipperOnShift } = require('../utils/shipperAvailability');

const router = express.Router();

router.get('/availability', async (_req, res) => {
  try { res.json({ available: await hasShipperOnShift() }); }
  catch (error) { res.status(500).json({ message: error.message }); }
});

const DEFAULT_DISTRICTS = [
  { district: 'Cầu Giấy', deliveryFee: 18000, isActive: true },
  { district: 'Ba Đình', deliveryFee: 18000, isActive: true },
  { district: 'Hoàn Kiếm', deliveryFee: 18000, isActive: true },
  { district: 'Đống Đa', deliveryFee: 18000, isActive: true },
  { district: 'Hai Bà Trưng', deliveryFee: 18000, isActive: true },
  { district: 'Tây Hồ', deliveryFee: 20000, isActive: true },
  { district: 'Thanh Xuân', deliveryFee: 18000, isActive: true },
  { district: 'Hoàng Mai', deliveryFee: 22000, isActive: true },
  { district: 'Long Biên', deliveryFee: 25000, isActive: true },
  { district: 'Nam Từ Liêm', deliveryFee: 20000, isActive: true },
  { district: 'Bắc Từ Liêm', deliveryFee: 22000, isActive: true },
  { district: 'Hà Đông', deliveryFee: 25000, isActive: true }
];

async function ensureSeed() {
  const count = await DeliveryArea.countDocuments();
  if (count === 0) {
    try {
      await DeliveryArea.insertMany(DEFAULT_DISTRICTS, { ordered: false });
    } catch {
      // Ignore duplicate key if seeded concurrently
    }
  }
}

// Optional auth middleware for GET (to allow both public checkout and admin view)
const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  protect(req, res, (err) => {
    // If token invalid, just continue as unauthenticated
    next();
  });
};

// GET /api/delivery-areas: public gets active areas; Admin can see all with ?all=true
router.get('/', optionalAuth, async (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'ADMIN';
    const filter = isAdmin && req.query.all === 'true' ? {} : { isActive: true };
    const areas = await DeliveryArea.find(filter).sort({ district: 1 });
    res.json(areas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin-only middleware for mutations
const requireAdmin = [
  protect,
  (req, res, next) => {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Chỉ Quản trị viên (Admin) mới có quyền cấu hình khu vực giao hàng.' });
    }
    next();
  }
];

// POST /api/delivery-areas: Admin creates new delivery area
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { district, deliveryFee = 18000, isActive = true } = req.body || {};
    if (!district || typeof district !== 'string' || district.trim().length < 2 || district.trim().length > 100) {
      return res.status(400).json({ message: 'Tên quận/huyện phải từ 2 đến 100 ký tự.' });
    }
    const feeNum = Number(deliveryFee);
    if (!Number.isSafeInteger(feeNum) || feeNum < 0 || feeNum > 1000000) {
      return res.status(400).json({ message: 'Phí giao hàng phải là số nguyên từ 0 đến 1.000.000 VNĐ.' });
    }

    const trimmed = district.trim();
    const existing = await DeliveryArea.findOne({
      district: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    if (existing) {
      return res.status(409).json({ message: `Quận/huyện "${trimmed}" đã tồn tại trong danh mục khu vực.` });
    }

    const area = await DeliveryArea.create({
      district: trimmed,
      deliveryFee: feeNum,
      isActive: Boolean(isActive)
    });

    res.status(201).json(area);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/delivery-areas/:id: Admin updates delivery area
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Mã khu vực không hợp lệ.' });
    }
    const area = await DeliveryArea.findById(req.params.id);
    if (!area) {
      return res.status(404).json({ message: 'Không tìm thấy khu vực giao hàng.' });
    }

    const { district, deliveryFee, isActive } = req.body || {};

    if (district !== undefined) {
      if (typeof district !== 'string' || district.trim().length < 2 || district.trim().length > 100) {
        return res.status(400).json({ message: 'Tên quận/huyện phải từ 2 đến 100 ký tự.' });
      }
      const trimmed = district.trim();
      const existing = await DeliveryArea.findOne({
        _id: { $ne: area._id },
        district: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      if (existing) {
        return res.status(409).json({ message: `Quận/huyện "${trimmed}" đã tồn tại.` });
      }
      area.district = trimmed;
    }

    if (deliveryFee !== undefined) {
      const feeNum = Number(deliveryFee);
      if (!Number.isSafeInteger(feeNum) || feeNum < 0 || feeNum > 1000000) {
        return res.status(400).json({ message: 'Phí giao hàng phải là số nguyên từ 0 đến 1.000.000 VNĐ.' });
      }
      area.deliveryFee = feeNum;
    }

    if (isActive !== undefined) {
      area.isActive = Boolean(isActive);
    }

    await area.save();
    res.json(area);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/delivery-areas/:id: Admin deletes delivery area
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Mã khu vực không hợp lệ.' });
    }
    const deleted = await DeliveryArea.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy khu vực giao hàng.' });
    }
    res.json({ message: 'Đã xóa khu vực giao hàng thành công.', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/delivery-areas/seed-defaults: Admin seeds default delivery areas
router.post('/seed-defaults', requireAdmin, async (req, res) => {
  try {
    let createdCount = 0;
    for (const item of DEFAULT_DISTRICTS) {
      const existing = await DeliveryArea.findOne({
        district: { $regex: new RegExp(`^${item.district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      if (!existing) {
        await DeliveryArea.create(item);
        createdCount++;
      }
    }
    const all = await DeliveryArea.find().sort({ district: 1 });
    res.json({ message: `Đã nạp ${createdCount} khu vực giao hàng mặc định.`, count: createdCount, areas: all });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.ensureSeed = ensureSeed;
router.DEFAULT_DISTRICTS = DEFAULT_DISTRICTS;

module.exports = router;
