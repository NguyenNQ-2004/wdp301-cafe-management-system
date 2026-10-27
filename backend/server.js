const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API của hệ thống Aura Cafe ERP đang hoạt động...');
});

// ==========================================
// CÁC ROUTER CRUD HOÀN CHỈNH (TÁCH RA THƯ MỤC ROUTES)
// ==========================================
// Group A: Users & Work Schedules
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/work-schedules', require('./routes/workScheduleRoutes'));
app.use('/api/work-shifts', require('./routes/workShiftRoutes'));
app.use('/api/shift-handovers', require('./routes/shiftHandoverRoutes'));

// Group B: Products & Sales
// Mọi URL bắt đầu bằng /api/categories sẽ chạy vào file categoryRoutes.js
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/rewards', require('./routes/rewardRoutes'));
app.use('/api/loyalty-transactions', require('./routes/loyaltyRoutes'));
app.use('/api/customer-reviews', require('./routes/reviewRoutes'));

// Inventory, purchasing and store configuration.
app.use('/api/ingredients', require('./routes/ingredientRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/product-ingredients', require('./routes/productIngredientRoutes'));
app.use('/api/inventory-transactions', require('./routes/inventoryTransactionRoutes'));
app.use('/api/purchase-orders', require('./routes/purchaseOrderRoutes'));
app.use('/api/shop-settings', require('./routes/shopSettingRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// ==========================================
// CÁC API GET CƠ BẢN CÒN LẠI (SẼ ĐƯỢC TÁCH SAU NÀY)
// ==========================================
const Voucher = require('./models/Voucher');
app.get('/api/vouchers', async (req, res) => {
  try { res.status(200).json(await Voucher.find({})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

// Middleware xử lý lỗi chung (JSON không hợp lệ, lỗi server)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Dữ liệu JSON không hợp lệ.' });
  }
  console.error('Server error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Lỗi máy chủ.' });
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
    });
  });
}

// Tests import the actual route configuration without starting another server.
module.exports = app;
