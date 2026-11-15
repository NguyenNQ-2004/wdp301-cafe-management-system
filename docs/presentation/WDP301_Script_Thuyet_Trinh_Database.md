# Script thuyết trình: Thiết kế cơ sở dữ liệu – Aura Café (WDP301)

Tài liệu dành cho người thuyết trình. Nội dung đã đối chiếu ERD với các model Mongoose trong `backend/models` và các route trong `backend/routes` (develop, commit `b09e2d0`). Phần in nghiêng là lời nói gợi ý, phần còn lại là ghi chú cho người nói.

Thời lượng gợi ý: 8 đến 10 phút nói, 5 phút hỏi đáp.

---

## 0. Việc cần làm trước khi thuyết trình: ERD đang lệch với code

ERD trong ảnh là mô hình quan hệ (id kiểu int, mỗi quan hệ một bảng). Code thật chạy MongoDB nên một số bảng được gộp. Hội đồng có thể hỏi, vì vậy hãy chọn một trong hai cách:

- **Cách A (khuyến nghị):** nói rõ ngay từ đầu rằng ERD là mô hình logic, còn cài đặt thực tế trên MongoDB gộp một số bảng. Bảng đối chiếu ở mục 6 giúp bạn trả lời.
- **Cách B:** sửa ERD cho khớp code trước buổi thuyết trình.

Lỗi chính tả trên ERD cần sửa: `addese` (phải là `address`), `ppceptied_at` (phải là `accepted_at`), `conters` (phải là `content`).

---

## 1. Mở đầu (khoảng 30 giây)

*"Em xin trình bày phần thiết kế cơ sở dữ liệu của hệ thống quản lý quán cà phê Aura Café. Hệ thống phục vụ bốn nhóm người dùng: khách hàng, nhân viên quầy (thu ngân, pha chế, giao hàng) và quản trị viên. Dữ liệu gồm 23 thực thể chính, chia thành 6 nhóm: tài khoản, thực đơn, đơn hàng và thanh toán, giao hàng, ca làm việc, kho và nhập hàng, cùng khách hàng thân thiết và phản hồi. Em sẽ đi từ tổng quan, tới từng nhóm, rồi tới các luồng nghiệp vụ chính."*

---

## 2. Tổng quan kiến trúc dữ liệu (khoảng 1 phút)

- Cơ sở dữ liệu: MongoDB, truy cập qua Mongoose, backend Node.js/Express.
- ERD vẽ theo dạng quan hệ để dễ đọc. Trong MongoDB, các bảng "chi tiết" thường được nhúng vào bảng cha để lưu và đọc cùng một lần.
- Các cơ chế bảo vệ dữ liệu có trong code:
  - **Transaction** (`utils/mongoTransaction.js`, `atomicRoute.js`): các thao tác nhiều bước như thanh toán, hoàn tiền, nộp COD đều chạy trong một transaction. Lỗi giữa chừng thì hoàn tác toàn bộ. Vì vậy MongoDB phải chạy dạng replica set.
  - **Khóa lạc quan** (`optimisticConcurrency`) trên đơn hàng, ca bàn giao, ca làm việc: hai người sửa cùng lúc thì người sau bị báo xung đột.
  - **Khóa duy nhất** (unique index) chống trùng: số điện thoại, email, mã đơn, mã giao dịch chuyển khoản tại quầy, mỗi đơn chỉ cộng điểm một lần.
  - **Idempotency key** khi đặt hàng: bấm đặt hai lần không tạo hai đơn.

*"Điểm cần lưu ý: ERD là mô hình logic. Khi cài đặt trên MongoDB, các bảng chi tiết như order_items, purchase_order_items, restock_request_items được nhúng vào bảng cha. Em sẽ chỉ rõ từng chỗ."*

---

## 3. Từng nhóm dữ liệu

### 3.1 Tài khoản: `users`

- Một bảng duy nhất cho cả ba loại người dùng, phân biệt bằng `role`: `ADMIN`, `STAFF`, `CUSTOMER`.
- Nhân viên có thêm `position`: `MANAGER`, `BARISTA`, `CASHIER`, `SHIPPER`, kèm `base_salary`, `hire_date`.
- Khách hàng có `total_points` (điểm thân thiết hiện tại).
- `status`: `ACTIVE`, `INACTIVE`, `LOCKED`.
- Ràng buộc: số điện thoại là duy nhất, email là duy nhất khi có (qua trường phụ `emailKey` để dữ liệu cũ chưa có email vẫn hợp lệ). Mật khẩu lưu dạng băm (`password_hash`), tối thiểu 8 ký tự, có chữ và số, tối đa 72 byte.
- Admin cuối cùng đang hoạt động không thể bị khóa hoặc xóa. Tài khoản đã có lịch sử giao dịch hoặc phân ca không xóa được, chỉ chuyển sang ngừng hoạt động.

