const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API của hệ thống Aura Cafe ERP đang hoạt động...');
});

// ==========================================
// CÁC ROUTER CRUD HOÀN CHỈNH (TÁCH RA THƯ MỤC ROUTES)
// ==========================================
// Mọi URL bắt đầu bằng /api/categories sẽ chạy vào file categoryRoutes.js
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

// ==========================================
// CÁC API GET CƠ BẢN CÒN LẠI (SẼ ĐƯỢC TÁCH SAU NÀY)
// ==========================================
const User = require('./models/User');
const Order = require('./models/Order');
const Voucher = require('./models/Voucher');
const Supplier = require('./models/Supplier');
const Ingredient = require('./models/Ingredient');
const RewardItem = require('./models/RewardItem');

app.get('/api/users', async (req, res) => {
  try { res.status(200).json(await User.find({})); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});
app.get('/api/orders', async (req, res) => {
  try { res.status(200).json(await Order.find({})); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});
app.get('/api/vouchers', async (req, res) => {
  try { res.status(200).json(await Voucher.find({})); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});
app.get('/api/suppliers', async (req, res) => {
  try { res.status(200).json(await Supplier.find({})); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});
app.get('/api/ingredients', async (req, res) => {
  try { res.status(200).json(await Ingredient.find({}).populate('supplier', 'name')); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});
app.get('/api/rewards', async (req, res) => {
  try { res.status(200).json(await RewardItem.find({})); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
});
