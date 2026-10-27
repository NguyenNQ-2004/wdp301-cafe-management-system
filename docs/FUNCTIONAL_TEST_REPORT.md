# Báo cáo sửa lỗi và kiểm tra chức năng

Ngày kiểm tra: 20/10/2026. Dự án: `wdp301-cafe-management-system`.

**Cập nhật sau khi bạn cho phép nối lại backend:** đã sửa cấu hình router và khởi động lại API. Kiểm tra API thực tế hiện đạt **39/39**, frontend **44/44**, bộ test backend **12/14** (còn hai lỗi model đã ghi nhận). Xem [bản cập nhật kết nối dữ liệu](ROUTER_CONNECTION_FIX.md). Các số liệu và lỗi B01/B02 bên dưới là kết quả trước lần sửa router này.

## Phạm vi và kết quả

Giữ yêu cầu trước đó: chỉ sửa frontend. Backend được đọc mã, kiểm tra API và chạy bộ test hiện có; không sửa mã backend trong lượt này.

| Hạng mục | Kết quả | Ý nghĩa |
| --- | --- | --- |
| Frontend production build | Đạt | TypeScript và Vite build thành công |
| Frontend test tự động | 41/41 đạt | 15 kiểm tra hồi quy và 26 kiểm tra render; không tương đương 41 luồng bấm trình duyệt |
| Render bổ sung với dữ liệu API đang chạy | 26/26 đạt | 13 màn hình tích hợp, với dữ liệu thật và dữ liệu rỗng; chỉ đọc dữ liệu |
| Backend test trên database tạm | 11/13 nhóm đạt | 2 nhóm dừng tại assertion lỗi, các bước phía sau trong nhóm đó chưa chạy |
| API server thực tế, cổng 5000 | 25/39 đạt | 14 kiểm tra lỗi, gồm API thiếu và phân quyền đơn hàng |
| Lint | 0 error, 48 warning | Phần lớn liên quan React hooks, compiler và Fast Refresh |
| Thao tác trực tiếp trên trình duyệt | Chưa kiểm tra được | Công cụ trình duyệt/Windows lỗi khởi tạo: `failed to write kernel assets ... os error 3` |

Các test backend dùng tên database ngẫu nhiên riêng theo namespace `aura_cafe_*_test_*`, kiểm tra namespace trước khi xóa database tạm. Không chạy seed, không sửa giỏ hàng hay tạo đơn trong database đang dùng. Kiểm tra API thực tế chỉ gọi đăng nhập và GET; token và nội dung đơn hàng không được ghi vào báo cáo.

## Các lỗi frontend đã sửa

1. `/login` luôn mở form đăng nhập khi khách chuyển vào đường dẫn này; đóng form quay về trang chủ. Hoàn tất đăng nhập chuyển đúng trang theo vai trò, bỏ khoảng chờ cho phép bấm gửi lặp.
2. Dữ liệu đăng nhập hỏng trong localStorage không làm ứng dụng trắng trang. Trình duyệt chặn lưu session vẫn có thể giữ phiên trong bộ nhớ.
3. URL hóa đơn chứa ID sai không còn tự hiển thị hóa đơn của đơn khác. Sao chép mã đơn có phương án hiển thị mã khi Clipboard API không có.
4. Màn hình đơn hàng/hóa đơn/KDS/giao hàng tải lại dữ liệu khi quay lại trang, bao gồm sau khi đặt đơn từ checkout hiện có.
5. Đổi sản phẩm sẽ khởi tạo lại tùy chọn đường, đá, ghi chú và số lượng. Không thêm sản phẩm đã ngừng bán.
6. Không ghi đè đường/đá/ghi chú của món đã có cùng sản phẩm và size trong giỏ. Với API hiện tại chỉ hỗ trợ một dòng mỗi sản phẩm/size, giao diện yêu cầu xóa dòng cũ trước khi đổi tùy chọn. Giới hạn tổng số lượng 99 được báo rõ.
7. POS gộp món trùng sản phẩm/size trước khi gửi API, giữ từng số lượng và tùy chọn trong ghi chú đơn; chặn số lượng không hợp lệ trước khi gửi.
8. Dữ liệu quản trị cũ được xóa khi đổi phiên đăng nhập; phản hồi tải dữ liệu từ phiên cũ không ghi đè phiên mới. Danh mục rỗng được cập nhật đúng sau khi xóa hết.
9. Yêu cầu đồng bộ giỏ cũ dừng retry khi phiên hoặc dữ liệu đổi. Lỗi quyền/API giỏ hàng không còn retry vô hạn mỗi 3 giây; hiển thị thông báo cụ thể.
10. Các thao tác danh mục/nguyên liệu/công thức và trạng thái đơn qua context cũ khôi phục dữ liệu khi API thất bại và hiển thị thông báo lỗi nổi bật. Lỗi API 404 trong helper chung có thông báo rõ.
11. Các lệnh ghi đang chờ trong bộ tích hợp mới kiểm tra lại phiên trước khi gửi; thông báo thành công cũ được xóa sau khi sử dụng.

