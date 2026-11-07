const express = require('express');
const ShopSetting = require('../models/ShopSetting');
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const { validateSettings, isPublicSettingKey } = require('../utils/shopSettings');
const { sendError } = require('../utils/adminValidation');

const { atomicRouter } = require('../utils/atomicRoute');
const router = atomicRouter(express.Router());

// 1. GET ALL SETTINGS (Public - Frontend đọc cấu hình phí ship, giờ ca, tên quán, điểm)
router.get('/', async (req, res) => {
  try {
    const settings = (await ShopSetting.find()).filter(item => isPublicSettingKey(item.settingKey));
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
    const current = Object.fromEntries((await ShopSetting.find().lean()).map(setting => [setting.settingKey, setting.settingValue]));
    const updates = validateSettings(req.body, current);
    await ShopSetting.bulkWrite(Object.entries(updates).map(([key, value]) => ({ updateOne: {
      filter: { settingKey: key }, update: { $set: { settingValue: value } }, upsert: true
    } })));
    const all = (await ShopSetting.find()).filter(item => isPublicSettingKey(item.settingKey));
    const map = {};
    all.forEach(s => { map[s.settingKey] = s.settingValue; });
    res.json({ message: 'Cập nhật cấu hình cửa hàng thành công!', settings: map });
  } catch (error) {
    sendError(res, error);
  }
});

module.exports = router;
