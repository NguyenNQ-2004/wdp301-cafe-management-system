# ☕ Aura Cafe ERP System

Aura Cafe ERP là một hệ thống quản lý toàn diện (Enterprise Resource Planning) dành cho chuỗi cửa hàng cà phê. Dự án bao gồm các phân hệ chính hỗ trợ Khách hàng (đặt món, tích điểm), Nhân viên cửa hàng (Máy POS thu ngân, màn hình bếp KDS, xử lý đơn) và Quản trị viên (Quản lý kho nguyên liệu, nhân sự, báo cáo doanh thu).

## 🚀 Công nghệ sử dụng (MERN Stack)
- **Frontend**: ReactJS (Vite, TypeScript), React Router DOM, Zustand (Quản lý State), Axios.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB (Mongoose ODM).
- **Công cụ hỗ trợ**: MongoDB Compass (Quản trị CSDL cục bộ), Nodemon.

---

## 📁 Cấu trúc thư mục

```text
wdp301-cafe-management-system/
├── backend/                  # Chứa logic API server (Controllers, Models, Routes)
├── frontend/                 # Chứa giao diện người dùng (Components, Pages, Hooks)
├── project_architecture.md   # Tài liệu phân tích cấu trúc tổng thể
└── README.md                 # Hướng dẫn chạy dự án
```

---

## ⚙️ Yêu cầu môi trường
Trước khi khởi chạy dự án, hãy đảm bảo máy tính của bạn đã cài đặt:
1. **Node.js**: Phiên bản 16.x hoặc mới hơn.
2. **MongoDB Compass**: Chạy Localhost ở cổng mặc định (`mongodb://localhost:27017`).

---

## 🛠 Hướng dẫn chạy dự án (Khởi động)

Bạn cần mở **2 cửa sổ Terminal (dòng lệnh) riêng biệt** để chạy song song cả Backend và Frontend.

### Bước 1: Khởi chạy Backend (API Server)
Mở Terminal 1 (đứng ở thư mục gốc dự án) và chạy các lệnh sau:

```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt thư viện (nếu chưa cài)
npm install

# Khởi chạy server ở chế độ Development (tự động reload khi code thay đổi)
npm run dev
```
> 👉 Server Backend sẽ khởi chạy tại: **http://localhost:5000**
> 
> **Lưu ý quan trọng**: Ở lần đầu tiên khởi chạy, hãy mở trình duyệt và truy cập vào đường link [http://localhost:5000/api/seed](http://localhost:5000/api/seed). Hệ thống sẽ tự động tạo cơ sở dữ liệu `aura_cafe_erp` và tài khoản Admin mẫu để hiển thị trên MongoDB Compass.

### Bước 2: Khởi chạy Frontend (Giao diện React)
Mở Terminal 2 (đứng ở thư mục gốc dự án) và chạy các lệnh sau:

```bash
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt thư viện (nếu chưa cài)
npm install

# Khởi chạy Vite Dev Server
npm run dev
```
> 👉 Giao diện Frontend sẽ chạy tại: **http://localhost:5173** (hoặc cổng được Vite cung cấp trên terminal). Nhấn Ctrl + Click vào link để mở trang web.

---

## 👤 Tài khoản mặc định (Dữ liệu mẫu)
Sau khi chạy lệnh `/api/seed` ở Backend, bạn có thể đăng nhập bằng tài khoản Quản trị viên sau:
- **Tài khoản (SĐT)**: `0900000001`
- **Mật khẩu**: `demo_hash`
- **Vai trò (Role)**: ADMIN