# Rà soát WDP301 — 11/11/2026

Nhánh: `fix/manh-report-workflow-audit`, tách từ `develop` tại `f560f68`. Dự án dùng **MongoDB/Mongoose**, cần replica set hoặc Atlas để chạy transaction. Các kết quả dưới đây áp dụng cho thay đổi trên nhánh này, không xác nhận một môi trường đã triển khai.

## Tài liệu đã đối chiếu

Đã đọc nội dung bốn file Word và hai sheet Use Case/Screens trong file tracking ở thư mục report được cung cấp. `FinalReleaseDocument` chứa phiên bản SRS/SDS mới hơn hai bản đứng riêng. Bộ cập nhật trong [report](report/) sử dụng các phần tương ứng của FinalReleaseDocument để đồng bộ hai bản đứng riêng, giữ sơ đồ và bảng, sửa mô tả bị lệch rồi thêm phụ lục triển khai ngày 11/11. Bản gốc ngoài repo được giữ nguyên.

`Database.docx` gốc mô tả MySQL của dự án salon, không khớp ứng dụng. Bản thay thế liệt kê 26 collection MongoDB thực tế, trường, reference và index khai báo từ `backend/models`. Xem thêm [dictionary dạng Markdown](report/MONGODB_SCHEMA.md). Các entity trong sơ đồ nghiệp vụ là mô hình khái niệm; tên collection và trường vật lý tra theo dictionary.

## Phần của Mạnh

Có đủ bảy màn hình trong phân công; chưa thể kết luận hoàn tất trước đợt rà soát vì còn các lỗi xuyên UI/API/lưu trữ dưới đây. Hiện đã bổ sung và sửa các phần tìm thấy; tracking ghi Done về triển khai và kiểm thử, không thay cho nghiệm thu nhóm.

| Màn hình | Trạng thái sau sửa và bằng chứng |
| --- | --- |
| 8 — POS `/cashier` | Giữ lựa chọn CASH/BANK_TRANSFER, khách hàng, điểm và tùy chọn món khi tạo payload; server tự định giá. Test payload và API thanh toán. |
| 12 — Đơn tại quầy `/cashier/orders` | Lọc/xem/sửa đơn đủ điều kiện và bàn giao; retry hoàn tất không làm thay đổi đơn đã kết thúc. `counterOrderUpdate`, `manhWorkflows`. |
| 13 — Pha chế `/barista` | Bắt đầu → đánh dấu từng dòng món → READY; trạng thái lưu MongoDB, kiểm tra thanh toán và trừ kho nguyên tử. `kitchenWorkflow`, `inventory`, `lotCosting`. |
| 14 — Giao hàng `/delivery` và hai trang con | Nhận đơn rõ ràng trước lấy hàng; lưu sự cố riêng; trả về quán và phân lại; thu đúng COD, nộp và xác nhận nhận tiền. `onlineOrdering`, `manhWorkflows`, `shiftHandover`. |
| 31 — Báo cáo `/admin/reports` | Doanh thu/nhóm đơn/top món theo ngày thanh toán; số đơn theo ngày tạo; tiêu hao thực tế OUT_ORDER; ngày Việt Nam. `adminLogic`, `manhWorkflows`. |
| 32 — Quản trị đơn `/admin/orders` | Guard quyền/trạng thái, nhập COD khi xác nhận thay shipper, hiển thị lịch sử/sự cố; hoàn CASH gắn đúng ca xuất tiền. `finalBaseline`, `paymentGateway`, `manhWorkflows`. |
| 35 — Phí giao hàng `/admin/delivery-areas` | CRUD vùng, district active, phí không âm và snapshot phí đơn; freeship theo cấu hình. `deliveryAreas`, `checkoutFlow`. |

