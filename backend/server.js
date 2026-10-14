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
// 16 BẢNG CHUẨN AURA CAFE ERP
// ==========================================
// Group A: Users & Work Schedules
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/work-schedules', require('./routes/workScheduleRoutes'));

// Group B: Products & Sales
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/loyalty', require('./routes/rewardRoutes'));

// Group C: Accounting & Customer Care
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/loyalty-transactions', require('./routes/loyaltyRoutes'));
app.use('/api/customer-reviews', require('./routes/reviewRoutes'));

// Group D: Inventory, BOM & Settings
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/ingredients', require('./routes/ingredientRoutes'));
app.use('/api/product-ingredients', require('./routes/productIngredientRoutes'));
app.use('/api/purchase-orders', require('./routes/purchaseOrderRoutes'));
app.use('/api/inventory-transactions', require('./routes/inventoryTransactionRoutes'));
app.use('/api/shop-settings', require('./routes/shopSettingRoutes'));

// Tiện ích giỏ hàng & thưởng
app.use('/api/cart', require('./routes/cartRoutes'));

// Route SEED tự động kích hoạt nhanh qua trình duyệt (theo tài liệu README.md)
app.get('/api/seed', async (req, res) => {
  try {
    const { exec } = require('child_process');
    exec('node seed.js', { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ message: 'Lỗi seed dữ liệu', error: error.message, stderr });
      }
      res.send(`
        <div style="font-family: sans-serif; padding: 40px; line-height: 1.6; max-width: 600px; margin: 40px auto; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <h2 style="color: #15803d; margin-top: 0;">🎉 Đã tạo cơ sở dữ liệu mẫu Aura Cafe ERP thành công!</h2>
          <p>Dữ liệu 16 bảng chuẩn (Users, Schedules, Categories, Products, Orders, Order Items, Payments, Loyalty, Reviews, Suppliers, Ingredients, BOM, Purchase Orders, PO Items, Inventory, Shop Settings) đã được nhồi vào MongoDB.</p>
          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 14px;">
            <strong>Tài khoản Quản trị viên (Admin):</strong><br/>
            - SĐT: <code>0900000001</code><br/>
            - Mật khẩu: <code>123456</code> (hoặc <code>demo_hash</code>)<br/>
            - Vai trò: <b>ADMIN (MANAGER)</b>
          </div>
          <p style="margin-top: 20px;"><a href="http://localhost:5173" style="display: inline-block; background: #963e18; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">Truy cập Giao diện Web (Frontend) &rarr;</a></p>
        </div>
      `);
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Aura Cafe ERP API Server đang chạy trên cổng ${PORT}`);
});