*"Lý do gộp ba loại người dùng vào một bảng: các bảng khác như đơn hàng, ca làm, điểm thưởng đều trỏ về một nơi, nên truy vết ai làm gì rất rõ."*

### 3.2 Thực đơn: `categories`, `products`

- `products` thuộc một `categories`. Có `base_price`, `variants_config` (JSON chứa size, topping), `is_available`.
- Công thức pha chế (`product_ingredients`): nguyên liệu và định lượng cho một sản phẩm. Trong code có cả bản nhúng trong `Product.recipe` lẫn model `ProductIngredient` riêng, cặp (sản phẩm, nguyên liệu) là duy nhất.
- Ảnh: ERD có `product_images`, `category_images` (lưu ảnh dạng blob). Code hiện lưu đường dẫn ảnh ở `imageUrl`, không có hai bảng này (xem mục 6).

### 3.3 Đơn hàng và thanh toán: `orders`, `order_items`, `payments`

**`orders`**
- `order_type`: `DINE_IN` (tại quán), `TAKEAWAY` (mang đi), `ONLINE` (giao hàng).
- `status`: `PENDING` → `CONFIRMED` → `PREPARING` → `READY` → `DELIVERING` → `COMPLETED`, hoặc `CANCELLED`. Quy tắc chuyển trạng thái nằm trong `orderRoutes.js`:
  - PENDING sang CONFIRMED, PREPARING, CANCELLED.
  - CONFIRMED sang PREPARING, CANCELLED.
  - PREPARING sang READY, CANCELLED.
  - READY sang PREPARING, DELIVERING, COMPLETED, CANCELLED.
  - DELIVERING sang READY, COMPLETED, CANCELLED.
  - COMPLETED và CANCELLED là trạng thái cuối.
- Tiền: `total_amount`, `discount_amount`, `delivery_fee`, `final_amount`. Giá và tên món được chụp lại tại thời điểm đặt (`productNameAtTime`, `unitPrice`) để sau này đổi giá món không làm sai đơn cũ.
- `cashier_id` là thu ngân tạo đơn tại quầy, `customer_id` là khách (đơn tại quầy có thể không có khách), `shipper_id` là người giao.
- Đơn ONLINE có địa chỉ giao: quận, phường, chi tiết. Phí giao lấy theo quận từ `DeliveryArea` (bảng này không có trong ERD).

**`order_items`**: trong code được nhúng ngay trong mảng `items` của đơn, gồm sản phẩm, đơn giá, tùy chọn, số lượng, thành tiền, cờ `isPrepared` (barista đã làm xong món này chưa).

**`payments`**
- `payment_method`: `CASH`, `VNPAY`, `MOMO`, `BANK_TRANSFER`, `DEMO_ONLINE`. Đơn COD thu tiền mặt khi giao nên ghi nhận là `CASH` do shipper thu.
- `status`: `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED`.
- Có thông tin hoàn tiền: số tiền, phương thức, mã tham chiếu, người hoàn, ca hoàn.
- Mã giao dịch chuyển khoản tại quầy là duy nhất, tránh một mã chuyển khoản xác nhận hai lần.
- Liên quan COD: `receivedBy` (shipper thu), `remittanceId`, `remittedAt` (đã nộp lại quán).

### 3.4 Giao hàng: `deliveries`, `delivery_issues`

- Trong code, `deliveries` được nhúng vào đơn hàng (`Order.delivery`): trạng thái `ASSIGNED`, `ACCEPTED`, `DELIVERING`, `DELIVERED`, `RETURNED`, `CANCELLED`, các mốc thời gian giao, nhận, lấy hàng, giao xong và lịch sử thao tác. Lý do nhúng: phân công shipper, các bước giao và trạng thái đơn phải thay đổi cùng lúc, nhúng giúp ghi trong một lần.
- `delivery_issues`: sự cố do shipper báo. Loại sự cố: không liên lạc được, sai địa chỉ, khách từ chối, hàng hỏng, giao trễ, khác. Kết quả xử lý: chỉ báo cáo, trả đơn về quán, hoặc hủy.
- Trong ERD, `deliveries` có `cod_amount`, `cod_collected`, `cod_handed_over_at`, `cod_received_id`. Trong code, tiền COD được theo dõi ở `payments` (shipper thu, ngày nộp) và `work_schedules` (thu ngân nhận COD của ca nào, số tiền nhận).