Browser smoke đã mở 9 URL tương ứng bằng các vai trò Admin/Cashier/Barista/Shipper trên database fixture riêng, không có JavaScript page error. POS đã tạo đơn BANK_TRANSFER và CASH qua giao diện, xác nhận phản hồi API lưu đúng phương thức. Smoke các trang còn lại kiểm tra tải trang; không phải chạy đủ 30 tình huống nghiệm thu bằng tay.

## Lỗi đã sửa

1. POS chọn chuyển khoản nhưng provider ép PAY_AT_COUNTER: tạo helper payload giữ đúng phương thức và tùy chọn, bỏ giá do client gửi.
2. Shipper được gán có thể lấy hàng ngay: thêm bước ACCEPTED bền vững trong `Order.delivery`, lưu lịch sử actor/shipper/thời gian. Đơn được phân công còn đang chuẩn bị cũng hiển thị để nhận trước.
3. Sự cố chỉ là ghi chú và có thể mất khi phân lại: thêm `DeliveryIssue`, endpoint báo cáo và danh sách có phân quyền. REPORT chỉ lưu; RETURN đưa READY và bỏ gán; CANCEL đơn đã thu tiền phải qua quy trình quản lý hoàn tiền. Transaction rollback cả issue lẫn order nếu ghi thất bại. Giữ nguyên ghi chú khách hàng.
4. Gọi lại trạng thái cuối có thể sửa lý do hủy: retry cùng trạng thái không ghi lại; yêu cầu sửa bằng chứng hoặc đổi shipper bị từ chối.
5. Hoàn tất COD không đối chiếu số tiền của payment và thao tác từ Admin thiếu số thực thu: kiểm tra cả collectedAmount và payment.amount; ghi receivedBy là shipper được gán. UI Admin yêu cầu nhập đúng số tiền.
6. COD chưa nộp từ trước giờ check-in ca hiện tại bị bỏ khỏi bảng kê, làm kẹt đối soát: ca đang mở lấy toàn bộ khoản chưa nộp do shipper giữ; ca đã đóng xem theo remittanceSchedule. Shipper có thể đóng ca khi còn đơn đang cầm hoặc bỏ qua nộp COD: chặn đóng/nộp khi còn đơn chưa xong; yêu cầu dùng nộp COD khi còn khoản chưa gửi. Danh sách tiền đang chờ nộp loại khoản đã có remittanceId, lịch sử giao dùng ngày deliveredAt theo Việt Nam.
7. Hoàn giao dịch CASH bằng ngân hàng làm mất khoản thu gốc khỏi két: sổ két vẫn tính receipt đã thực thu. Hoàn CASH trừ đúng ca thực xuất tiền, lưu `refundSchedule`, khóa ca đang mở và snapshot `cashRefunds` khi chốt. Công thức: đầu ca + thu CASH tại quầy + COD thu ngân đã xác nhận nhận − hoàn CASH từ ca.
8. Biểu đồ theo loại đơn/top món có thể lẫn đơn chưa trả; thiếu nguyên liệu thực dùng: lấy payment thành công khớp giá trị đơn theo paidAt, OUT_ORDER theo createdAt; hiển thị rõ căn cứ thời gian, giới hạn khoảng tối đa 366 ngày, bổ sung đề xuất nhập và phản hồi IN_PROGRESS cần xử lý.

## Bao phủ 15 luồng

Tất cả file test backend hiện có được chạy, cùng sáu file frontend. Các lỗi tái hiện được đã sửa; bảng ghi phần kiểm tra thực hiện, không khẳng định không còn lỗi ngoài phạm vi dữ liệu/điều kiện đã thử.