## Lỗi backend còn tồn tại

### B01 — Nghiêm trọng: API danh sách đơn hàng thiếu bảo vệ

- `GET /api/orders` không có token vẫn trả **200**, kỳ vọng **401**.
- Đăng nhập customer rồi gọi API này vẫn nhận cả đơn không thuộc tài khoản đó.
- Nguồn: `backend/server.js` đang gắn một GET trực tiếp với `Order.find({})` thay cho router đơn hàng có middleware và bộ lọc sở hữu.
- Hậu quả: lộ thông tin đơn hàng. Bộ lọc ở frontend không bảo vệ được API.
- Cần sửa backend: dùng `orderRoutes` có `protect` và lọc quyền; bỏ GET công khai hiện tại.

### B02 — Cao: nhiều router đã có mã nhưng chưa được gắn vào server

Các endpoint thực tế trả **404**:

| Endpoint | Chức năng bị chặn |
| --- | --- |
| `/api/cart` | Tải/lưu giỏ của tài khoản; checkout chưa đủ điều kiện đồng bộ |
| `/api/payments/config`, `/api/payments` | Cấu hình và danh sách thanh toán |
| `/api/shop-settings` | Cấu hình cửa hàng |
| `/api/product-ingredients` | Công thức/định lượng |
| `/api/inventory-transactions` | Lịch sử kho, điều chỉnh tồn |
| `/api/purchase-orders`, `/api/purchase-orders/restock-overview` | Phiếu nhập và đề xuất nhập hàng |
| `/api/loyalty-transactions`, `/api/loyalty-transactions/rules` | Điểm thành viên và quy tắc tích điểm |
| `/api/customer-reviews` | Đánh giá/khiếu nại |
| `/api/reports` | Báo cáo |

`server.js` cũng chưa gắn router tạo/cập nhật đơn, cart, thanh toán và các router liên quan. Vì vậy không thể kết luận các luồng đặt đơn, POS, KDS, giao hàng và thanh toán hoạt động hoàn chỉnh trên server hiện tại. Không thử ghi đơn vào database thật. GET nguyên liệu/nhà cung cấp trả 200 qua các handler cơ bản cũng không chứng minh CRUD của chúng đã hoạt động.

Cần sửa backend: gắn đúng các router hiện có và bỏ handler cơ bản trùng đường dẫn; chạy lại kiểm tra trên server thật sau khi khởi động lại.

### B03 — Cao: tạo thanh toán mô phỏng bị từ chối

- `backend/tests/onlineOrdering.test.js:139`: tạo đơn dùng `DEMO_ONLINE` trả **400**, kỳ vọng **201**.
- `backend/models/Payment.js` chưa cho phép `DEMO_ONLINE` trong enum `paymentMethod`, trong khi order/payment routes có sử dụng giá trị này.
- Các bước xác nhận thanh toán demo và thanh toán tại quầy ở phía sau assertion này chưa chạy trong lần test này.

