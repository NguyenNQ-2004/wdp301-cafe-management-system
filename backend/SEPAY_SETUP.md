# SePay: thanh toán chuyển khoản thật

Ứng dụng dùng VietQR và webhook biến động số dư của SePay. Khách chuyển tiền vào tài khoản ngân hàng đã liên kết; backend chỉ xác nhận đơn khi nhận webhook hợp lệ với đúng tài khoản, mã thanh toán và số tiền. Trang thanh toán tự cập nhật trạng thái khoảng 5 giây một lần.

## 1. Cấu hình tài khoản nhận

Chọn một tài khoản ngân hàng hoặc tài khoản ảo (VA) đã hoạt động trong SePay. Nếu chọn VA, dùng **số VA** làm `PAYMENT_ACCOUNT_NO`; chọn đúng VA đó trong bộ lọc webhook. Không dùng chung một VA cho hệ thống khác nếu các hệ thống có thể tạo mã thanh toán trùng nhau.

Trong SePay, cấu hình định dạng mã thanh toán: tiền tố `AU`, hậu tố dài đúng **24** ký tự, kiểu **chữ và số**. Mỗi đơn có mã dạng `AU` + MongoDB Payment ID; mã này được điền sẵn trong VietQR. Webhook cần chuyển tiếp giao dịch có tiền vào mang mã này.

## 2. Tạo webhook

Tại **Tích hợp WebHooks → Thêm Webhook**:

- URL: `https://<backend-public-host>/api/payments/sepay-webhook`. URL phải là HTTPS công khai; `localhost` không nhận được webhook từ SePay.
- Loại giao dịch: **Tiền vào**; định dạng: **JSON**; bật **tự động gửi lại khi server trả lỗi**.
- Tài khoản: chọn đúng tài khoản/VA ở bước 1. Nếu có bộ lọc mã thanh toán, chọn tiền tố `AU`.
- Bảo mật: chọn **API Key**, tạo khóa riêng cho webhook này.

Lưu API Key và thông tin tài khoản vào `backend/.env` khi chạy máy cá nhân, hoặc biến môi trường của dịch vụ triển khai:

```dotenv
PAYMENT_DEMO_ENABLED=false
SEPAY_WEBHOOK_API_KEY=<api-key-tu-webhook>
PAYMENT_BANK_ID=BIDV
PAYMENT_BANK_NAME=BIDV
PAYMENT_ACCOUNT_NO=<so-tai-khoan-hoac-so-VA-duoc-chon>
PAYMENT_ACCOUNT_NAME=<ten-chu-tai-khoan>
```

Không commit `.env` hoặc chia sẻ API Key. Khởi động lại backend sau khi cập nhật biến môi trường.

## 3. Kiểm tra trước khi nhận tiền thật

Tạo đơn mới, chọn chuyển khoản và xác nhận QR chứa đúng số tài khoản, số tiền, mã `AU...`. Dùng chức năng **Gửi thử** của SePay để kiểm tra URL và xác thực. Bước cuối cùng là chuyển một khoản nhỏ đúng số tiền của đơn, rồi kiểm tra SePay ghi webhook thành công và đơn chuyển sang **CONFIRMED**. Chuyển thiếu hoặc sai mã phải để đơn ở **PENDING** để đối soát thủ công.

SePay có thể gửi lại cùng một webhook; hệ thống lưu ID giao dịch SePay duy nhất nên không cộng điểm hay xác nhận đơn lần hai. Nếu tiền đã vào tài khoản nhưng webhook thất bại, kiểm tra **Lịch sử gửi** trong SePay và xử lý đối soát; không xác nhận thanh toán bằng nút trên trình duyệt.
