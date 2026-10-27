# Thanh toán UC12–UC13 trong bài tập

## Khách đặt online

1. Đăng nhập bằng tài khoản khách hàng, chọn món và chọn **Giao tận nơi**.
2. Chọn **Thanh toán online mô phỏng**, sau đó chọn MoMo, VNPay hoặc chuyển khoản mô phỏng.
3. Đặt đơn. Trang thanh toán hiện số tiền, mã đơn và QR dẫn đến chính trang xác nhận thử nghiệm. Có thể mở lại trang này từ **Đơn hàng của tôi**.
4. Bấm **Xác nhận thanh toán mô phỏng**. Hệ thống lưu trạng thái `SUCCESS`, thời điểm thanh toán và mã giao dịch `DEMO-*`. Bấm lại không tạo giao dịch mới.

Trong môi trường development, mô phỏng được bật mặc định. Đặt `PAYMENT_DEMO_ENABLED=false` để tắt; trên môi trường production phải đặt `PAYMENT_DEMO_ENABLED=true` một cách chủ động nếu muốn trình diễn. Chỉ dùng chế độ này với dữ liệu bài tập.

QR ở đây là đường dẫn vào trang thử nghiệm của Aura Café, **không phải QR thu tiền của MoMo, VNPay hay ngân hàng**. Nút xác nhận không gọi cổng thanh toán và không chứng minh tiền thật đã được chuyển.

## Thu ngân tại quầy

1. Tạo đơn tại quầy hoặc để khách đặt đơn **Đến lấy tại quầy**.
2. Thu ngân mở `/cashier/payments`, chọn tiền mặt, chuyển khoản, MoMo hoặc VNPay.
3. Với phương thức không dùng tiền mặt, thu ngân kiểm tra giao dịch trong ứng dụng nhận tiền và nhập mã giao dịch trước khi xác nhận.

Xác nhận tại quầy là đối soát **thủ công**. Hệ thống lưu người xác nhận, thời gian và mã giao dịch. Chỉ thanh toán tiền mặt do thu ngân xác nhận mới được tính vào bàn giao ca UC27.

Để đối soát tự động với tiền thật cần tài khoản merchant, thông số tích hợp và callback có chữ ký từ từng nhà cung cấp; phần này chưa được kết nối trong bài tập.
