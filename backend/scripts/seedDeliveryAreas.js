const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const DeliveryArea = require('../models/DeliveryArea');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

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

async function seed() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27019/aura_cafe_erp?replicaSet=auraCafeLocal';
  console.log('Connecting to:', mongoUri);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  for (const item of DEFAULT_DISTRICTS) {
    const existing = await DeliveryArea.findOne({
      district: { $regex: new RegExp(`^${item.district}$`, 'i') }
    });
    if (!existing) {
      await DeliveryArea.create(item);
      console.log(`+ Đã thêm khu vực: ${item.district} (${item.deliveryFee}đ)`);
    } else {
      console.log(`= Đã tồn tại khu vực: ${item.district}`);
    }
  }

  const total = await DeliveryArea.countDocuments();
  console.log(`Hoàn tất! Tổng số khu vực giao hàng: ${total}`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Lỗi khi nạp khu vực giao hàng:', err.message);
  process.exit(1);
});
