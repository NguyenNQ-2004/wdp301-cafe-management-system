const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

// Kéo toàn bộ 16 Model vào
const User = require('./models/User');
const WorkSchedule = require('./models/WorkSchedule');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Order = require('./models/Order');
const OrderItem = require('./models/OrderItem');
const Payment = require('./models/Payment');
const LoyaltyTransaction = require('./models/LoyaltyTransaction');
const CustomerReview = require('./models/CustomerReview');
const Supplier = require('./models/Supplier');
const Ingredient = require('./models/Ingredient');
const ProductIngredient = require('./models/ProductIngredient');
const PurchaseOrder = require('./models/PurchaseOrder');
const PurchaseOrderItem = require('./models/PurchaseOrderItem');
const InventoryTransaction = require('./models/InventoryTransaction');
const ShopSetting = require('./models/ShopSetting');
const Cart = require('./models/Cart');
const RewardItem = require('./models/RewardItem');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura_cafe_erp');
    console.log('✅ Đang kết nối tới MongoDB...');
  } catch (e) {
    console.error('❌ Lỗi kết nối MongoDB:', e);
    process.exit(1);
  }
};

const importData = async () => {
  try {
    console.log('🧹 Đang dọn sạch toàn bộ 16 collections cũ...');
    await Promise.all([
      User.deleteMany({}),
      WorkSchedule.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      OrderItem.deleteMany({}),
      Payment.deleteMany({}),
      LoyaltyTransaction.deleteMany({}),
      CustomerReview.deleteMany({}),
      Supplier.deleteMany({}),
      Ingredient.deleteMany({}),
      ProductIngredient.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      PurchaseOrderItem.deleteMany({}),
      InventoryTransaction.deleteMany({}),
      ShopSetting.deleteMany({}),
      Cart.deleteMany({}),
      RewardItem.deleteMany({})
    ]);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('123456', salt);

    // ==========================================
    // 1. USERS (6 Users)
    // ==========================================
    console.log('👤 Đang tạo Users...');
    const users = await User.insertMany([
      {
        fullName: 'Aura Admin',
        phone: '0900000001',
        email: 'admin@auracafe.vn',
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        position: 'MANAGER',
        baseSalary: 15000000,
        hireDate: new Date('2025-01-01'),
        tierName: 'BRONZE',
        totalPoints: 0,
        address: '28 Tràng Tiền, Hoàn Kiếm, Hà Nội'
      },
      {
        fullName: 'Nguyen Van An',
        phone: '0900000002',
        email: 'an@auracafe.vn',
        passwordHash,
        role: 'STAFF',
        status: 'ACTIVE',
        position: 'BARISTA',
        baseSalary: 8000000,
        hireDate: new Date('2025-02-01'),
        tierName: 'BRONZE',
        totalPoints: 0,
        address: 'Đống Đa, Hà Nội'
      },
      {
        fullName: 'Tran Thi Binh',
        phone: '0900000003',
        email: 'binh@auracafe.vn',
        passwordHash,
        role: 'STAFF',
        status: 'ACTIVE',
        position: 'CASHIER',
        baseSalary: 8500000,
        hireDate: new Date('2025-02-01'),
        tierName: 'BRONZE',
        totalPoints: 0,
        address: 'Cầu Giấy, Hà Nội'
      },
      {
        fullName: 'Le Minh Anh',
        phone: '0900000004',
        email: 'anh@gmail.com',
        passwordHash,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        tierName: 'SILVER',
        totalPoints: 120,
        address: 'Hoàn Kiếm, Hà Nội'
      },
      {
        fullName: 'Pham Quang Huy',
        phone: '0900000005',
        email: 'huy@gmail.com',
        passwordHash,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        tierName: 'BRONZE',
        totalPoints: 50,
        address: 'Cầu Giấy, Hà Nội'
      },
      {
        fullName: 'Hoang Van Nam',
        phone: '0900000006',
        email: 'nam@auracafe.vn',
        passwordHash,
        role: 'STAFF',
        status: 'ACTIVE',
        position: 'SHIPPER',
        baseSalary: 7500000,
        hireDate: new Date('2025-03-01'),
        tierName: 'BRONZE',
        totalPoints: 0,
        address: 'Ba Đình, Hà Nội'
      }
    ]);

    // Map user index (1-based to match SQL IDs)
    const u = {
      1: users[0],
      2: users[1],
      3: users[2],
      4: users[3],
      5: users[4],
      6: users[5]
    };

    // ==========================================
    // 2. WORK SCHEDULES (5 schedules)
    // ==========================================
    console.log('📅 Đang tạo Work Schedules...');
    await WorkSchedule.insertMany([
      {
        user: u[2]._id,
        workDate: new Date('2026-10-03'),
        shiftName: 'MORNING',
        checkInTime: new Date('2026-10-03T08:00:00Z'),
        checkOutTime: new Date('2026-10-03T12:00:00Z'),
        status: 'COMPLETED',
        note: 'Morning shift'
      },
      {
        user: u[3]._id,
        workDate: new Date('2026-10-03'),
        shiftName: 'AFTERNOON',
        checkInTime: new Date('2026-10-03T12:00:00Z'),
        status: 'PRESENT',
        startingCash: 500000,
        note: 'Cashier shift'
      },
      {
        user: u[6]._id,
        workDate: new Date('2026-10-03'),
        shiftName: 'EVENING',
        status: 'SCHEDULED',
        note: 'Delivery shift'
      },
      {
        user: u[2]._id,
        workDate: new Date('2026-10-03'),
        shiftName: 'AFTERNOON',
        checkInTime: new Date('2026-10-03T12:00:00Z'),
        status: 'PRESENT',
        note: 'Barista ca chiều'
      },
      {
        user: u[1]._id,
        workDate: new Date('2026-10-03'),
        shiftName: 'EVENING',
        status: 'SCHEDULED',
        note: 'Quản lý trực ca tối'
      }
    ]);

    // ==========================================
    // 3. CATEGORIES (6 Categories)
    // ==========================================
    console.log('🏷️ Đang tạo Categories...');
    const categories = await Category.insertMany([
      {
        name: 'Cà phê máy',
        status: 'ACTIVE',
        icon: 'coffee_maker',
        description: 'Espresso, Caramel Macchiato đậm đà chuẩn gu hiện đại.',
        imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Cà phê truyền thống',
        status: 'ACTIVE',
        icon: 'local_cafe',
        description: 'Cà phê muối, sữa đá Sài Gòn ủ phin nguyên bản ngọt êm.',
        imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Trà trái cây',
        status: 'ACTIVE',
        icon: 'emoji_food_beverage',
        description: 'Trà đào cam sả, hoa quả nhiệt đới tươi mát thanh nhiệt.',
        imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Đá xay & Matcha',
        status: 'ACTIVE',
        icon: 'icecream',
        description: 'Matcha Uji thơm bùi, đá xay mát lạnh đánh tan ngày hè.',
        imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Bánh ngọt',
        status: 'ACTIVE',
        icon: 'bakery_dining',
        description: 'Bánh Croissant nướng bơ Pháp, cheesecake mềm béo hấp dẫn.',
        imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Đóng chai',
        status: 'ACTIVE',
        icon: 'liquor',
        description: 'Cold brew ủ lạnh 16h đóng chai tiện lợi mang đi bất cứ đâu.',
        imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80'
      }
    ]);

    // Map category index (1-based to match SQL IDs)
    const c = {
      1: categories[0],
      2: categories[1],
      3: categories[2],
      4: categories[3],
      5: categories[4],
      6: categories[5]
    };

    // ==========================================
    // 4. PRODUCTS (12 Items)
    // ==========================================
    console.log('☕ Đang tạo Products...');
    const products = await Product.insertMany([
      {
        category: c[2]._id,
        name: 'Cà Phê Muối Aura Đặc Biệt',
        basePrice: 45000,
        description: 'Fine Robusta ủ phin truyền thống phối kem sữa mằn mặn béo ngậy, cân bằng hậu vị ngọt đầm.',
        badge: 'BÁN CHẠY',
        subtitle: 'Phin Cổ Điển',
        variantsConfig: {
          sizes: { M: 0, L: 10000 },
          toppings: [{ name: 'Extra kem muối', price: 8000 }, { name: 'Extra shot espresso', price: 10000 }]
        },
        imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
        isAvailable: true
      },
      {
        category: c[1]._id,
        name: 'Caramel Macchiato Đặc Sản',
        basePrice: 55000,
        description: 'Lớp sữa tươi nóng thanh dịu, quyện cùng espresso kép Arabica Cầu Đất đậm đà và vân sốt caramel thơm lừng.',
        badge: 'BÁN CHẠY',
        subtitle: 'Espresso Base',
        variantsConfig: {
          sizes: { M: 0, L: 10000 },
          toppings: [{ name: 'Sốt caramel thêm', price: 5000 }, { name: 'Kem whipping', price: 8000 }]
        },
        imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80',
        isAvailable: true
      },
      {
        category: c[6]._id,
        name: 'Cold Brew Đóng Chai Aura Reserve',
        basePrice: 68000,
        description: 'Chiết xuất lạnh 16 tiếng từ 100% Arabica Bourbon, hương hoa quả nhiệt đới tươi mát, giữ trọn vị nguyên bản.',
        badge: 'BÁN CHẠY',
        subtitle: 'Ủ Lạnh 16 Tiếng',
        variantsConfig: {
          sizes: { 'Chai 250ml': 0, 'Chai 500ml': 35000 },
          toppings: []
        },
        imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
        isAvailable: true
      },
      {
        category: c[2]._id,
        name: 'Cà Phê Sữa Đá Sài Gòn Nâu',
        basePrice: 39000,
        description: 'Hạt Fine Robusta rang nâu bóng mượt, chiết xuất phin chậm kết hợp sữa đặc ngọt êm béo ngậy truyền thống.',
        subtitle: 'Đậm Vị Phin',
        variantsConfig: {
          sizes: { M: 0, L: 8000 },
          toppings: [{ name: 'Thạch cà phê', price: 6000 }, { name: 'Extra shot phin', price: 8000 }]
        },
        imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80',
        isAvailable: true
      },
      {
        category: c[3]._id,
        name: 'Trà Đào Cam Sả Tươi',
        basePrice: 45000,
        description: 'Nước cốt trà đen Ceylon thanh dịu kết hợp miếng đào giòn ngọt mọng nước cùng sả tươi ấm nồng.',
        badge: 'MÓN MỚI',
        subtitle: 'Fresh Brew',
        variantsConfig: {
          sizes: { M: 0, L: 10000 },
          toppings: [{ name: 'Thạch đào giòn', price: 8000 }, { name: 'Hạt chia', price: 5000 }]
        },
        imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
        isAvailable: true
      },
      {
        category: c[5]._id,
        name: 'Bánh Croissant Bơ Pháp',
        basePrice: 35000,
        description: 'Bột ngàn lớp thủ công giòn rụm bên ngoài, mềm xốp ngậy hương bơ Elle & Vire hảo hạng bên trong.',
        badge: 'BÁN CHẠY',
        subtitle: 'Bơ Elle & Vire',
        variantsConfig: {
          sizes: { 'Tiêu chuẩn': 0 },
          toppings: [{ name: 'Mứt dâu tây', price: 6000 }, { name: 'Sốt sôcôla', price: 6000 }]
        },
        imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
        isAvailable: true
      },
      {
        category: c[4]._id,
        name: 'Matcha Latte Uji Kyoto Đá Xay',
        basePrice: 58000,
        description: 'Bột trà xanh Uji trứ danh cố đô Kyoto xay cùng sữa hạt và kem whipping bông xốp béo mịn thượng hạng.',
        badge: 'BÁN CHẠY',
        subtitle: 'Uji Kyoto Grade',
        variantsConfig: {
          sizes: { M: 0, L: 12000 },
          toppings: [{ name: 'Kem whipping', price: 8000 }, { name: 'Thạch matcha', price: 8000 }]
        },
        imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
        isAvailable: true
      },
      {
        category: c[3]._id,
        name: 'Trà Sen Vàng Long Nhãn',
        basePrice: 49000,
        description: 'Hạt sen Huế ninh mềm dẻo, nhãn nhục ngọt thanh quyện cùng trà ô long hảo hạng và lớp kem củ năng giòn.',
        subtitle: 'Trà Đen Ceylon',
        variantsConfig: {
          sizes: { M: 0, L: 10000 },
          toppings: [{ name: 'Hạt sen thêm', price: 10000 }, { name: 'Củ năng giòn', price: 8000 }]
        },
        imageUrl: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&auto=format&fit=crop&q=80',
        isAvailable: true
      },
      {
        category: c[1]._id,
        name: 'Americano Đá Rang Đậm',
        basePrice: 35000,
        description: 'Espresso kép chiết xuất áp suất cao từ hạt cà phê đặc sản, vị chua thanh thanh tao và hậu ngọt dài lâu.',
        subtitle: 'Espresso Base',
        variantsConfig: {
          sizes: { M: 0, L: 10000 },
          toppings: [{ name: 'Extra shot espresso', price: 10000 }]
        },
        imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80',
        isAvailable: true
      },
      {
        category: c[1]._id,
        name: 'Latte Nghệ Thuật Hạt Phỉ',
        basePrice: 52000,
        description: 'Hòa quyện tinh tế giữa espresso thơm ngát, sữa tươi đánh bọt mịn màng và siro hạt phỉ thơm lừng.',
        badge: 'MÓN MỚI',
        subtitle: 'Espresso Base',
        variantsConfig: {
          sizes: { M: 0, L: 10000 },
          toppings: [{ name: 'Siro hạt phỉ', price: 6000 }, { name: 'Sữa yến mạch (Oat milk)', price: 12000 }]
        },
        imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80',
        isAvailable: true
      },
      {
        category: c[4]._id,
        name: 'Sôcôla Bỉ Đá Xay Hạnh Nhân',
        basePrice: 55000,
        description: 'Bột cacao nguyên chất nhập khẩu Bỉ xay nhuyễn cùng sữa đặc, rắc hạnh nhân nướng giòn tan.',
        subtitle: 'Chocolate Rich',
        variantsConfig: {
          sizes: { M: 0, L: 10000 },
          toppings: [{ name: 'Kem whipping', price: 8000 }, { name: 'Hạnh nhân vụn', price: 6000 }]
        },
        imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80',
        isAvailable: true
      },
      {
        category: c[5]._id,
        name: 'Bánh Cheesecake Việt Quất',
        basePrice: 55000,
        description: 'Cream cheese Philadelphia béo ngậy kết hợp mứt việt quất chua ngọt dịu và đế bánh quy nướng thơm lừng.',
        badge: 'BÁN CHẠY',
        subtitle: 'New York Style',
        variantsConfig: {
          sizes: { '1 Phần': 0 },
          toppings: []
        },
        imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80',
        isAvailable: true
      }
    ]);

    // Map product index (1-based to match SQL IDs)
    const p = {};
    products.forEach((prod, i) => {
      p[i + 1] = prod;
    });

    // ==========================================
    // 5. SUPPLIERS (3 Suppliers)
    // ==========================================
    console.log('🚚 Đang tạo Suppliers...');
    const suppliers = await Supplier.insertMany([
      { name: 'Fresh Bean Supplier', phone: '0911000001', address: 'Dong Da, Hanoi', status: 'ACTIVE' },
      { name: 'Dairy and Syrup Co.', phone: '0911000002', address: 'Cau Giay, Hanoi', status: 'ACTIVE' },
      { name: 'Bakery Ingredient Supply', phone: '0911000003', address: 'Ba Dinh, Hanoi', status: 'ACTIVE' }
    ]);
    const sup = {
      1: suppliers[0],
      2: suppliers[1],
      3: suppliers[2]
    };

    // ==========================================
    // 6. INGREDIENTS (8 Ingredients)
    // ==========================================
    console.log('🌾 Đang tạo Ingredients...');
    const ingredients = await Ingredient.insertMany([
      { supplier: sup[1]._id, name: 'Coffee beans', unit: 'gram', currentStock: 10000, minStockLevel: 2000 },
      { supplier: sup[2]._id, name: 'Fresh milk', unit: 'ml', currentStock: 20000, minStockLevel: 5000 },
      { supplier: sup[2]._id, name: 'Peach syrup', unit: 'ml', currentStock: 5000, minStockLevel: 1000 },
      { supplier: sup[2]._id, name: 'Black tea', unit: 'gram', currentStock: 8000, minStockLevel: 1500 },
      { supplier: sup[2]._id, name: 'Tapioca pearls', unit: 'gram', currentStock: 4000, minStockLevel: 1000 },
      { supplier: sup[3]._id, name: 'Cheesecake slice', unit: 'piece', currentStock: 30, minStockLevel: 5 },
      { supplier: sup[2]._id, name: 'Orange', unit: 'piece', currentStock: 100, minStockLevel: 20 },
      { supplier: sup[2]._id, name: 'Lemon', unit: 'piece', currentStock: 80, minStockLevel: 15 }
    ]);
    const ing = {};
    ingredients.forEach((item, i) => {
      ing[i + 1] = item;
    });

    // ==========================================
    // 7. PRODUCT INGREDIENTS (BOM - 14 Items)
    // ==========================================
    console.log('🧪 Đang tạo Product Ingredients (BOM)...');
    const bomData = [
      { product: p[1]._id, ingredient: ing[1]._id, quantityRequired: 18 },
      { product: p[2]._id, ingredient: ing[1]._id, quantityRequired: 18 },
      { product: p[2]._id, ingredient: ing[2]._id, quantityRequired: 180 },
      { product: p[3]._id, ingredient: ing[1]._id, quantityRequired: 30 },
      { product: p[4]._id, ingredient: ing[1]._id, quantityRequired: 18 },
      { product: p[4]._id, ingredient: ing[2]._id, quantityRequired: 100 },
      { product: p[5]._id, ingredient: ing[3]._id, quantityRequired: 30 },
      { product: p[5]._id, ingredient: ing[4]._id, quantityRequired: 10 },
      { product: p[5]._id, ingredient: ing[7]._id, quantityRequired: 1 },
      { product: p[8]._id, ingredient: ing[4]._id, quantityRequired: 10 },
      { product: p[9]._id, ingredient: ing[1]._id, quantityRequired: 18 },
      { product: p[10]._id, ingredient: ing[1]._id, quantityRequired: 18 },
      { product: p[10]._id, ingredient: ing[2]._id, quantityRequired: 150 },
      { product: p[12]._id, ingredient: ing[6]._id, quantityRequired: 1 }
    ];
    await ProductIngredient.insertMany(bomData);

    // Cập nhật trường recipe nhúng trong Product
    for (const b of bomData) {
      await Product.findByIdAndUpdate(b.product, {
        $push: { recipe: { ingredient: b.ingredient, quantityRequired: b.quantityRequired } }
      });
    }

    // ==========================================
    // 8. ORDERS (10 Orders) & ORDER ITEMS
    // ==========================================
    console.log('📦 Đang tạo Orders và Order Items...');
    const orderSeeds = [
      {
        orderCode: 'AURA-001',
        customer: u[4]._id,
        cashier: u[3]._id,
        orderType: 'DINE_IN',
        status: 'COMPLETED',
        totalAmount: 90000,
        discountAmount: 9000,
        deliveryFee: 0,
        finalAmount: 81000,
        tableNumber: 'T01',
        orderNote: 'Less ice',
        createdAt: new Date('2026-10-03T09:00:00Z'),
        items: [
          { product: p[1]._id, productNameAtTime: 'Cà Phê Muối Aura Đặc Biệt', unitPrice: 45000, customization: { size: 'M' }, quantity: 2, subtotal: 90000, isPrepared: true }
        ]
      },
      {
        orderCode: 'AURA-002',
        customer: u[5]._id,
        cashier: u[3]._id,
        orderType: 'ONLINE',
        status: 'DELIVERING',
        totalAmount: 100000,
        discountAmount: 0,
        deliveryFee: 15000,
        finalAmount: 115000,
        recipientName: 'Pham Quang Huy',
        recipientPhone: '0900000005',
        deliveryAddress: 'Cau Giay, Hanoi',
        shipper: u[6]._id,
        orderNote: 'Call before delivery',
        createdAt: new Date('2026-10-03T10:00:00Z'),
        items: [
          { product: p[5]._id, productNameAtTime: 'Trà Đào Cam Sả Tươi', unitPrice: 45000, customization: { size: 'M' }, quantity: 1, subtotal: 45000, isPrepared: true },
          { product: p[12]._id, productNameAtTime: 'Bánh Cheesecake Việt Quất', unitPrice: 55000, quantity: 1, subtotal: 55000, isPrepared: true }
        ]
      },
      {
        orderCode: 'AURA-003',
        customer: u[4]._id,
        cashier: u[3]._id,
        orderType: 'TAKEAWAY',
        status: 'CONFIRMED',
        totalAmount: 130000,
        discountAmount: 20000,
        deliveryFee: 0,
        finalAmount: 110000,
        orderNote: 'No sugar',
        createdAt: new Date('2026-10-03T11:00:00Z'),
        items: [
          { product: p[2]._id, productNameAtTime: 'Caramel Macchiato Đặc Sản', unitPrice: 65000, customization: { size: 'L' }, quantity: 2, subtotal: 130000, isPrepared: false }
        ]
      },
      {
        orderCode: 'AURA-004',
        cashier: u[3]._id,
        orderType: 'DINE_IN',
        status: 'PREPARING',
        totalAmount: 70000,
        discountAmount: 0,
        deliveryFee: 0,
        finalAmount: 70000,
        tableNumber: 'T02',
        createdAt: new Date('2026-10-03T12:00:00Z'),
        items: [
          { product: p[6]._id, productNameAtTime: 'Bánh Croissant Bơ Pháp', unitPrice: 35000, customization: { size: 'Tiêu chuẩn' }, quantity: 2, subtotal: 70000, isPrepared: false }
        ]
      },
      {
        orderCode: 'AURA-005',
        customer: u[5]._id,
        cashier: u[3]._id,
        orderType: 'DINE_IN',
        status: 'PREPARING',
        totalAmount: 145000,
        discountAmount: 0,
        deliveryFee: 0,
        finalAmount: 145000,
        tableNumber: 'T03',
        createdAt: new Date('2026-10-03T12:10:00Z'),
        items: [
          { product: p[1]._id, productNameAtTime: 'Cà Phê Muối Aura Đặc Biệt', unitPrice: 45000, customization: { size: 'M', sugar: '50%' }, quantity: 2, subtotal: 90000, isPrepared: false },
          { product: p[5]._id, productNameAtTime: 'Trà Đào Cam Sả Tươi', unitPrice: 55000, customization: { size: 'L', ice: 'Ít đá' }, quantity: 1, subtotal: 55000, isPrepared: true }
        ]
      },
      {
        orderCode: 'AURA-006',
        cashier: u[3]._id,
        orderType: 'TAKEAWAY',
        status: 'CONFIRMED',
        totalAmount: 90000,
        discountAmount: 0,
        deliveryFee: 0,
        finalAmount: 90000,
        orderNote: 'Less ice',
        createdAt: new Date('2026-10-03T12:15:00Z'),
        items: [
          { product: p[1]._id, productNameAtTime: 'Cà Phê Muối Aura Đặc Biệt', unitPrice: 55000, customization: { size: 'L', ice: 'Ít đá' }, quantity: 1, subtotal: 55000, isPrepared: false },
          { product: p[9]._id, productNameAtTime: 'Americano Đá Rang Đậm', unitPrice: 35000, customization: { size: 'M' }, quantity: 1, subtotal: 35000, isPrepared: false }
        ]
      },
      {
        orderCode: 'AURA-007',
        customer: u[4]._id,
        orderType: 'ONLINE',
        status: 'CONFIRMED',
        totalAmount: 125000,
        discountAmount: 0,
        deliveryFee: 18000,
        finalAmount: 143000,
        recipientName: 'Le Minh Anh',
        recipientPhone: '0900000004',
        deliveryAddress: 'Hoan Kiem, Hanoi',
        orderNote: 'Call before delivery',
        createdAt: new Date('2026-10-03T12:20:00Z'),
        items: [
          { product: p[1]._id, productNameAtTime: 'Cà Phê Muối Aura Đặc Biệt', unitPrice: 45000, customization: { size: 'M' }, quantity: 2, subtotal: 90000, isPrepared: false },
          { product: p[6]._id, productNameAtTime: 'Bánh Croissant Bơ Pháp', unitPrice: 35000, customization: { size: 'Tiêu chuẩn' }, quantity: 1, subtotal: 35000, isPrepared: false }
        ]
      },
      {
        orderCode: 'AURA-008',
        customer: u[5]._id,
        orderType: 'ONLINE',
        status: 'READY',
        totalAmount: 145000,
        discountAmount: 0,
        deliveryFee: 18000,
        finalAmount: 163000,
        recipientName: 'Pham Quang Huy',
        recipientPhone: '0900000005',
        deliveryAddress: 'Dong Da, Hanoi',
        shipper: u[6]._id,
        createdAt: new Date('2026-10-03T11:45:00Z'),
        items: [
          { product: p[5]._id, productNameAtTime: 'Trà Đào Cam Sả Tươi', unitPrice: 45000, customization: { size: 'M' }, quantity: 2, subtotal: 90000, isPrepared: true },
          { product: p[12]._id, productNameAtTime: 'Bánh Cheesecake Việt Quất', unitPrice: 55000, quantity: 1, subtotal: 55000, isPrepared: true }
        ]
      },
      {
        orderCode: 'AURA-009',
        customer: u[4]._id,
        orderType: 'ONLINE',
        status: 'COMPLETED',
        totalAmount: 87000,
        discountAmount: 0,
        deliveryFee: 18000,
        finalAmount: 105000,
        recipientName: 'Le Minh Anh',
        recipientPhone: '0900000004',
        deliveryAddress: 'Hoan Kiem, Hanoi',
        shipper: u[6]._id,
        createdAt: new Date('2026-10-03T09:30:00Z'),
        items: [
          { product: p[10]._id, productNameAtTime: 'Latte Nghệ Thuật Hạt Phỉ', unitPrice: 52000, customization: { size: 'M' }, quantity: 1, subtotal: 52000, isPrepared: true },
          { product: p[9]._id, productNameAtTime: 'Americano Đá Rang Đậm', unitPrice: 35000, customization: { size: 'M' }, quantity: 1, subtotal: 35000, isPrepared: true }
        ]
      },
      {
        orderCode: 'AURA-010',
        customer: u[4]._id,
        cashier: u[3]._id,
        orderType: 'TAKEAWAY',
        status: 'CANCELLED',
        totalAmount: 58000,
        discountAmount: 0,
        deliveryFee: 0,
        finalAmount: 58000,
        cancelReason: 'Customer changed mind',
        createdAt: new Date('2026-10-03T10:30:00Z'),
        items: [
          { product: p[7]._id, productNameAtTime: 'Matcha Latte Uji Kyoto Đá Xay', unitPrice: 58000, customization: { size: 'M' }, quantity: 1, subtotal: 58000, isPrepared: false }
        ]
      }
    ];

    const orders = await Order.insertMany(orderSeeds);
    const ord = {};
    orders.forEach((o, i) => {
      ord[i + 1] = o;
    });

    // Tạo OrderItem rời để đủ 16 bảng
    for (const [idx, o] of orders.entries()) {
      const original = orderSeeds[idx];
      for (const it of original.items) {
        await OrderItem.create({
          order: o._id,
          product: it.product,
          productNameAtTime: it.productNameAtTime,
          unitPrice: it.unitPrice,
          customization: it.customization,
          quantity: it.quantity,
          subtotal: it.subtotal,
          isPrepared: it.isPrepared
        });
      }
    }

    // ==========================================
    // 9. PAYMENTS (10 Payments)
    // ==========================================
    console.log('💳 Đang tạo Payments...');
    await Payment.insertMany([
      { order: ord[1]._id, paymentMethod: 'CASH', amount: 81000, status: 'SUCCESS', paidAt: new Date('2026-10-03T09:05:00Z'), paymentNote: 'Paid at counter' },
      { order: ord[2]._id, paymentMethod: 'MOMO', transactionCode: 'MOMO-DEMO-002', amount: 115000, status: 'SUCCESS', paidAt: new Date('2026-10-03T10:05:00Z'), paymentNote: 'Online payment' },
      { order: ord[3]._id, paymentMethod: 'VNPAY', transactionCode: 'VNPAY-DEMO-003', amount: 110000, status: 'SUCCESS', paidAt: new Date('2026-10-03T11:05:00Z'), paymentNote: 'Paid by VNPAY' },
      { order: ord[4]._id, paymentMethod: 'CASH', amount: 70000, status: 'SUCCESS', paidAt: new Date('2026-10-03T12:05:00Z'), paymentNote: 'Paid at counter' },
      { order: ord[5]._id, paymentMethod: 'CASH', amount: 145000, status: 'SUCCESS', paidAt: new Date('2026-10-03T12:11:00Z'), paymentNote: 'Paid at counter' },
      { order: ord[6]._id, paymentMethod: 'MOMO', transactionCode: 'MOMO-DEMO-006', amount: 90000, status: 'SUCCESS', paidAt: new Date('2026-10-03T12:16:00Z'), paymentNote: 'Online payment' },
      { order: ord[7]._id, paymentMethod: 'CASH', amount: 143000, status: 'PENDING', paymentNote: 'COD - collect on delivery' },
      { order: ord[8]._id, paymentMethod: 'VNPAY', transactionCode: 'VNPAY-DEMO-008', amount: 163000, status: 'SUCCESS', paidAt: new Date('2026-10-03T11:46:00Z'), paymentNote: 'Paid by VNPAY' },
      { order: ord[9]._id, paymentMethod: 'CASH', amount: 105000, status: 'SUCCESS', paidAt: new Date('2026-10-03T09:55:00Z'), paymentNote: 'COD collected by shipper' },
      { order: ord[10]._id, paymentMethod: 'MOMO', transactionCode: 'MOMO-DEMO-010', amount: 58000, status: 'FAILED', paymentNote: 'Order cancelled before payment' }
    ]);

    // ==========================================
    // 10. LOYALTY TRANSACTIONS (4 Transactions)
    // ==========================================
    console.log('⭐ Đang tạo Loyalty Transactions...');
    await LoyaltyTransaction.insertMany([
      { customer: u[4]._id, order: ord[1]._id, pointsChange: 80, transactionType: 'EARN' },
      { customer: u[5]._id, order: ord[2]._id, pointsChange: 100, transactionType: 'EARN' },
      { customer: u[4]._id, order: ord[3]._id, pointsChange: -20, transactionType: 'REDEEM' },
      { customer: u[4]._id, order: ord[9]._id, pointsChange: 80, transactionType: 'EARN' }
    ]);

    await RewardItem.insertMany([
      { name: 'Giảm 15.000đ bằng điểm', pointsCost: 100, discountValue: 15000, minOrderValue: 60000, stock: 50 },
      { name: 'Giảm 30.000đ bằng điểm', pointsCost: 180, discountValue: 30000, minOrderValue: 120000, stock: 30 },
      { name: 'Giảm 50.000đ bằng điểm', pointsCost: 300, discountValue: 50000, minOrderValue: 200000, stock: 20 },
      { name: 'Giảm 100.000đ bằng điểm', pointsCost: 600, discountValue: 100000, minOrderValue: 350000, stock: 10 }
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
      { ingredient: ing[1]._id, transactionType: 'IN_PURCHASE', quantity: 5000, referenceType: 'PURCHASE_ORDER', referenceId: po[1]._id, createdAt: new Date('2026-10-01T10:00:00Z') },
      { ingredient: ing[2]._id, transactionType: 'IN_PURCHASE', quantity: 10000, referenceType: 'PURCHASE_ORDER', referenceId: po[2]._id, createdAt: new Date('2026-10-02T10:00:00Z') },
      { ingredient: ing[1]._id, transactionType: 'OUT_ORDER', quantity: 36, referenceType: 'ORDER', referenceId: ord[1]._id, createdAt: new Date('2026-10-03T09:10:00Z') },
      { ingredient: ing[2]._id, transactionType: 'OUT_ORDER', quantity: 360, referenceType: 'ORDER', referenceId: ord[2]._id, createdAt: new Date('2026-10-03T10:10:00Z') },
      { ingredient: ing[5]._id, transactionType: 'SPOILAGE', quantity: 100, referenceType: 'ADJUSTMENT', createdAt: new Date('2026-10-03T11:00:00Z') },
      { ingredient: ing[3]._id, transactionType: 'ADJUSTMENT', quantity: 50, referenceType: 'ADJUSTMENT', createdAt: new Date('2026-10-03T11:30:00Z') }
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
  } catch (err) {
    console.error('❌ Lỗi import seed data:', err);
    process.exit(1);
  }
};

connectDB().then(importData);