### 3.5 Ca làm việc: `work_shifts`, `work_schedules`, `shift_handovers`

- `work_shifts`: khung giờ ca theo tuần (`week_start` luôn là thứ Hai, giờ bắt đầu nhỏ hơn giờ kết thúc, tên ca là duy nhất trong tuần).
- `work_schedules`: phân công nhân viên vào ca theo ngày. Một nhân viên không thể bị phân hai lần vào cùng ca cùng ngày.
  - `status`: `SCHEDULED` (chưa chấm công), `PRESENT` (đang trong ca), `ABSENT` (vắng), `COMPLETED` (đã hoàn thành).
  - **Chấm công do Admin ghi nhận** (vào ca, ra ca, đánh vắng). Nhân viên không tự chấm. Ngoại lệ: shipper tự nộp COD và chốt ca khi đã giao xong.
  - Có tiền đầu ca, tiền cuối ca theo hệ thống và theo thực tế, thông tin nộp COD.
- `shift_handovers`: biên bản bàn giao két của thu ngân.
  - Công thức tiền kỳ vọng: **tiền đầu ca + tiền mặt bán được + COD nhận + hoàn tiền mặt (trừ đi)**. Chênh lệch là tiền thực đếm so với tiền hệ thống.
  - Trạng thái: `SUBMITTED` (đã nộp) → `CONFIRMED` (Admin duyệt) hoặc `REJECTED` (Admin từ chối) → thu ngân nộp lại. Mỗi ca chỉ có một biên bản, có lịch sử các lần xử lý.

### 3.6 Kho và nhập hàng: `ingredients`, `suppliers`, `inventory_transactions`, `purchase_orders`, `restock_requests`

- `ingredients`: nguyên liệu, đơn vị, tồn hiện tại `current_stock`, ngưỡng tối thiểu `min_stock_level`, nhà cung cấp. Trong code có thêm các lô tồn (`stockLots`) để tính giá vốn theo lô nhập.
- `inventory_transactions`: sổ cái xuất nhập kho, mỗi lần tồn kho đổi là một dòng. Loại: nhập mua, xuất theo đơn, điều chỉnh, hao hụt. Có lưu tồn trước và tồn sau.
- **Trừ kho tự động** khi đơn chuyển sang PREPARING (hoặc READY), theo công thức pha chế. Mỗi đơn chỉ trừ một lần (`inventoryDeductedAt`).
- Quy trình nhập hàng gồm hai bước:
  - `restock_requests`: nhân viên đề xuất nhập (`DRAFT` → `PENDING_APPROVAL` → `APPROVED` hoặc `REJECTED`, hoặc `CANCELLED`), có người duyệt và ghi chú duyệt. Các dòng nguyên liệu nhúng trong `items`.
  - `purchase_orders`: phiếu nhập gửi nhà cung cấp (`DRAFT` → `ORDERED` → `RECEIVED`, hoặc `CANCELLED`). Khi nhận hàng sẽ cộng kho và ghi sổ.

### 3.7 Khách hàng thân thiết và phản hồi: `loyalty_transactions`, `customer_reviews`

- `loyalty_transactions`: mỗi lần đổi điểm là một dòng (`EARN`, `REDEEM`, `REFUND`, `ADJUST`), có `balanceAfter`.
  - **Quy tắc tích điểm:** mặc định 1 điểm cho mỗi 1.000đ (cấu hình ở `shop_settings.points_earn_unit`), tính trên tổng tiền trừ giảm giá, và chỉ khi đơn có thanh toán thành công đúng bằng số tiền cần trả. Mỗi đơn chỉ tích một lần (unique index).
  - Hủy đơn thì hoàn điểm đã đổi và thu hồi điểm đã tích.
- `customer_reviews`: đánh giá (`RATING`, 1 đến 5 sao) hoặc khiếu nại (`COMPLAINT`). Khiếu nại có luồng xử lý `PENDING` → `IN_PROGRESS` → `RESOLVED` hoặc `REJECTED`, kèm phản hồi và người phản hồi của Admin.

---

## 4. Các luồng nghiệp vụ chính (nên kể theo thứ tự này)

### Luồng 1: Khách đặt hàng online và nhận hàng

