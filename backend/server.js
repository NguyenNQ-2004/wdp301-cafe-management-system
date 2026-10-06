const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// 1. Tải biến môi trường từ file .env
dotenv.config();

// 2. Khởi tạo kết nối đến MongoDB Compass
connectDB();

// 3. Khởi tạo app Express
const app = express();

// 4. Cấu hình middleware
app.use(cors()); // Cho phép Frontend gọi API mà không bị lỗi CORS
app.use(express.json()); // Cho phép Express đọc dữ liệu JSON từ body request

// 5. Định nghĩa Route cơ bản để test server
app.get('/', (req, res) => {
  res.send('API của hệ thống Aura Cafe ERP đang hoạt động...');
});

// Load Models
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Order = require('./models/Order');

// ==========================================
// DANH SÁCH CÁC API CƠ BẢN ĐỂ TEST POSTMAN
// ==========================================

// 1. API ĐỂ TEST TẠO DỮ LIỆU ADMIN ĐẦU TIÊN (SEED)
app.get('/api/seed', async (req, res) => {
  try {
    const adminExists = await User.findOne({ role: 'ADMIN' });
    if (adminExists) {
      return res.status(200).json({ message: 'Admin đã tồn tại, hãy kiểm tra lại MongoDB Compass nhé!' });
    }

    const createdUser = await User.create({
      fullName: 'Aura Admin',
      phone: '0900000001',
      email: 'admin@auracafe.vn',
      passwordHash: 'demo_hash', 
      role: 'ADMIN',
      position: 'MANAGER',
      baseSalary: 15000000
    });

    res.status(201).json({ message: '✅ Đã tạo tài khoản Admin!', user: createdUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. NHÓM API NGƯỜI DÙNG (USERS)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. NHÓM API DANH MỤC (CATEGORIES)
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find({});
    res.status(200).json(categories);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.post('/api/categories', async (req, res) => {
  try {
    // Body mẫu: { "name": "Cà phê máy", "icon": "coffee_maker" }
    const newCategory = await Category.create(req.body);
    res.status(201).json(newCategory);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 4. NHÓM API SẢN PHẨM (PRODUCTS)
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({}).populate('category', 'name'); // Kéo theo tên danh mục
    res.status(200).json(products);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.post('/api/products', async (req, res) => {
  try {
    const newProduct = await Product.create(req.body);
    res.status(201).json(newProduct);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 5. NHÓM API ĐƠN HÀNG (ORDERS)
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find({});
    res.status(200).json(orders);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 6. Khởi chạy Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
});
