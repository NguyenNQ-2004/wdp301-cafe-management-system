const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Kéo các Model vào
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Voucher = require('./models/Voucher');
const Supplier = require('./models/Supplier');
const Ingredient = require('./models/Ingredient');
const RewardItem = require('./models/RewardItem');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Đang kết nối tới MongoDB...');
  } catch (e) {
    console.log(e); process.exit(1);
  }
};

const importData = async () => {
  try {
    // 0. Xóa sạch dữ liệu cũ để tránh trùng lặp
    await User.deleteMany();
    await Category.deleteMany();
    await Product.deleteMany();
    await Voucher.deleteMany();
    await Supplier.deleteMany();
    await Ingredient.deleteMany();
    await RewardItem.deleteMany();

    // 1. Users
    await User.insertMany([
      { fullName: 'Aura Admin', phone: '0900000001', email: 'admin@auracafe.vn', passwordHash: 'demo_hash', role: 'ADMIN', position: 'MANAGER', baseSalary: 15000000 },
      { fullName: 'Nguyen Van An', phone: '0900000002', email: 'an@auracafe.vn', passwordHash: 'demo_hash', role: 'STAFF', position: 'BARISTA', baseSalary: 8000000 },
      { fullName: 'Tran Thi Binh', phone: '0900000003', email: 'binh@auracafe.vn', passwordHash: 'demo_hash', role: 'STAFF', position: 'CASHIER', baseSalary: 8500000 },
      { fullName: 'Le Minh Anh', phone: '0900000004', email: 'anh@gmail.com', passwordHash: 'demo_hash', role: 'CUSTOMER', tierName: 'SILVER', totalPoints: 120 },
      { fullName: 'Pham Quang Huy', phone: '0900000005', email: 'huy@gmail.com', passwordHash: 'demo_hash', role: 'CUSTOMER', tierName: 'BRONZE', totalPoints: 50 },
      { fullName: 'Hoang Van Nam', phone: '0900000006', email: 'nam@auracafe.vn', passwordHash: 'demo_hash', role: 'STAFF', position: 'SHIPPER', baseSalary: 7500000 }
    ]);

    // 2. Categories
    const categories = await Category.insertMany([
      { name: 'Cà phê máy', icon: 'coffee_maker' },
      { name: 'Cà phê truyền thống', icon: 'local_cafe' },
      { name: 'Trà trái cây', icon: 'emoji_food_beverage' },
      { name: 'Đá xay & Matcha', icon: 'icecream' },
      { name: 'Bánh ngọt', icon: 'bakery_dining' },
      { name: 'Đóng chai', icon: 'liquor' }
    ]);

    // 3. Products (Map theo Category_id động của MongoDB)
    await Product.insertMany([
      { category: categories[1]._id, name: 'Cà Phê Muối Aura Đặc Biệt', basePrice: 45000, badge: 'BÁN CHẠY', subtitle: 'Phin Cổ Điển', variantsConfig: { sizes: { M: 0, L: 10000 }, toppings: [{ name: 'Extra kem muối', price: 8000 }] }, description: 'Fine Robusta ủ phin truyền thống phối kem sữa.', imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80' },
      { category: categories[0]._id, name: 'Caramel Macchiato Đặc Sản', basePrice: 55000, badge: 'BÁN CHẠY', subtitle: 'Espresso Base', variantsConfig: { sizes: { M: 0, L: 10000 }, toppings: [{ name: 'Sốt caramel thêm', price: 5000 }] }, imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80' },
      { category: categories[5]._id, name: 'Cold Brew Đóng Chai Aura Reserve', basePrice: 68000, badge: 'BÁN CHẠY', subtitle: 'Ủ Lạnh 16 Tiếng', imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80' },
      { category: categories[1]._id, name: 'Cà Phê Sữa Đá Sài Gòn Nâu', basePrice: 39000, subtitle: 'Đậm Vị Phin', imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80' },
      { category: categories[2]._id, name: 'Trà Đào Cam Sả Tươi', basePrice: 45000, badge: 'MÓN MỚI', subtitle: 'Fresh Brew', variantsConfig: { sizes: { M: 0, L: 10000 } }, imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80' },
      { category: categories[4]._id, name: 'Bánh Croissant Bơ Pháp', basePrice: 35000, badge: 'BÁN CHẠY', imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80' },
      { category: categories[3]._id, name: 'Matcha Latte Uji Kyoto Đá Xay', basePrice: 58000, badge: 'BÁN CHẠY', subtitle: 'Uji Kyoto Grade', imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80' },
      { category: categories[2]._id, name: 'Trà Sen Vàng Long Nhãn', basePrice: 49000, subtitle: 'Trà Đen Ceylon', imageUrl: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&auto=format&fit=crop&q=80' },
      { category: categories[0]._id, name: 'Americano Đá Rang Đậm', basePrice: 35000, subtitle: 'Espresso Base', imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80' },
      { category: categories[0]._id, name: 'Latte Nghệ Thuật Hạt Phỉ', basePrice: 52000, badge: 'MÓN MỚI', subtitle: 'Espresso Base', imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80' },
      { category: categories[3]._id, name: 'Sôcôla Bỉ Đá Xay Hạnh Nhân', basePrice: 55000, subtitle: 'Chocolate Rich', imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80' },
      { category: categories[4]._id, name: 'Bánh Cheesecake Việt Quất', basePrice: 55000, badge: 'BÁN CHẠY', subtitle: 'New York Style', imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80' }
    ]);

    // 4. Vouchers
    await Voucher.insertMany([
      { code: 'WELCOME10', discountType: 'PERCENT', discountValue: 10, minOrderValue: 50000, maxDiscount: 30000, usageLimit: 100 },
      { code: 'AURA20000', discountType: 'FIXED_AMOUNT', discountValue: 20000, minOrderValue: 100000, usageLimit: 50 },
      { code: 'SUMMER15', discountType: 'PERCENT', discountValue: 15, minOrderValue: 80000, maxDiscount: 25000, usageLimit: 200 }
    ]);

    // 5. Suppliers & Ingredients
    const suppliers = await Supplier.insertMany([
      { name: 'Fresh Bean Supplier', phone: '0911000001' },
      { name: 'Dairy and Syrup Co.', phone: '0911000002' },
      { name: 'Bakery Ingredient Supply', phone: '0911000003' }
    ]);

    await Ingredient.insertMany([
      { supplier: suppliers[0]._id, name: 'Coffee beans', unit: 'gram', currentStock: 10000, minStockLevel: 2000 },
      { supplier: suppliers[1]._id, name: 'Fresh milk', unit: 'ml', currentStock: 20000, minStockLevel: 5000 },
      { supplier: suppliers[1]._id, name: 'Peach syrup', unit: 'ml', currentStock: 5000, minStockLevel: 1000 },
      { supplier: suppliers[1]._id, name: 'Black tea', unit: 'gram', currentStock: 8000, minStockLevel: 1500 },
      { supplier: suppliers[1]._id, name: 'Tapioca pearls', unit: 'gram', currentStock: 4000, minStockLevel: 1000 },
      { supplier: suppliers[2]._id, name: 'Cheesecake slice', unit: 'piece', currentStock: 30, minStockLevel: 5 },
      { supplier: suppliers[1]._id, name: 'Orange', unit: 'piece', currentStock: 100, minStockLevel: 20 },
      { supplier: suppliers[1]._id, name: 'Lemon', unit: 'piece', currentStock: 80, minStockLevel: 15 }
    ]);

    // 6. Reward Items
    await RewardItem.insertMany([
      { name: 'Voucher giảm 15.000đ', pointsCost: 100, discountValue: 15000, minOrderValue: 60000, stock: 50 },
      { name: 'Voucher giảm 30.000đ', pointsCost: 180, discountValue: 30000, minOrderValue: 120000, stock: 30 },
      { name: 'Voucher giảm 50.000đ', pointsCost: 300, discountValue: 50000, minOrderValue: 200000, stock: 20 },
      { name: 'Voucher giảm 100.000đ', pointsCost: 600, discountValue: 100000, minOrderValue: 350000, stock: 10 }
    ]);

    console.log('🎉 ĐÃ NHỒI TOÀN BỘ DỮ LIỆU THÀNH CÔNG VÀO DATABASE!');
    process.exit();
  } catch (err) {
    console.error(err); process.exit(1);
  }
}
connectDB().then(importData);
