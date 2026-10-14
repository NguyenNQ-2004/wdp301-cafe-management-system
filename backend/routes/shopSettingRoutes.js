const express = require('express');
const ShopSetting = require('../models/ShopSetting');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();

// 1. GET ALL SETTINGS (Public - Frontend đọc cấu hình phí ship, giờ ca, tên quán, điểm)
router.get('/', async (req, res) => {
  try {
    const settings = await ShopSetting.find({});
    // Trả về vừa dạng array vừa dạng key-value map tiện lợi
    const map = {};
    settings.forEach(s => {
      map[s.settingKey] = s.settingValue;
    });
    res.json({ list: settings, settings: map });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. BULK UPDATE OR SET SETTING (ADMIN ONLY)
router.put('/', protect, adminOnly, async (req, res) => {
  try {
    const updates = req.body; // { key: value, ... }
    for (const [key, value] of Object.entries(updates)) {
      await ShopSetting.findOneAndUpdate(
        { settingKey: key },
        { settingValue: String(value) },
        { upsert: true, returnDocument: 'after' }
      );
    }
    const all = await ShopSetting.find({});
    const map = {};
    all.forEach(s => { map[s.settingKey] = s.settingValue; });
    res.json({ message: 'Cập nhật cấu hình cửa hàng thành công!', settings: map });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
