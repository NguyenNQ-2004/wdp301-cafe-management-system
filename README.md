## Rà soát và bộ report cập nhật

Xem [kết quả kiểm tra 15 luồng, phần của Mạnh và bằng chứng](docs/WORKFLOW_AUDIT_2026-11-11.md) và [bộ report Word/Excel đã đồng bộ](docs/report/README.md). Dự án dùng MongoDB/Mongoose.

# ☕ Aura Cafe ERP System

Aura Cafe ERP là một hệ thống quản lý toàn diện (Enterprise Resource Planning) dành cho chuỗi cửa hàng cà phê. Dự án bao gồm các phân hệ chính hỗ trợ Khách hàng (đặt món, tích điểm), Nhân viên cửa hàng (Máy POS thu ngân, màn hình bếp KDS, xử lý đơn) và Quản trị viên (Quản lý kho nguyên liệu, nhân sự, báo cáo doanh thu).

## Thanh toán online mô phỏng (UC12)

Khách hàng chọn **Thanh toán online mô phỏng** khi đặt đơn giao hàng. Sau khi tạo đơn, trang `/payment?orderId=...` hiển thị số tiền và nút xác nhận; API kiểm tra chủ đơn, số tiền và trạng thái trước khi đánh dấu giao dịch thành công. Mã giao dịch bắt đầu bằng `DEMO-`. Có thể mở lại trang thanh toán từ danh sách đơn hàng.

Đây là chế độ phục vụ bài tập, **không kết nối ngân hàng và không thu tiền thật**. Chế độ này bật mặc định khi chạy local, tắt mặc định khi `NODE_ENV=production`. Đặt `PAYMENT_DEMO_ENABLED=true` để bật rõ ràng hoặc `PAYMENT_DEMO_ENABLED=false` để tắt. COD vẫn là lựa chọn mặc định. Thay luồng mô phỏng bằng cổng thanh toán có callback xác thực trên server trước khi dùng cho giao dịch thật.

## Thanh toán tại quầy (UC13)

Thu ngân, quản lý hoặc admin mở `/cashier/payments` từ trang thu ngân. Danh sách hiển thị đơn mang về và dùng tại quán đang chờ thu tiền. Sau khi nhận tiền, chọn **Tiền mặt** hoặc **Chuyển khoản**; với chuyển khoản phải nhập mã giao dịch đã kiểm tra thủ công. Chỉ các tài khoản này được xác nhận thanh toán, đơn đã hủy hoặc sai số tiền bị từ chối. Đơn dùng tại quán được tạo với payment chờ thu; thay đổi trạng thái đơn sang hoàn tất không tự đánh dấu payment tại quầy là đã trả.

## Quản lý nhân viên (màn hình 23)

Admin mở `/admin/employees` từ sidebar hoặc dashboard để xem, tìm kiếm, thêm và sửa nhân viên. Màn hình quản lý vị trí (Quản lý, Pha chế, Thu ngân, Giao hàng), lương cơ bản, ngày vào làm và trạng thái tài khoản. Tài khoản mới phải có mật khẩu ít nhất 8 ký tự; để trống ô mật khẩu khi sửa sẽ giữ mật khẩu cũ. Chuyển trạng thái sang **Ngừng hoạt động** hoặc **Bị khóa** sẽ chặn đăng nhập. API `/api/employees` chỉ dành cho Admin và chỉ thao tác với tài khoản `STAFF`; mật khẩu băm không được trả về. Chức năng dùng bảng `users` sẵn có, không cần chạy lại seed. Kiểm tra bằng `cd backend && npm run test:employee-management`.

## Khung giờ ca làm (màn hình 24)

Admin mở `/admin/shifts` để chỉnh giờ bắt đầu và kết thúc của ca sáng, chiều, tối. Hệ thống lưu vào các khóa `shift_morning`, `shift_afternoon`, `shift_evening` trong bảng `shop_settings` hiện có; không cần chạy lại seed. Khung ca được quản lý theo tuần; giờ hiệu lực của tuần được kiểm tra khi phân ca/chấm công. Admin lưu đủ ba ca cùng lúc; API từ chối giờ sai định dạng, giờ kết thúc không sau giờ bắt đầu hoặc các ca chồng lấn. Nhân viên có thể đọc khung giờ qua `GET /api/work-shifts`; chỉ Admin được cập nhật qua `PUT /api/work-shifts`. Chạy `cd backend && npm run test:work-shifts` để kiểm tra.

## Lịch phân ca (màn hình 25)

Admin mở `/admin/schedules` để xem lịch theo tuần, phân công nhân viên đang hoạt động vào ca sáng, chiều, tối; có thể sửa hoặc bỏ ca chưa chấm công. Nhân viên mở `/my-schedule` để xem lịch của chính mình. Dữ liệu lưu trong collection `workschedules` đã có sẵn, khung giờ hiển thị theo cài đặt ca làm. API `/api/work-schedules` giới hạn dữ liệu theo tuần; nhân viên chỉ đọc được lịch cá nhân, Admin được quản lý phân công. Kiểm tra bằng `cd backend && npm run test:employee-schedule`.

