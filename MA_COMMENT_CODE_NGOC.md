# AURA CAFÉ - MÃ COMMENT ĐỂ TÌM LUỒNG CODE CỦA NGỌC

**Cách tìm:** Trong VS Code nhấn **Ctrl+Shift+F**, nhập một mã như `GIO1` hoặc `PQR1`, rồi lần theo `GIO2` hoặc `PQR2`... Mã nằm trong comment ở frontend hoặc backend; có bước xuất hiện ở cả hai nơi.

## KHÁCH HÀNG

```text
GIO1-GIO4    Chọn món thanh toán → đổi điểm → đồng bộ giỏ → backend kiểm tra món/tồn
PQR1-PQR4    Chọn món → đăng nhập → nhập địa chỉ → tạo đơn chờ thanh toán
PQR5-PQR8    Lấy VietQR → chuyển khoản → SePay đối chiếu → xác nhận đã trả
COD1-COD4   Chọn món → đăng nhập → nhập địa chỉ → tạo đơn chờ thanh toán
COD5        Chọn trả tiền khi nhận hàng; đơn xác nhận nhưng chưa thu tiền
HD1-HD3     Chọn đơn → phân biệt COD chưa thu → xem/in phiếu hoặc hóa đơn
```

## BARISTA (BƯỚC LIÊN THÔNG)

```text
PQR9, COD6  Pha món, đánh dấu đã pha và chuyển đơn sang sẵn sàng giao
```

## SHIPPER (BƯỚC LIÊN THÔNG)

```text
PQR10       Nhận và giao đơn đã trả trước, không thu tiền lần nữa
COD7        Nhận đơn COD và bắt đầu giao
COD8-COD9   Thu đúng tiền khi giao; hoàn tất đơn và ghi thanh toán thành công
COD10       Nộp tiền COD đã thu cho thu ngân kiểm đếm
```

## THU NGÂN

```text
TQ1-TQ4     Xem khoản chờ → chọn cách trả → đối chiếu tiền/QR → xác nhận thanh toán
HD1-HD3     Xem và in hóa đơn; phân biệt đơn COD chưa thu tiền
COD10       Kiểm đếm, xác nhận tiền COD do shipper nộp vào két
BGC1-BGC4   Chốt két → chọn người nhận → tự đếm/nhận → báo chênh lệch nếu có
CC1-CC3     Xem trạng thái công → ghi vào/ra/vắng → đối chiếu giờ thực tế
```

## ADMIN

```text
NV1-NV3    Tìm/lọc nhân viên → tạo/sửa tài khoản → khóa/kích hoạt
KCA1-KCA3  Xem ca theo tuần → tạo/sửa giờ ca → sao chép ca tuần gần nhất
PCA1-PCA3  Xem lịch tuần → phân/sửa ca → bỏ phân công chưa chấm công
CC1-CC3    Xem trạng thái công → ghi vào/ra/vắng → đối chiếu giờ thực tế
BGC5       Xem chênh lệch và duyệt/từ chối biên bản chốt ca
```

## GHI CHÚ

- `PQR1-PQR10` và `COD1-COD10` là **bước của hai luồng đơn giao tận nơi**, không phải 10 luồng độc lập.
- Comment có thể gom các bước cùng đoạn xử lý, ví dụ `PQR6 PQR7 PQR8`; vẫn tìm được từng mã bằng Ctrl+Shift+F.
- Các mã chỉ phục vụ đọc code và thuyết trình, không ảnh hưởng chức năng chương trình.
- Mỗi nhóm mã theo đúng thứ tự thao tác để tìm luồng và thuyết trình code.
