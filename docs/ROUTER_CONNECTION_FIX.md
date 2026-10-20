# Sửa cảnh báo không tải được dữ liệu — 20/10/2026

## Nguyên nhân và thay đổi

`backend/server.js` chưa gắn nhiều router có sẵn nên giỏ hàng, thanh toán, điểm thành viên, cấu hình và các dữ liệu quản trị trả 404. Frontend hiển thị cảnh báo chung khi tải các phần này thất bại.

Sau khi bạn cho phép nối backend, đã:

- Gắn 13 router hiện có: đơn hàng, giỏ, thanh toán, phần thưởng, điểm thành viên, phản hồi, nguyên liệu, nhà cung cấp, công thức, giao dịch kho, phiếu nhập, cấu hình cửa hàng và báo cáo.
- Bỏ handler GET cơ bản trùng với các router, bao gồm GET đơn hàng công khai. Danh sách đơn giờ yêu cầu đăng nhập và customer chỉ nhận đơn của mình.
- Bỏ việc gắn router đăng nhập hai lần và nạp dotenv hai lần. Chờ MongoDB kết nối xong mới mở cổng API.
- Cho phép test import cấu hình server thật mà không khởi động thêm cổng 5000.
- Khởi động lại API thật ở cổng 5000 với mã vừa sửa; không seed lại dữ liệu.
- Cảnh báo frontend giờ nêu cụ thể dữ liệu nào không tải được và giữ nút thử lại, không còn câu “Bạn vẫn có thể xem giao diện…”. Chỉ hiển thị lỗi liên quan đến trang đang mở.

## Kiểm tra sau sửa

| Kiểm tra | Kết quả |
| --- | --- |
| API thật cổng 5000 | **39/39 đạt**, không còn endpoint 404 trong bộ kiểm tra |
| Frontend test | **44/44 đạt**: 18 kiểm tra hồi quy, 26 kiểm tra render |
| Frontend production build | **Đạt**, còn cảnh báo bundle lớn |
| Test mới `backend/tests/serverRouting.test.js` | **Đạt**: sử dụng cấu hình server thật, kiểm tra các router công khai/bảo vệ và lọc đơn theo tài khoản |
| Toàn bộ backend test | **12/14 nhóm đạt**, hai lỗi cũ bên dưới vẫn tồn tại |
| Kiểm tra cú pháp khoảng trắng `git diff --check` | Đạt cho phần sửa lần này |

Test API thực tế sử dụng đăng nhập và GET. Bộ test backend ghi dữ liệu vào database tạm có tên riêng, không seed/xóa database đang dùng. Một số GET hiện có (ví dụ quy tắc thành viên) có logic tự tạo cấu hình mặc định của backend.

Hai lỗi đã có từ trước, ngoài phạm vi nối router lần này:

1. `employeeManagement.test.js:81`: schema User thiếu `hireDate`, trả `undefined` thay vì `null`.
2. `onlineOrdering.test.js:139`: enum của Payment chưa có `DEMO_ONLINE`, tạo đơn thanh toán mô phỏng trả 400 thay vì 201. Các bước sau assertion này trong cùng nhóm chưa chạy.

Không coi 39 GET/login đạt là bằng chứng mọi nghiệp vụ ghi dữ liệu đã hoạt động. Kiểm tra trực tiếp bằng trình duyệt vẫn chưa thực hiện được vì công cụ UI lỗi khởi tạo trong lượt kiểm tra trước.

## Tải lại giao diện

Nhấn **Ctrl + F5** ở trang đang mở để tải lại dữ liệu và khởi tạo lại đồng bộ giỏ hàng. Backend đã được khởi động tại `http://localhost:5000`.

Chạy lại từ frontend:

```powershell
npm.cmd run test:api
npm.cmd test
npm.cmd run build
```

Bằng chứng: [API sau sửa](test-results/runtime-api-after-router.json), [test frontend sau sửa](test-results/frontend-tests-after-router.txt).