### B04 — Trung bình: không lưu được ngày vào làm nhân viên

- `backend/tests/employeeManagement.test.js:81`: `hireDate` trả `undefined`, kỳ vọng `null` sau khi cập nhật.
- `backend/models/User.js` thiếu trường `hireDate`; dữ liệu do route nhận sẽ không được schema lưu đúng. Schema cũng đang khai báo `passwordHash` hai lần.

### B05 — Cần xử lý trước khi dùng seed

Qua đọc mã, `backend/seed.js` có đoạn tham chiếu các model không được import ở phần đầu (ví dụ `CustomerReview`, `InventoryTransaction`, `ShopSetting`). Không chạy seed để kiểm tra vì script có thao tác xóa dữ liệu. Đây là phát hiện tĩnh, chưa phải kết quả thực thi seed.

## Những phần kiểm tra đã đạt

- Đăng nhập và `/api/auth/me` của 5 tài khoản seed: admin, barista, cashier, customer, shipper đều **200**.
- MongoDB đang chạy; lỗi `ECONNREFUSED` trước đó không xuất hiện trong các lần gọi API và test database lần này.
- Thiếu thông tin đăng nhập trả **400**, mật khẩu sai trả **401**, chưa đăng nhập gọi `/api/auth/me` trả **401**.
- Customer đọc danh sách nhân viên bị từ chối **403**.
- API sản phẩm, danh mục và các GET người dùng/nhân viên/ca làm cho admin trả **200**.
- Các nhóm test backend đạt trên database tạm: chấm công, CRM khách hàng, lịch làm, phản hồi/khiếu nại, kho, tích điểm, nhập hàng, đề xuất nhập, bàn giao ca, nhà cung cấp và cấu hình ca làm.

Các test backend tự tạo Express app và tự gắn router phục vụ test. Vì vậy nhóm test đạt trên database tạm **không chứng minh** `server.js` đang chạy đã gắn những router đó. Đây là lý do test kho/nhập hàng đạt nhưng API thực tế vẫn 404.

## Cảnh báo và giới hạn còn lại

- Vite cảnh báo bundle `ConnectedApp` lớn hơn 500 kB; ảnh hưởng tốc độ tải, không làm build thất bại.
- Còn lint warning về dependency của hooks, mutation trong tính toán, thời gian trong render, Fast Refresh; không coi đó là bằng chứng mọi luồng đang lỗi.
- Topping, đổi điểm tại POS, ghi sự cố giao hàng và đối soát COD còn thiếu API phù hợp trong bộ giao diện tích hợp; giao diện đã có chặn/thông báo, chưa thể coi là chức năng hoàn chỉnh. Shipper hiện không có quyền đọc API thanh toán chung của backend.
- Chưa kiểm tra responsive, in thực tế, thao tác chuột/bàn phím hay luồng end-to-end trong trình duyệt vì công cụ UI không khởi tạo được.

## Chạy lại

```powershell
cd C:\Users\nguye\Desktop\wdp301-cafe-management-system\frontend
npm.cmd test
npm.cmd run build
npm.cmd run lint
npm.cmd run test:api
```

`test:api` dùng server cổng 5000 và các tài khoản seed đang có. Có thể cấu hình `TEST_API_URL` và `TEST_PASSWORD` qua biến môi trường. Kết quả trả exit code 1 nếu còn API lỗi; không cần chạy seed.

```powershell
cd C:\Users\nguye\Desktop\wdp301-cafe-management-system\backend
node --test --test-concurrency=1 tests/*.test.js
```

Chi tiết từng kiểm tra API: [runtime-api.json](test-results/runtime-api.json). Log backend: [backend-tests.txt](test-results/backend-tests.txt). Log frontend: [frontend-tests.txt](test-results/frontend-tests.txt).
