# Transcript ngắn: cơ sở dữ liệu theo sơ đồ ERD

Thời lượng đọc: khoảng 3 phút. Phần trong `[ ... ]` là chỉ dẫn trên ảnh ERD, không đọc thành tiếng.

---

Kính chào thầy cô và các bạn. Em xin trình bày cơ sở dữ liệu của Aura Café. Sơ đồ có 23 bảng, và em chia thành sáu nhóm.

Một lưu ý trước: đây là sơ đồ logic vẽ theo kiểu quan hệ. Khi cài đặt, nhóm dùng MongoDB, nên một số bảng chi tiết được nhúng vào bảng cha.

**Nhóm 1. Tài khoản.** [Chỉ `users`.]
Ba loại người dùng dùng chung bảng `users`, phân biệt bằng `role`: quản trị viên, nhân viên và khách hàng. Nhân viên có thêm vị trí: quản lý, pha chế, thu ngân, giao hàng. Số điện thoại và email là duy nhất, mật khẩu lưu dạng băm. Tài khoản đã có lịch sử thì không xóa, chỉ ngừng hoạt động.

**Nhóm 2. Đơn hàng và thanh toán.** [Chỉ `orders`, `order_items`, `payments`.]
`orders` là bảng trung tâm. Có ba loại đơn: tại quán, mang đi, giao hàng. Đơn đi qua các trạng thái: chờ, xác nhận, pha chế, sẵn sàng, đang giao, hoàn tất, hoặc hủy. `order_items` là từng món, lưu lại tên và giá tại thời điểm đặt để đổi giá sau này không làm sai đơn cũ. Trong code, bảng này được nhúng vào đơn. `payments` ghi thanh toán: tiền mặt, VNPay, MoMo, chuyển khoản, kèm hoàn tiền. Đơn đã thanh toán phải qua quản trị viên hoàn tiền mới hủy được.

**Nhóm 3. Giao hàng.** [Chỉ `deliveries`, `delivery_issues`.]
`deliveries` theo dõi shipper nhận đơn, lấy hàng, giao xong và tiền COD. Trong code, phần này nhúng vào đơn. `delivery_issues` lưu sự cố shipper báo, như không liên lạc được khách hay sai địa chỉ, kèm kết quả xử lý.

**Nhóm 4. Ca làm và bàn giao tiền.** [Chỉ `work_shifts`, `work_schedules`, `shift_handovers`.]
`work_shifts` là khung giờ ca theo tuần. `work_schedules` là phân công nhân viên theo ngày, do quản trị viên chấm công. `shift_handovers` là biên bản bàn giao két của thu ngân. Tiền kỳ vọng bằng tiền đầu ca, cộng tiền mặt bán được, cộng COD nhận từ shipper, trừ tiền hoàn. Quản trị viên duyệt hoặc từ chối biên bản.

**Nhóm 5. Thực đơn và kho.** [Chỉ `categories`, `products`, `product_ingredients`, `ingredients`, `inventory_transactions`.]
Món thuộc nhóm món. `product_ingredients` là công thức pha chế, nối thực đơn với kho. Khi đơn bắt đầu pha chế, hệ thống trừ nguyên liệu theo công thức, mỗi đơn đúng một lần. `inventory_transactions` là sổ ghi mọi lần tồn kho đổi, có tồn trước và tồn sau. Hai bảng ảnh `product_images` và `category_images` là thiết kế dự phòng, hiện ảnh lưu bằng đường dẫn.

**Nhóm 6. Nhập hàng, thân thiết và phản hồi.** [Chỉ `restock_requests`, `purchase_orders`, `suppliers`, `loyalty_transactions`, `customer_reviews`.]
Nhập hàng có hai bước: nhân viên đề xuất, quản trị viên duyệt, rồi lập phiếu nhập gửi nhà cung cấp, nhận hàng thì cộng kho. `loyalty_transactions` ghi mọi lần cộng trừ điểm, mặc định một điểm cho mỗi nghìn đồng, mỗi đơn chỉ cộng một lần. `customer_reviews` lưu đánh giá và khiếu nại của khách, có phản hồi của quản trị viên.

**Bảo vệ dữ liệu.** Thao tác tiền và kho chạy trong transaction. Có khóa lạc quan khi hai người sửa cùng lúc, ràng buộc duy nhất chống trùng, và khóa chống đặt hàng hai lần.

Tóm lại, dữ liệu xoay quanh ba trục: đơn hàng và thanh toán, ca làm cùng đối soát tiền, kho cùng nhập hàng. Mọi thao tác tiền và kho đều lưu người làm và thời điểm, nên truy ngược được. Em xin cảm ơn và sẵn sàng nhận câu hỏi.