1. Khách chọn món vào giỏ (`Cart`, mỗi khách một giỏ), chọn địa chỉ. Phí giao lấy theo quận.
2. Đặt hàng: hệ thống kiểm tra tồn kho, tạo đơn `PENDING`, tạo bản ghi thanh toán, xóa giỏ, trong một transaction.
3. Thanh toán: COD (trả khi nhận) hoặc online (cổng VNPay, MoMo, chuyển khoản; bản demo có xác nhận giả lập). Cổng gọi callback, hệ thống kiểm tra số tiền và mã giao dịch, và callback lặp lại không làm đổi dữ liệu hai lần.
4. Barista nhận đơn: `PREPARING` (trừ kho), đánh dấu từng món đã làm, rồi `READY`.
5. Admin phân công shipper. Shipper phải **xác nhận nhận đơn** trước khi lấy hàng, rồi `DELIVERING`, rồi giao xong thì `COMPLETED`.
6. Hoàn tất và đã thanh toán thì cộng điểm thân thiết cho khách.

### Luồng 2: Bán tại quầy

1. Thu ngân tạo đơn tại quầy (có thể chọn khách theo số điện thoại để tích điểm). Sửa đơn chỉ được khi kho chưa bị trừ.
2. Thu tiền: tiền mặt (có tiền nhận và tiền thối), hoặc chuyển khoản (thu ngân đối chiếu mã giao dịch).
3. Barista pha chế, thu ngân bàn giao đơn cho khách.
4. Hủy đơn đã thanh toán phải qua **hoàn tiền rồi hủy**, do Admin xác nhận, ghi rõ hoàn vào ca của thu ngân nào.

### Luồng 3: COD và đóng ca

1. Shipper giao hàng và thu tiền mặt. Còn đơn chưa giao xong thì không được chốt ca.
2. Cuối ca, shipper **nộp COD** cho thu ngân đang trong ca.
3. Thu ngân xác nhận số tiền thực nhận (có thể lệch, có ghi chú).
4. Cuối ca, thu ngân đếm két và nộp biên bản bàn giao. Admin duyệt hoặc từ chối.

### Luồng 4: Nhập hàng và kho

Nhân viên đề xuất nhập → Admin duyệt → tạo phiếu nhập gửi nhà cung cấp → nhận hàng → cộng kho và ghi `inventory_transactions`. Khi bán hàng thì tồn kho giảm theo công thức pha chế. Khi tồn thấp hơn ngưỡng, hệ thống cảnh báo để đề xuất nhập.

---

## 5. Các quy tắc nghiệp vụ dễ bị hỏi

- **Vì sao lưu lại giá món trong đơn?** Để đổi giá thực đơn sau này không làm thay đổi đơn và doanh thu cũ.
- **Khách có hủy đơn được không?** Chỉ hủy được đơn `PENDING` chưa thanh toán. Đơn đã thanh toán phải do Admin hoàn tiền rồi hủy.
- **Trừ kho lúc nào?** Khi đơn bắt đầu pha chế, một lần duy nhất. Sau đó không sửa món trong đơn.
- **Hai thu ngân cùng thao tác thì sao?** Khóa lạc quan và khóa đơn hàng chặn xung đột, người sau nhận thông báo tải lại.
- **Tiền COD đi đường nào?** Khách trả shipper, shipper nộp thu ngân, thu ngân đưa vào két và biên bản bàn giao, Admin duyệt. Mỗi bước có người nhận và thời điểm được lưu.
- **Ai chấm công?** Admin. Điều này giúp tránh nhân viên tự chấm hộ nhau.
- **Mật khẩu lưu thế nào?** Băm bằng bcrypt, không bao giờ trả về qua API.
- **Quên mật khẩu?** Có bảng `PasswordRecovery` lưu mã OTP đã băm, có hạn dùng, giới hạn số lần thử, tự xóa khi hết hạn (TTL index).

---

## 6. Đối chiếu ERD và code (để trả lời nếu bị hỏi "sao khác nhau")

