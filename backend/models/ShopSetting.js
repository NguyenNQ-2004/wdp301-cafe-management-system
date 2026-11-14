const mongoose = require('mongoose');

const shopSettingSchema = new mongoose.Schema({
  settingKey: { type: String, required: true, unique: true },
  settingValue: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('ShopSetting', shopSettingSchema);