## Chấm công (màn hình 26)

Nhân viên mở `/my-attendance` để check-in ca của mình từ 60 phút trước giờ bắt đầu đến giờ kết thúc trong ngày được phân, sau đó check-out trong ngày hoặc trước 06:00 sáng hôm sau. Hệ thống ghi giờ thực tế, ngăn chấm lặp và không cho chấm công hộ. Admin mở `/admin/attendance` để lọc lịch sử tối đa 31 ngày, xem giờ dự kiến so với giờ thực tế và đánh dấu vắng mặt cho ca đã qua ngày làm việc mà chưa check-in. Chức năng dùng các trường sẵn có trong collection `workschedules`, không cần chạy lại seed. Chạy `cd backend && npm run test:attendance-management` để kiểm tra.

## Bàn giao ca thu ngân (màn hình 27)

Thu ngân hoặc quản lý mở `/cashier/handover` để chốt ca và gửi biên bản nguyên tử. Nhân viên nhập tiền mặt thực tế trong két; hệ thống lấy tiền đầu ca, cộng khoản CASH tại quầy thực thu và COD đã xác nhận nhận, trừ CASH hoàn từ chính ca xuất tiền, rồi lưu snapshot và chênh lệch. Khoản CASH đã thu vẫn thuộc két nếu sau đó hoàn qua ngân hàng. Nếu có chênh lệch, phải ghi lý do. Có thể in biên bản khổ K80 sau khi xác nhận. Admin duyệt hoặc từ chối biên bản SUBMITTED; chủ biên bản được giải trình và gửi lại khi REJECTED. Thanh toán cũ không có người thu tiền được báo riêng và không tự cộng vào ca. Chức năng bổ sung trường vào `payments` và `work_schedules` trong MongoDB; không cần chạy lại seed, nhưng các ca cũ thiếu tiền đầu ca phải nhập khi bàn giao. Kiểm tra bằng `cd backend && npm run test:shift-handover`.

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
1. **Node.js**: Phiên bản 22.12 hoặc mới hơn (phù hợp Vite 8).
2. **MongoDB Server hoặc Atlas**: dùng replica set để chạy transaction. MongoDB Compass chỉ là công cụ quản trị, không thay thế server. Cấu hình URI trong `backend/.env` theo `.env.example`.

---

## 🛠 Hướng dẫn chạy dự án (Khởi động)

Bạn cần mở **2 cửa sổ Terminal (dòng lệnh) riêng biệt** để chạy song song cả Backend và Frontend.

### Bước 1: Khởi chạy Backend (API Server)
Mở Terminal 1 (đứng ở thư mục gốc dự án) và chạy các lệnh sau:

```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt thư viện (nếu chưa cài)
npm ci

# Tạo .env từ .env.example và cấu hình MongoDB replica set/Atlas.
# Công cụ local sau dành cho Windows, cần MongoDB Server đã cài:
npm run db:local-replica

# Khởi chạy server ở chế độ Development (tự động reload khi code thay đổi)
npm run dev
```
> 👉 Server Backend sẽ khởi chạy tại: **http://localhost:5000**
>
> **Dữ liệu mẫu (tùy chọn)**: Backend không có route `/api/seed`. Nếu cần nạp dữ liệu mẫu, xem mục “Tài khoản mẫu cho môi trường local” bên dưới rồi chạy `node seed.js` trong thư mục `backend`. Script này xóa dữ liệu hiện có trong các collection mà nó nạp; chỉ chạy trên database mới hoặc sau khi đã sao lưu.

### Bước 2: Khởi chạy Frontend (Giao diện React)
Mở Terminal 2 (đứng ở thư mục gốc dự án) và chạy các lệnh sau:

```bash
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt thư viện (nếu chưa cài)
npm ci

# Khởi chạy Vite Dev Server
npm run dev
```
> 👉 Giao diện Frontend sẽ chạy tại: **http://localhost:5173** (hoặc cổng được Vite cung cấp trên terminal). Nhấn Ctrl + Click vào link để mở trang web.

---

## 👤 Tài khoản mẫu cho môi trường local
`backend/seed.js` chỉ chạy ở local sau khi bật xác nhận phá hủy dữ liệu; script xóa dữ liệu hiện có trước khi tạo dữ liệu mẫu. Trong PowerShell, vào thư mục `backend`, đặt `$env:ALLOW_DESTRUCTIVE_SEED = "true"`, rồi chạy `node seed.js`. Mật khẩu mặc định của sáu tài khoản mẫu là `123456`. Có thể thay bằng `$env:SEED_USER_PASSWORD = "<mat-khau-rieng>"` (ít nhất 6 ký tự) trước khi chạy.