| ERD | Trong code | Cách giải thích |
|---|---|---|
| `order_items` | Nhúng trong `Order.items` (còn model `OrderItem` cũ, không dùng cho luồng chính) | MongoDB nhúng bảng chi tiết vào bảng cha |
| `deliveries` | Nhúng trong `Order.delivery` cùng trường `shipper` | Giao hàng và trạng thái đơn đổi cùng lúc nên nhúng |
| `delivery_issues` có `delivery_id` | Có model riêng, gắn theo `order` và `reporter`, có `outcome` | Gắn thẳng đơn vì mỗi đơn chỉ có một lần giao |
| `purchase_order_items`, `restock_request_items` | Nhúng trong `items` của phiếu cha | Như trên |
| `product_ingredients` | Nhúng `Product.recipe` và model `ProductIngredient` riêng | Hai dạng cùng tồn tại |
| `product_images`, `category_images` | Không có, ảnh lưu ở `imageUrl` | **ERD thừa so với code, nên xóa khỏi ERD hoặc nói là phát triển sau** |
| `deliveries.cod_*` | COD nằm ở `payments` và `work_schedules` | ERD cần cập nhật |
| `customer_reviews` có `ticket_code`, `title`, `progress_percent`, `agent_*` | Code dùng `issueType`, `rating`, `topic`, `content`, `attachments`, `status`, `adminResponse`, `respondedBy` | **Khác khá nhiều, nên sửa ERD theo code** |
| `payments.gateway_reference`, `callback_payload`, `callback_received_at` | Code có `transactionCode`, `confirmationMode`, thông tin hoàn tiền, không có `callbackPayload` | Cần xác nhận lại với người làm phần cổng thanh toán |
| `orders.scheduled_at` | Không có trong model | Tính năng hẹn giờ chưa làm |
| Không có trong ERD | `Cart`, `Voucher`, `RewardItem`, `UserReward`, `DeliveryArea`, `ShopSetting`, `PasswordRecovery` | **ERD thiếu 7 thực thể.** `DeliveryArea` là phí giao theo quận (UC71) nên nên thêm vào |
| `users` | Code có thêm `emailKey`, `passwordChangedAt`, `checkoutRevision` | Trường hỗ trợ kỹ thuật |
| `work_schedules.shift_id` | Có cả `shiftName` và tham chiếu `shift` | Giữ tên ca để dữ liệu cũ không mất khi khung giờ đổi |

Tóm lại, trước buổi thuyết trình nên sửa ERD ở ba chỗ: bỏ hoặc ghi chú `product_images` và `category_images`, thêm `DeliveryArea` (và các bảng khách hàng thân thiết, voucher nếu cần), và sửa `customer_reviews` cho khớp code.

---

## 7. Câu hỏi dự kiến và gợi ý trả lời

1. **Vì sao dùng MongoDB mà ERD vẽ kiểu quan hệ?** ERD là mô hình logic để mô tả quan hệ giữa các thực thể. Với MongoDB, dữ liệu luôn đi cùng nhau (chi tiết đơn, các bước giao) được nhúng vào bảng cha để đọc và ghi trong một lần, còn dữ liệu dùng chung (người dùng, sản phẩm, nguyên liệu) vẫn tham chiếu bằng id.
2. **Làm sao đảm bảo không mất tiền khi hệ thống lỗi giữa chừng?** Các thao tác tiền (thanh toán, hoàn tiền, nộp COD, đóng ca) chạy trong transaction nên hoặc xong hết hoặc không đổi gì.
3. **Hai người cùng xác nhận một khoản thanh toán thì sao?** Thao tác xác nhận dùng điều kiện cập nhật nguyên tử (chỉ cập nhật khi còn trạng thái PENDING), người thứ hai nhận lỗi 409. Mã chuyển khoản cũng là duy nhất.
4. **Điểm thân thiết có thể bị cộng hai lần không?** Không. Có unique index theo đơn và kiểm tra trước khi cộng.
5. **Tồn kho âm thì sao?** `current_stock` có ràng buộc không âm. Đặt hàng kiểm tra tồn trước, và việc trừ kho ghi sổ đầy đủ tồn trước, tồn sau.
6. **Xóa người dùng có mất lịch sử không?** Không cho xóa nếu đã có đơn, ca, phiếu nhập hoặc giao dịch điểm. Chỉ chuyển sang ngừng hoạt động.
7. **Phân quyền thế nào?** Theo `role` và `position`: ví dụ chỉ thu ngân hoặc quản lý nhận COD, chỉ shipper xác nhận nhận đơn giao, chỉ Admin chấm công và duyệt bàn giao.
8. **Giá vốn tính ra sao?** Mỗi lô nhập lưu số lượng, số còn lại và đơn giá. Khi xuất kho, hệ thống ghi lô nào đã dùng và giá vốn tương ứng vào đơn (`costTotal`). Đơn thiếu giá nhập được đánh dấu `MISSING_PRICE`.
9. **Hệ thống mở rộng thế nào?** Thêm chi nhánh (thêm trường chi nhánh vào đơn, ca, kho) và thêm cổng thanh toán thật.

---

## 8. Kết (khoảng 20 giây)

*"Tóm lại, cơ sở dữ liệu của Aura Café được tổ chức quanh ba trục: đơn hàng và thanh toán, ca làm việc và đối soát tiền, kho và nhập hàng. Mọi thao tác tiền đều chạy trong transaction và có dấu vết kiểm toán rõ ràng, nên khi cần có thể truy ngược được ai làm gì, vào lúc nào. Em xin cảm ơn, và sẵn sàng nhận câu hỏi từ hội đồng."*
