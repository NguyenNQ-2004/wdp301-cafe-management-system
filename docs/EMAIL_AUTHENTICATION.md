# Đăng ký và đăng nhập bằng Gmail/email

## Cách sử dụng

- Đăng ký tại `/register`: họ tên, Gmail/email, số điện thoại liên hệ và mật khẩu tài khoản Aura Café.
- Đăng nhập tại `/login`: Gmail/email và mật khẩu đã tạo cho Aura Café.
- Số điện thoại chỉ được lưu trong hồ sơ, thông tin nhận hàng và tra cứu khách hàng; API đăng nhập không chấp nhận số điện thoại.
- Email được bỏ khoảng trắng hai đầu và chuyển chữ thường. Gmail được hỗ trợ cùng các email hợp lệ khác để nhân viên đang có email công ty vẫn dùng được.
- Mật khẩu đăng ký có ít nhất 8 ký tự và tối đa 72 byte UTF-8.

API đăng nhập nhận `{ "email": "your-address@gmail.com", "password": "..." }`. API đăng ký nhận thêm `fullName` và `phone`. Các token đang đăng nhập vẫn sử dụng ID tài khoản nên tiếp tục có hiệu lực như trước.

Đây là luồng email và mật khẩu của Aura Café. Không kết nối OAuth Google hay gửi email xác minh. Giao diện không còn các nút Google/OTP giả lập và không báo đã gửi email khôi phục khi chưa có dịch vụ gửi thư.

## Email duy nhất và dữ liệu cũ

Email mới hoặc email được cập nhật sẽ có khóa chuẩn hóa `emailKey` với unique index. Schema vẫn cho phép lưu liên hệ cũ chưa có email; các liên hệ này cần được bổ sung email trước khi đăng nhập. Khóa riêng giúp tạo index mà không tự sửa/xóa dữ liệu email cũ đang trùng.

- Đăng ký email trùng bị từ chối với HTTP 409, kể cả khi hai yêu cầu tạo cùng lúc.
- Đăng nhập tìm cả email cũ chưa có khóa chuẩn hóa. Nếu có nhiều tài khoản dùng chung email, API từ chối với thông báo yêu cầu cập nhật email riêng.
- Profile không cho xóa email đăng nhập hoặc đổi sang email của người khác. Sau khi đổi email thành công, dùng email mới cho lần đăng nhập tiếp theo.
- Màn hình quản lý nhân viên có trường Gmail/email đăng nhập. Nhân viên mới cần có email; nhân viên cũ có thể bổ sung bằng thao tác sửa. Khách hàng có thể được cập nhật email trong phần quản lý khách hàng.

Kiểm tra database hiện tại chỉ đọc phát hiện **5 tài khoản chưa có email** và **1 nhóm email bị trùng**. Chưa tự gán email cho các tài khoản này. Cần người dùng cung cấp email riêng kèm số điện thoại để xác định đúng tài khoản trước khi cập nhật.

Nếu admin cũ chưa có email nên không vào được quản trị, có công cụ cập nhật đúng một tài khoản khi đã biết email của người đó:

```powershell
cd backend
node scripts/setAccountEmail.js --phone 0901234567 --email your-address@gmail.com
```

Đây chỉ là cú pháp minh họa; cần thay cả số điện thoại và email bằng thông tin tài khoản được chủ dự án chỉ định. Công cụ giữ mật khẩu, vai trò và số điện thoại, đồng thời chặn email đang thuộc tài khoản khác. Không chạy seed để xử lý chuyển đổi tài khoản.

## Kiểm tra

- Test mới `emailAuthentication.test.js`: **9/9 đạt** gồm đăng ký, đăng nhập, phân biệt chữ hoa/thường, chặn phone login, email trùng, yêu cầu đồng thời, dữ liệu cũ, cập nhật email và tài khoản khóa.
- Frontend: **51/51 đạt**, production build thành công.
- Toàn bộ backend: **21/23 test đạt**; hai lỗi đã có trước ở `hireDate` của User và `DEMO_ONLINE` của Payment vẫn tồn tại.
- Bộ kiểm tra API cổng 5000 đã được đổi sang email. Các email seed mặc định không có trong database hiện tại nên 5 kiểm tra đăng nhập tài khoản mặc định trả 401; đây là phần dữ liệu tài khoản cần cập nhật, không thể ghi nhận các luồng đó là đã đạt trên database thật.

Chạy lại:

```powershell
cd backend
npm.cmd run test:email-auth
node --test --test-concurrency=1 tests/*.test.js
cd ../frontend
npm.cmd test
npm.cmd run build
```

Khi dùng `npm.cmd run test:api`, đặt `TEST_ADMIN_EMAIL`, `TEST_BARISTA_EMAIL`, `TEST_CASHIER_EMAIL`, `TEST_CUSTOMER_EMAIL`, `TEST_SHIPPER_EMAIL` và `TEST_PASSWORD` phù hợp với các tài khoản đã cấu hình.