| Luồng | Phạm vi và bộ kiểm thử chính | Kết quả |
| --- | --- | --- |
| BF01 Online ordering/tracking | cart, idempotency, giá server, snapshot, quyền, hủy; checkoutFlow/onlineOrdering | Đạt |
| BF02 Online payment | đăng ký, chữ ký callback, amount, replay, đổi COD, refund; paymentGateway | Đạt với provider fixture |
| BF03 Preparation | eligibility, START/ITEMS/FINISH, stock rollback; kitchenWorkflow/inventory | Đạt |
| BF04 Delivery | assignment, accept, pickup, issue/return/cancel, COD/remittance; manhWorkflows/onlineOrdering | Đạt sau sửa |
| BF05 Counter | tạo/cập nhật, payment, customization, member, handover; counterOrderUpdate/finalBaseline | Đạt sau sửa |
| BF06 Scheduling/attendance | quyền, lịch cá nhân, cửa sổ check-in/out; employeeSchedule/attendanceManagement | Đạt |
| BF07 Shift cash handover | chốt nguyên tử, nhận COD, review/reject/resubmit, refund; shiftHandover/shiftHandoverReview/manhWorkflows | Đạt sau sửa |
| BF08 Restock/purchase | request approval, đơn mua, nhận một lần, FIFO, supplier; restockRequests/purchases/lotCosting/suppliers | Đạt |
| BF09 Feedback | quyền sở hữu, phản hồi, trạng thái cuối; feedbackComplaints | Đạt |
| BF10 Account/profile | login email/phone, bcrypt/JWT, OTP/reset, token cũ; emailAuthentication/passwordRecovery | Đạt với SMTP fixture |
| BF11 Catalog/recipe | danh mục active, biến thể/topping, BOM, ảnh, migration; catalogMigration/legacyToppingCheckout/inventory | Đạt |
| BF12 Phone loyalty | quyền, balance, đổi ưu đãi, hoàn điểm/idempotency; loyaltyManagement/customerManagement | Đạt |
| BF13 Sales/order follow-up | căn cứ paidAt/createdAt, tiêu hao, trạng thái cuối; adminLogic/manhWorkflows | Đạt sau sửa |
| BF14 Shop configuration | quyền ghi, dữ liệu hợp lệ, phí giao và freeship; adminLogic/deliveryAreas | Đạt |
| BF15 Employee/weekly shifts | role/position/status, conflict, định nghĩa theo tuần; employeeManagement/workShifts/employeeSchedule | Đạt |

## Kết quả xác minh

- Backend: **102/102 tests pass**, 0 fail/skip, chạy toàn bộ `npm test` với MongoDB replica set riêng. Mỗi bộ dùng database ngẫu nhiên và tự dọn dữ liệu.
- Frontend: **103/103 test cases pass** khi chạy trực tiếp sáu file `tests/*.test.mjs` (lệnh npm test còn báo sáu file tổng hợp).
- `npm run build`: thành công. Bundler còn cảnh báo chunk lớn hơn 500 kB.
- `npm run lint`: exit 0; còn các cảnh báo React hiện có, không tuyên bố warning-free.
- Browser: 9 URL / 7 màn hình, không page error, fixture riêng. Không dùng seed phá dữ liệu hiện tại.

Chạy lại backend (URI trỏ vào replica set thử nghiệm, không phải database đang vận hành):

```bash
cd backend
MONGO_URI='mongodb://127.0.0.1:27039/aura_cafe_erp?replicaSet=wdpAudit' JWT_SECRET='<test-secret>' npm test
```

Frontend:

```bash
cd frontend
for testfile in tests/*.test.mjs; do node "$testfile" || exit 1; done
npm run build
npm run lint
```

## Giới hạn còn cần nghiệm thu

SMTP thật, callback ngân hàng thật và việc chuyển/hoàn tiền thật cần cấu hình và tài khoản của nhóm; fixtures không chứng minh đã chuyển tiền hay giao email thật. 30 test case chấp nhận trong FinalReleaseDocument vẫn là checklist nghiệm thu riêng; không tự đổi chúng thành Passed từ kết quả tự động. Chưa deploy, push hoặc merge.

Refund CASH lịch sử thiếu `refundSchedule` cần đối chiếu thủ công, không tự suy diễn người xuất tiền hay sửa database của nhóm. Trường mới tương thích bản ghi cũ; đơn cũ được gán shipper cần bấm nhận để có stage ACCEPTED trước pickup.
