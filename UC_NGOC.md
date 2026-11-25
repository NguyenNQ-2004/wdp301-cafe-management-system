# UC và màn hình do Ngọc phụ trách

File này tổng hợp phần việc của Ngọc để tra cứu và thuyết trình. **Số 23–27 là số màn hình trong bảng phân công, không phải mã UC của tài liệu SRS.** Các mã `GIO`, `PQR`... là comment đánh dấu đường đi trong code; xem [MA_COMMENT_CODE_NGOC.md](MA_COMMENT_CODE_NGOC.md).

## Khách hàng và bán hàng

| UC | Chức năng | Luồng chính | Mã comment |
| --- | --- | --- | --- |
| UC10, UC64 | Giỏ hàng và đổi điểm | Khách thêm/sửa/xóa món, chọn món đặt; khách đăng nhập có thể đổi điểm khi đủ điều kiện. Backend kiểm tra lại món, giá và ưu đãi. | `GIO1–GIO4` |
| UC11 | Đặt hàng online | Khách đăng nhập, chọn nhận hàng, nhập người nhận/địa chỉ, xác nhận; backend tính lại tiền và tạo đơn. | `PQR1–PQR4`, `COD1–COD4` |
| UC12 | Thanh toán đơn online | Khách chọn trả trước bằng VietQR hoặc COD. VietQR chỉ được ghi nhận đã thanh toán sau khi SePay gửi webhook hợp lệ; COD thu tiền khi giao. | `PQR5–PQR8`, `COD5`, `COD8–COD10` |
| UC13 | Thanh toán tại quầy | Thu ngân chọn đơn và hình thức tiền mặt hoặc chuyển khoản QR; giao dịch QR chờ xác nhận trước khi ghi nhận đã trả. | `TQ1–TQ4` |
| UC14 | Hóa đơn | Xem/in chi tiết món, giảm điểm, phí, tổng tiền và trạng thái thanh toán của đơn. | `HD1–HD3` |

**Hai luồng giao tận nơi:** `PQR1–PQR10` là *một* luồng trả trước bằng QR; `COD1–COD10` là *một* luồng thanh toán khi nhận hàng. Các bước pha chế (`PQR9`, `COD6`) và giao hàng (`PQR10`, `COD7–COD10`) do vai trò liên quan thực hiện, được ghi ở đây để thấy luồng khép kín.

## Nhân sự và ca làm

| Màn hình | Chức năng | Luồng chính | Mã comment |
| --- | --- | --- | --- |
| 23 | Quản lý nhân viên | Admin xem, thêm, sửa nhân viên, phân vị trí và khóa/kích hoạt tài khoản. | `NV1–NV3` |
| 24 | Khung giờ ca | Admin tạo, sửa, xem và sao chép ca theo tuần. | `KCA1–KCA3` |
| 25 | Lịch phân ca | Admin phân/sửa/bỏ ca; nhân viên xem lịch cá nhân. | `PCA1–PCA3` |
| 26 | Chấm công | Admin ghi nhận vào/ra/vắng và đối chiếu với lịch. | `CC1–CC3` |
| 27 | Bàn giao ca thu ngân | Thu ngân chốt két, người nhận đếm và xác nhận hoặc báo lệch; Admin xem và xử lý biên bản. | `BGC1–BGC5` |

## Cách tra code

Trong VS Code nhấn `Ctrl+Shift+F`, tìm một mã như `PQR1` rồi theo `PQR2`, `PQR3`... Các mã là comment phục vụ tìm và thuyết trình luồng, không phải tên API hoặc mã UC chính thức.
