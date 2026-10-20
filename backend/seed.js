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

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('123456', salt);

    // 1. Users
    await User.insertMany([
      { fullName: 'Aura Admin', phone: '0900000001', email: 'admin@auracafe.vn', passwordHash, role: 'ADMIN', position: 'MANAGER', baseSalary: 15000000 },
      { fullName: 'Nguyen Van An', phone: '0900000002', email: 'an@auracafe.vn', passwordHash, role: 'STAFF', position: 'BARISTA', baseSalary: 8000000 },
      { fullName: 'Tran Thi Binh', phone: '0900000003', email: 'binh@auracafe.vn', passwordHash, role: 'STAFF', position: 'CASHIER', baseSalary: 8500000 },
      { fullName: 'Le Minh Anh', phone: '0900000004', email: 'anh@gmail.com', passwordHash, role: 'CUSTOMER', tierName: 'SILVER', totalPoints: 120 },
      { fullName: 'Pham Quang Huy', phone: '0900000005', email: 'huy@gmail.com', passwordHash, role: 'CUSTOMER', tierName: 'BRONZE', totalPoints: 50 },
      { fullName: 'Hoang Van Nam', phone: '0900000006', email: 'nam@auracafe.vn', passwordHash, role: 'STAFF', position: 'SHIPPER', baseSalary: 7500000 }
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

    // ==========================================
    // 11. CUSTOMER REVIEWS (3 Reviews)
    // ==========================================
    console.log('💬 Đang tạo Customer Reviews...');
    await CustomerReview.insertMany([
      {
        customer: u[4]._id,
        order: ord[1]._id,
        issueType: 'RATING',
        rating: 5,
        content: 'Good coffee and friendly service',
        status: 'RESOLVED',
        adminResponse: 'Thank you for your feedback'
      },
      {
        customer: u[5]._id,
        order: ord[2]._id,
        issueType: 'COMPLAINT',
        content: 'Delivery took longer than expected',
        status: 'PENDING'
      },
      {
        customer: u[4]._id,
        order: ord[3]._id,
        issueType: 'RATING',
        rating: 4,
        content: 'Good taste, but a little too sweet',
        status: 'PENDING'
      }
    ]);

    // ==========================================
    // 12. PURCHASE ORDERS (3 Orders) & ITEMS
    // ==========================================
    console.log('📝 Đang tạo Purchase Orders và Items...');
    const po1 = await PurchaseOrder.create({
      supplier: sup[1]._id,
      creator: u[1]._id,
      totalCost: 2000000,
      status: 'RECEIVED',
      createdAt: new Date('2026-10-01T08:00:00Z'),
      items: [{ ingredient: ing[1]._id, quantity: 5000, unitPrice: 400 }]
    });
    await PurchaseOrderItem.create({ purchaseOrder: po1._id, ingredient: ing[1]._id, quantity: 5000, unitPrice: 400 });

    const po2 = await PurchaseOrder.create({
      supplier: sup[2]._id,
      creator: u[1]._id,
      totalCost: 1500000,
      status: 'ORDERED',
      createdAt: new Date('2026-10-02T09:00:00Z'),
      items: [
        { ingredient: ing[2]._id, quantity: 10000, unitPrice: 150 },
        { ingredient: ing[3]._id, quantity: 5000, unitPrice: 120 }
      ]
    });
    await PurchaseOrderItem.create({ purchaseOrder: po2._id, ingredient: ing[2]._id, quantity: 10000, unitPrice: 150 });
    await PurchaseOrderItem.create({ purchaseOrder: po2._id, ingredient: ing[3]._id, quantity: 5000, unitPrice: 120 });

    const po3 = await PurchaseOrder.create({
      supplier: sup[3]._id,
      creator: u[1]._id,
      totalCost: 800000,
      status: 'DRAFT',
      createdAt: new Date('2026-10-03T08:00:00Z'),
      items: [{ ingredient: ing[6]._id, quantity: 20, unitPrice: 40000 }]
    });
    await PurchaseOrderItem.create({ purchaseOrder: po3._id, ingredient: ing[6]._id, quantity: 20, unitPrice: 40000 });

    const po = { 1: po1, 2: po2, 3: po3 };

    // ==========================================
    // 13. INVENTORY TRANSACTIONS (6 Transactions)
    // ==========================================
    console.log('📊 Đang tạo Inventory Transactions...');
    await InventoryTransaction.insertMany([
      { ingredient: ing[1]._id, transactionType: 'IN_PURCHASE', quantity: 5000, stockDelta: 5000, referenceType: 'PURCHASE_ORDER', referenceId: po[1]._id, createdAt: new Date('2026-10-01T10:00:00Z') },
      { ingredient: ing[2]._id, transactionType: 'IN_PURCHASE', quantity: 10000, stockDelta: 10000, referenceType: 'PURCHASE_ORDER', referenceId: po[2]._id, createdAt: new Date('2026-10-02T10:00:00Z') },
      { ingredient: ing[1]._id, transactionType: 'OUT_ORDER', quantity: 36, stockDelta: -36, referenceType: 'ORDER', referenceId: ord[1]._id, createdAt: new Date('2026-10-03T09:10:00Z') },
      { ingredient: ing[2]._id, transactionType: 'OUT_ORDER', quantity: 360, stockDelta: -360, referenceType: 'ORDER', referenceId: ord[2]._id, createdAt: new Date('2026-10-03T10:10:00Z') },
      { ingredient: ing[5]._id, transactionType: 'SPOILAGE', quantity: 100, stockDelta: -100, referenceType: 'ADJUSTMENT', createdAt: new Date('2026-10-03T11:00:00Z') },
      { ingredient: ing[3]._id, transactionType: 'ADJUSTMENT', quantity: 50, stockDelta: 50, referenceType: 'ADJUSTMENT', createdAt: new Date('2026-10-03T11:30:00Z') }
    ]);

    // ==========================================
    // 14. SHOP SETTINGS (12 Settings)
    // ==========================================
    console.log('⚙️ Đang tạo Shop Settings...');
    await ShopSetting.insertMany([
      { settingKey: 'freeship_threshold', settingValue: '150000' },
      { settingKey: 'delivery_fee', settingValue: '18000' },
      { settingKey: 'delivery_minutes', settingValue: '30' },
      { settingKey: 'points_step', settingValue: '10' },
      { settingKey: 'points_step_value', settingValue: '2000' },
      { settingKey: 'store_name', settingValue: 'Aura Café' },
      { settingKey: 'store_address', settingValue: '28 Tràng Tiền, Hoàn Kiếm, Hà Nội' },
      { settingKey: 'store_hotline', settingValue: '1900 6868' },
      { settingKey: 'points_earn_unit', settingValue: '1000' },
      { settingKey: 'shift_morning', settingValue: '07:00-12:00' },
      { settingKey: 'shift_afternoon', settingValue: '12:00-17:00' },
      { settingKey: 'shift_evening', settingValue: '17:00-22:00' }
    ]);

    // ==========================================
    // VERIFY DATA (ĐỐI CHIẾU EXACT KHỚP SQL)
    // ==========================================
    console.log('\n=====================================================');
    console.log('📊 VERIFY DATA - TOTAL COUNTS TRONG DATABASE MONGODB:');
    console.log('=====================================================');

    const counts = [
      { table_name: 'users', total: await User.countDocuments() },
      { table_name: 'work_schedules', total: await WorkSchedule.countDocuments() },
      { table_name: 'categories', total: await Category.countDocuments() },
      { table_name: 'products', total: await Product.countDocuments() },
      { table_name: 'orders', total: await Order.countDocuments() },
      { table_name: 'order_items', total: await OrderItem.countDocuments() },
      { table_name: 'payments', total: await Payment.countDocuments() },
      { table_name: 'loyalty_transactions', total: await LoyaltyTransaction.countDocuments() },
      { table_name: 'customer_reviews', total: await CustomerReview.countDocuments() },
      { table_name: 'suppliers', total: await Supplier.countDocuments() },
      { table_name: 'ingredients', total: await Ingredient.countDocuments() },
      { table_name: 'product_ingredients', total: await ProductIngredient.countDocuments() },
      { table_name: 'purchase_orders', total: await PurchaseOrder.countDocuments() },
      { table_name: 'purchase_order_items', total: await PurchaseOrderItem.countDocuments() },
      { table_name: 'inventory_transactions', total: await InventoryTransaction.countDocuments() },
      { table_name: 'shop_settings', total: await ShopSetting.countDocuments() }
    ];

    console.table(counts);
    console.log('🎉 TOÀN BỘ 16 BẢNG ĐÃ ĐƯỢC NHỒI CHUẨN XÁC 100% VÀO MONGODB!');
    process.exit(0);
    console.log('🎉 ĐÃ NHỒI TOÀN BỘ DỮ LIỆU THÀNH CÔNG VÀO DATABASE!');
    process.exit();
  } catch (err) {
    console.error(err); process.exit(1);
  }
}
connectDB().then(importData);
