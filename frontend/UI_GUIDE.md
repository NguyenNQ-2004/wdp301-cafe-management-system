# Giao diện chính Aura Café

Giao diện tham chiếu từ `C:\Users\nguye\Desktop\cafe_system` đã được đưa trực tiếp vào ứng dụng. Không còn chế độ xem mẫu hoặc bộ chuyển 33 màn hình.

Chạy `npm.cmd run dev` trong thư mục `frontend`, rồi mở địa chỉ Vite thông báo.

| Nhóm | Đường dẫn |
|---|---|
| Trang chủ, đăng nhập | `/`, `/login` |
| Thực đơn, chi tiết món | `/menu`, `/products/:id` |
| Giỏ hàng, đặt hàng, thanh toán | `/cart`, `/checkout`, `/payment?orderId=...` |
| Hồ sơ, đơn hàng, hóa đơn, phản hồi | `/profile`, `/orders`, `/bill?orderId=...`, `/feedback` |
| Thu ngân | `/cashier`, `/cashier/orders`, `/cashier/payments`, `/cashier/shift`, `/cashier/handover` |
| Pha chế | `/barista` |
| Giao hàng | `/delivery`, `/delivery/problems`, `/delivery/cod` |
| Báo cáo | `/admin`, `/admin/reports` |
| Sản phẩm | `/admin/categories`, `/admin/products`, `/admin/recipes` |
| Kho và nhập hàng | `/admin/ingredients`, `/admin/inventory`, `/admin/restock`, `/admin/suppliers`, `/admin/purchases` |
| Nhân sự | `/admin/employees`, `/admin/shifts`, `/admin/schedules`, `/admin/attendance` |
| Khách hàng và cài đặt | `/admin/customers`, `/admin/memberships`, `/admin/complaints`, `/admin/settings` |
| Lịch và chấm công cá nhân | `/my-schedule`, `/my-attendance` |

Các trang nghiệp vụ yêu cầu đăng nhập và vai trò tương ứng. Luồng đăng nhập dùng API thật; tài khoản giao hàng được chuyển đến `/delivery`.

Các màn hình mới dùng `src/interface/LiveProvider.tsx` để chuyển dữ liệu MongoDB sang cấu trúc giao diện. Không sử dụng seed hoặc đơn hàng mẫu. Biểu mẫu chỉ thông báo lưu thành công sau khi API xác nhận; yêu cầu thất bại giữ dữ liệu thật và hiển thị lỗi.

Giỏ hàng, checkout, thanh toán, nhân sự và các phân hệ quản trị đã kết nối trước đây tiếp tục sử dụng API hiện có. Các endpoint chưa được gắn ở backend vẫn cần được hoàn thiện sau; việc đưa giao diện vào trang chính không tự tạo các endpoint đó.

Tùy chọn đường, đá và ghi chú món được chuyển thành ghi chú đơn hàng. Topping có phụ thu chưa được API hỗ trợ nên không cho đặt thêm vào giỏ. Server tiếp tục quyết định giá và trạng thái thanh toán.
