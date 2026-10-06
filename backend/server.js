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

// Load Model User
const User = require('./models/User');

// --- ĐƯỜNG DẪN ĐỂ TẠO DỮ LIỆU MẪU ĐẦU TIÊN ---
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

    res.status(201).json({ 
      message: '✅ Đã tạo thành công tài khoản Admin. Hãy Refresh MongoDB Compass!',
      user: createdUser
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Khởi chạy Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
});