Tài khoản Admin mẫu dùng Gmail `auracafe.admin.demo@gmail.com` hoặc số điện thoại `0900000001`. Các Gmail mẫu trong `seed.js` chỉ là tên đăng nhập, không phải hộp thư đã được xác minh để nhận email. Không dùng mật khẩu mẫu trên môi trường triển khai.

Giỏ hàng được lưu trong MongoDB khi đăng nhập. Khách chưa đăng nhập có thể thêm món vào giỏ trên trình duyệt, sau đó đăng nhập để đồng bộ và đặt hàng. Đơn giao tận nơi hỗ trợ COD hoặc BANK_TRANSFER theo cấu hình; đơn tại quầy hỗ trợ CASH hoặc BANK_TRANSFER. Thanh toán ngân hàng chỉ thành công sau callback có chữ ký hợp lệ.

### Đặt hàng online (UC11)

Từ giỏ hàng, chọn món rồi vào trang xác nhận đơn. Khách hàng cần đăng nhập, nhập tên và số điện thoại người nhận; đơn giao tận nơi cần thêm địa chỉ. Server tính lại giá món, mức giảm điểm và phí giao hàng trước khi tạo đơn, lưu thông tin nhận hàng, các món, trạng thái thanh toán chờ xử lý và xóa những món đã đặt khỏi giỏ. Đơn giao tận nơi dùng COD hoặc BANK_TRANSFER. Phí lấy từ vùng giao hàng đang hoạt động và lưu snapshot; cần có shipper đang trong ca. Thanh toán ngân hàng cần cấu hình gateway và callback trong `.env.example`. Có thể chạy `npm run test:online-ordering` trong thư mục `backend` để kiểm tra luồng này bằng database tạm tự dọn sau khi chạy.

Khách hàng đăng nhập có thể chọn tối đa một ưu đãi đổi bằng điểm trong giỏ hàng. Hệ thống dùng `RewardItem.pointsCost`, `discountValue`, `minOrderValue`, `stock` và `User.totalPoints` để kiểm tra; điểm và số lượng ưu đãi chỉ bị trừ khi đơn được tạo thành công. Đơn lưu mức giảm và số điểm đã dùng, đồng thời ghi `LoyaltyTransaction`. Mốc miễn phí giao hàng tính theo tiền món trước giảm điểm. Không có ô nhập mã voucher trong luồng này. Không cần chạy lại `seed.js` để dùng tính năng; chạy seed sẽ xóa dữ liệu mẫu cũ.

### Phân quyền tài khoản mẫu

| Số điện thoại | Vai trò | Quyền sử dụng |
| --- | --- | --- |
| `0900000001` | Quản trị (`ADMIN`) | Trang quản trị, thu ngân, pha chế; quản lý danh mục và sản phẩm; xem tài khoản và tất cả đơn. |
| `0900000002` | Pha chế (`STAFF/BARISTA`) | Trang pha chế. |
| `0900000003` | Thu ngân (`STAFF/CASHIER`) | Trang thu ngân. |
| `0900000004`, `0900000005` | Khách hàng (`CUSTOMER`) | Giỏ hàng, đặt món, xem đơn của mình. |
| `0900000006` | Giao hàng (`STAFF/SHIPPER`) | Tài khoản nhân viên; giao nhận tại `/delivery`, sự cố tại `/delivery/problems`, nộp COD tại `/delivery/cod`; cần check-in. |

Mọi người có thể xem thực đơn và thêm món vào giỏ trước khi đăng nhập. API tạo đơn yêu cầu token đăng nhập hợp lệ; đăng ký công khai luôn tạo tài khoản khách hàng. Các tài khoản bị khóa hoặc vô hiệu hóa không đăng nhập hay gọi API được.

---

## 🌿 Quy tắc làm việc nhóm (Git Flow)
Dự án áp dụng mô hình **Git Flow**, trong đó **`develop`** là nhánh hội tụ code của cả team. Tuyệt đối không ai được code trực tiếp vào nhánh `main` (chỉ dùng để deploy) hay nhánh `develop`.

**1. Cú pháp đặt tên nhánh (nhánh con):**
Tất cả các nhánh mới phải được rẽ ra từ nhánh `develop`.
Cấu trúc: `<loại>/<tên-chức-năng>`
- `feature/...`: Phát triển tính năng mới (VD: `feature/login-customer`).
- `fix/...`: Chữa lỗi (VD: `fix/cart-error`).
- `refactor/...`: Cấu trúc lại code cũ.

**2. Quy trình làm việc cơ bản:**
```bash
git checkout develop                 # 1. Chuyển về nhánh develop
git pull origin develop              # 2. Kéo code hội tụ mới nhất của team về
git checkout -b feature/tên-task     # 3. Tạo nhánh mới TỪ DEVELOP để code
# -> (Tiến hành viết code & commit)
git push origin feature/tên-task     # 4. Đẩy nhánh lên Github
# 5. Lên Github tạo Pull Request (PR), yêu cầu gộp từ nhánh feature/... vào nhánh develop
```
