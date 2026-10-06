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
const Voucher = require('./models/Voucher');
const Supplier = require('./models/Supplier');
const Ingredient = require('./models/Ingredient');
const RewardItem = require('./models/RewardItem');

// ==========================================
// DANH SÁCH TOÀN BỘ CÁC API ĐỂ TEST POSTMAN
// ==========================================

// 1. NHÓM API NGƯỜI DÙNG (USERS)
app.get('/api/users', async (req, res) => {
  try { res.status(200).json(await User.find({})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. NHÓM API DANH MỤC (CATEGORIES)
app.get('/api/categories', async (req, res) => {
  try { res.status(200).json(await Category.find({})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. NHÓM API SẢN PHẨM (PRODUCTS)
app.get('/api/products', async (req, res) => {
  try { res.status(200).json(await Product.find({}).populate('category', 'name')); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 4. NHÓM API ĐƠN HÀNG (ORDERS)
app.get('/api/orders', async (req, res) => {
  try { res.status(200).json(await Order.find({})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 5. NHÓM API VOUCHER (MÃ GIẢM GIÁ)
app.get('/api/vouchers', async (req, res) => {
  try { res.status(200).json(await Voucher.find({})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 6. NHÓM API NHÀ CUNG CẤP (SUPPLIERS)
app.get('/api/suppliers', async (req, res) => {
  try { res.status(200).json(await Supplier.find({})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 7. NHÓM API NGUYÊN LIỆU KHO (INGREDIENTS)
app.get('/api/ingredients', async (req, res) => {
  try { res.status(200).json(await Ingredient.find({}).populate('supplier', 'name')); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 8. NHÓM API QUÀ TẶNG (REWARD ITEMS)
app.get('/api/rewards', async (req, res) => {
  try { res.status(200).json(await RewardItem.find({})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

// 6. Khởi chạy Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
});
