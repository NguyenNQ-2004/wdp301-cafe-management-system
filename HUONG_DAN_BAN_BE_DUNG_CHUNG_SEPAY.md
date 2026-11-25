# Hướng dẫn bạn bè chạy giao diện và dùng chung backend SePay

Backend, MongoDB và webhook SePay hiện chạy trên máy của chủ dự án. Các thành viên chỉ chạy frontend trên máy mình và gọi API chung qua URL tunnel.

## 1. Lấy code

Nếu chưa có dự án:

```bash
git clone --branch feature/sepay-real-payment https://github.com/NguyenNQ-2004/wdp301-cafe-management-system.git
cd wdp301-cafe-management-system
```

Nếu đã clone dự án rồi:

```bash
git fetch origin
git switch feature/sepay-real-payment
git pull
```

## 2. Cấu hình frontend gọi backend chung

Tạo file `frontend/.env.local` với URL tunnel hiện tại do chủ dự án cung cấp:

```dotenv
VITE_API_URL=https://genre-match-includes-door.trycloudflare.com
```

Nếu URL tunnel đã đổi, thay bằng URL mới. Không thêm `/api` vào cuối URL.

## 3. Chạy frontend

Mở terminal tại thư mục `frontend`:

```bash
npm ci
npm run dev
```

Mở địa chỉ Vite in trong terminal, thường là `http://localhost:5173`.

## 4. Điều kiện để hệ thống hoạt động

- Chủ dự án cần bật MongoDB, backend và Cloudflare Tunnel trên máy chủ backend.
- Người dùng đăng nhập và tạo đơn trên giao diện của mình; dữ liệu được lưu trong database chung.
- Nếu tunnel ngừng hoặc URL thay đổi, nhờ chủ dự án gửi URL mới, cập nhật `frontend/.env.local`, rồi khởi động lại Vite.
- Mỗi đơn tạo mã VietQR riêng. Chỉ thanh toán nếu chủ dự án xác nhận đang thử giao dịch; QR này chuyển tiền thật vào tài khoản/VA đã cấu hình.

## Bảo mật

Không cần và không nên nhận `backend/.env` từ chủ dự án. API Key SePay, JWT secret và chuỗi kết nối database phải ở máy chạy backend; tuyệt đối không đưa chúng vào `frontend/.env.local`, Git hoặc tin nhắn nhóm.
