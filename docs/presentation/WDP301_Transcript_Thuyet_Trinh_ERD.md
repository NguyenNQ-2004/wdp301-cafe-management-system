# Transcript thuyết trình: Cơ sở dữ liệu Aura Café theo sơ đồ ERD

Thời lượng đọc: khoảng 13 đến 15 phút. Lời nói viết sẵn để đọc thẳng. Phần trong ngoặc vuông `[ ... ]` là chỉ dẫn thao tác trên ảnh ERD, không đọc thành tiếng.

Trình tự đi theo vị trí trên ảnh: bắt đầu từ bảng `users` ở bên trái, sang `orders` ở giữa, rồi đi vòng lên các bảng ca làm việc ở phía trên, thực đơn ở phía phải, và kết thúc ở khu kho và nhập hàng phía dưới.

---

## Phần 1. Mở đầu (khoảng 1 phút)

Kính chào thầy cô và các bạn. Em xin trình bày phần thiết kế cơ sở dữ liệu của hệ thống quản lý quán cà phê Aura Café.

Hệ thống phục vụ bốn nhóm người dùng: khách hàng đặt món, nhân viên quầy gồm thu ngân, pha chế và giao hàng, và quản trị viên. Để phục vụ họ, cơ sở dữ liệu có 23 bảng, và em sẽ đi qua toàn bộ trên sơ đồ này.

Trước khi vào chi tiết, em xin nói một điểm. Sơ đồ ERD này là mô hình logic, vẽ theo kiểu quan hệ cho dễ đọc. Khi cài đặt, nhóm em dùng MongoDB, nên một số bảng chi tiết như chi tiết đơn hàng, thông tin giao hàng được nhúng vào bảng cha. Em sẽ nói rõ từng chỗ khi gặp.

Em chia sơ đồ thành sáu nhóm: một, tài khoản người dùng. Hai, đơn hàng và thanh toán. Ba, giao hàng. Bốn, ca làm việc và bàn giao tiền. Năm, thực đơn và công thức. Sáu, kho và nhập hàng. Cuối cùng là khách hàng thân thiết và phản hồi.

---

## Phần 2. Bảng `users`: nền tảng của hệ thống (khoảng 1 phút 30 giây)

[Chỉ vào bảng `users` ở bên trái ảnh.]

Em bắt đầu từ bảng `users`, vì gần như mọi bảng khác đều trỏ về đây, như các đường nét đứt đi ra từ bảng này.

Điểm đầu tiên: ba loại người dùng dùng chung một bảng, phân biệt bằng cột `role`, gồm `ADMIN`, `STAFF` và `CUSTOMER`. Riêng nhân viên có thêm cột `position`: quản lý, pha chế, thu ngân hoặc giao hàng. Nhờ vậy, đơn hàng, ca làm, điểm thưởng đều trỏ về một nơi, và truy được ai đã làm gì rất rõ.

Các cột còn lại: `full_name`, `phone`, `email`, `password_hash`, ngày sinh, địa chỉ. Nhân viên có thêm `base_salary` và `hire_date`. Khách hàng dùng cột `total_points` để lưu điểm thân thiết hiện tại.

Về ràng buộc: số điện thoại là duy nhất, email cũng duy nhất. Mật khẩu không lưu thẳng mà lưu dạng băm, tối thiểu tám ký tự, phải có cả chữ và số. Cột `status` có ba trạng thái: hoạt động, ngừng hoạt động và khóa.

Hai quy tắc bảo vệ dữ liệu: quản trị viên đang hoạt động cuối cùng thì không thể bị khóa hay xóa, và tài khoản đã có lịch sử đơn hàng, ca làm hay giao dịch thì không xóa được, chỉ chuyển sang ngừng hoạt động, để không mất dấu vết.

---

## Phần 3. Bảng `orders`: trung tâm của hệ thống (khoảng 2 phút)

[Chỉ vào bảng `orders` ở giữa bên trái ảnh.]

Tiếp theo là bảng `orders`, đây là bảng trung tâm.

Mỗi đơn có `order_code` duy nhất. Cột `order_type` có ba loại: dùng tại quán, mang đi và giao hàng online. Các khóa ngoại đều trỏ về `users`: `customer_id` là khách đặt, `cashier_id` là thu ngân tạo đơn tại quầy, `shipper_id` là người giao. Đơn tại quầy có thể không có khách nên `customer_id` không bắt buộc.

Phần tiền gồm bốn cột: `total_amount` là tổng tiền món, `discount_amount` là giảm giá, `delivery_fee` là phí giao, và `final_amount` là số khách phải trả. Với đơn giao hàng, phí giao lấy theo quận trong bảng cấu hình khu vực giao hàng.

Đơn hàng đi qua vòng đời trạng thái sau. Mới tạo là `PENDING`. Sau đó là `CONFIRMED`, rồi `PREPARING` khi pha chế, `READY` khi sẵn sàng, `DELIVERING` khi đang giao, và `COMPLETED` khi hoàn tất. Đơn có thể bị `CANCELLED`. Hệ thống cho phép chuyển trạng thái theo một bảng quy tắc cố định, ví dụ đơn đã hoàn tất hoặc đã hủy thì không đổi được nữa, và chỉ đơn giao hàng mới được chuyển sang trạng thái đang giao.

Một quy tắc nghiệp vụ quan trọng: khách chỉ hủy được đơn đang `PENDING` và chưa thanh toán. Đơn đã thanh toán phải do quản trị viên xác nhận hoàn tiền rồi mới hủy.

Ngoài ra bảng còn có tên, số điện thoại người nhận, địa chỉ giao, số bàn và ghi chú đơn.

---

## Phần 4. Bảng `order_items` (khoảng 1 phút)

[Chỉ vào bảng `order_items` ở bên phải, nối với `orders` và `products`.]

Bảng `order_items` là chi tiết từng món trong đơn: sản phẩm nào, số lượng, đơn giá, tùy chọn như size hoặc topping, và thành tiền.

Có hai điểm đáng chú ý. Thứ nhất, bảng lưu lại `product_name_at_time` và `unit_price` tại thời điểm đặt. Lý do là sau này quán đổi giá hay đổi tên món thì đơn cũ và doanh thu cũ vẫn đúng.

Thứ hai, trong bản cài đặt MongoDB, các dòng này được nhúng thẳng vào đơn hàng, thành một mảng `items`. Mỗi món còn có cờ đã pha xong hay chưa, để pha chế tick từng món.

---

## Phần 5. Bảng `payments` (khoảng 1 phút 30 giây)

[Chỉ vào bảng `payments`, nối với `orders`.]

Bảng `payments` ghi thanh toán của từng đơn. Cột `payment_method` gồm tiền mặt, VNPay, MoMo và chuyển khoản. Đơn COD là thu tiền mặt khi giao nên ghi nhận là tiền mặt do shipper thu.

Cột `status` có bốn trạng thái: chờ, thành công, thất bại, đã hoàn tiền. Có `transaction_code` là mã giao dịch, và `paid_at` là thời điểm thanh toán.

Một số ràng buộc để bảo vệ tiền. Mã chuyển khoản do thu ngân xác nhận tại quầy là duy nhất, nên một mã không thể xác nhận cho hai đơn. Khi cổng thanh toán gọi lại hệ thống, hệ thống kiểm tra đúng số tiền và đúng mã giao dịch, và nếu cổng gọi lặp lại thì không ghi hai lần.

Bảng này cũng lưu thông tin hoàn tiền: số tiền hoàn, phương thức, mã tham chiếu, và hoàn vào ca của thu ngân nào, để két của ca đó được đối soát đúng. Với đơn COD, bảng ghi shipper đã thu và thời điểm nộp lại cho quán.

Một lưu ý nhỏ: sơ đồ có các cột `gateway_reference` và dữ liệu callback. Trong bản cài đặt hiện tại, em lưu mã giao dịch và chế độ xác nhận, còn toàn bộ nội dung callback thì chưa lưu nguyên văn.

---

## Phần 6. Giao hàng: `deliveries` và `delivery_issues` (khoảng 1 phút 30 giây)

[Chỉ vào hai bảng `deliveries` và `delivery_issues` ở giữa ảnh.]

Bảng `deliveries` quản lý việc giao của từng đơn online: shipper nào, trạng thái giao, các mốc thời gian được phân công, nhận đơn, giao xong, và phần COD gồm số tiền, số đã thu và đã nộp.

Trong cài đặt thực tế, em nhúng thông tin này vào đơn hàng, vì phân công shipper, các bước giao và trạng thái đơn phải đổi cùng lúc trong một lần ghi. Trạng thái giao gồm: được phân công, đã nhận, đang giao, đã giao, trả về, hủy. Shipper phải **xác nhận nhận đơn** trước khi lấy hàng. Phần theo dõi tiền COD thì nằm ở bảng thanh toán và bảng ca làm việc, em sẽ nói ở phần sau.

Bảng `delivery_issues` lưu sự cố do shipper báo: không liên lạc được khách, sai địa chỉ, khách từ chối, hàng hỏng, giao trễ hoặc lý do khác, kèm mô tả. Mỗi báo cáo có kết quả xử lý: chỉ báo cáo, trả đơn về quán hoặc hủy đơn. Nhờ lưu thành bảng riêng, quản lý xem lại được lịch sử sự cố và không bị mất khi đơn đổi trạng thái.

---

## Phần 7. Ca làm việc và bàn giao tiền (khoảng 2 phút 30 giây)

[Chỉ lên ba bảng ở phía trên: `work_shifts`, `work_schedules`, `shift_handovers`.]

Đây là nhóm bảng ở phía trên sơ đồ, phục vụ quản lý nhân sự và đối soát tiền.

**`work_shifts`** là khung giờ ca theo tuần: tên ca, giờ bắt đầu, giờ kết thúc. Tuần luôn bắt đầu từ thứ Hai, và giờ kết thúc phải sau giờ bắt đầu.

**`work_schedules`** là lịch phân công: nhân viên nào làm ca nào, ngày nào. Một nhân viên không thể bị phân hai lần vào cùng một ca trong cùng một ngày. Cột `status` có bốn giá trị: chưa chấm công, đang trong ca, vắng mặt và đã hoàn thành. Chấm công do quản trị viên ghi nhận giờ vào và giờ ra, nhân viên không tự chấm, nhằm tránh chấm hộ. Riêng shipper tự nộp COD và chốt ca khi đã giao xong. Bảng này cũng lưu tiền đầu ca, tiền cuối ca theo hệ thống và theo thực tế đếm.

**`shift_handovers`** là biên bản bàn giao két của thu ngân, mỗi ca một biên bản. Tiền hệ thống kỳ vọng được tính bằng: **tiền đầu ca, cộng tiền mặt bán được, cộng COD nhận từ shipper, trừ tiền mặt đã hoàn cho khách**. Thu ngân đếm tiền thật và nhập vào, cột chênh lệch cho biết lệch bao nhiêu. Biên bản có ba trạng thái: đã nộp, được quản trị viên xác nhận, hoặc bị từ chối. Nếu bị từ chối, thu ngân phải nộp lại, và mọi lần xử lý đều được lưu vào lịch sử.

Luồng tiền COD đi như sau: khách trả tiền cho shipper, shipper nộp cho thu ngân đang trong ca, thu ngân xác nhận số tiền thực nhận, cuối ca số này nằm trong biên bản bàn giao, và quản trị viên duyệt. Mỗi bước đều lưu người nhận và thời điểm.

---

## Phần 8. Thực đơn: `categories`, `products`, `product_ingredients` và bảng ảnh (khoảng 1 phút 30 giây)

[Chỉ vào cụm bên phải: `categories`, `category_images`, `products`, `product_images`, `product_ingredients`.]

Bảng `categories` là nhóm món. Bảng `products` là từng món: thuộc một nhóm, có tên, giá gốc `base_price`, mô tả, cờ `is_available` để bật tắt món, và cột `variants_config` dạng JSON chứa các tùy chọn như size và topping. Em dùng JSON vì mỗi món có số tùy chọn khác nhau.

Các bảng `category_images` và `product_images` trong sơ đồ dùng để lưu ảnh. Ở bản cài đặt hiện tại, ảnh được lưu bằng đường dẫn ngay trên nhóm món và món, nên hai bảng ảnh này là hướng thiết kế dự phòng khi cần lưu ảnh trực tiếp trong cơ sở dữ liệu.

Bảng `product_ingredients` là **công thức pha chế**: một món cần những nguyên liệu nào và bao nhiêu mỗi loại. Cặp món và nguyên liệu là duy nhất. Công thức này là cầu nối giữa thực đơn và kho: khi bán một món, hệ thống biết cần trừ bao nhiêu nguyên liệu.

---

## Phần 9. Kho: `ingredients`, `suppliers`, `inventory_transactions` (khoảng 1 phút 30 giây)

[Chỉ vào cụm giữa dưới: `ingredients`, `suppliers`, `inventory_transactions`.]

Bảng `ingredients` là nguyên liệu: tên, đơn vị, nhà cung cấp, `current_stock` là tồn hiện tại và `min_stock_level` là mức tồn tối thiểu. Tồn kho không được âm. Em cũng lưu các lô nhập với số lượng còn lại và đơn giá, để tính giá vốn theo lô.

Bảng `suppliers` là nhà cung cấp: tên, số điện thoại, địa chỉ, trạng thái.

Bảng `inventory_transactions` là sổ ghi mọi lần tồn kho thay đổi. Loại giao dịch gồm nhập mua, xuất theo đơn, điều chỉnh và hao hụt. Mỗi dòng ghi tồn trước, tồn sau và tham chiếu đến đơn hay phiếu nhập liên quan, nên truy lại được vì sao tồn thay đổi.

Về thời điểm trừ kho: hệ thống tự trừ nguyên liệu theo công thức khi đơn chuyển sang bước pha chế, và mỗi đơn chỉ trừ đúng một lần. Sau khi đã trừ kho thì không cho sửa món trong đơn nữa.

---

## Phần 10. Nhập hàng: `restock_requests` và `purchase_orders` (khoảng 1 phút 30 giây)

[Chỉ vào các bảng ở góc dưới: `restock_requests`, `restock_request_items`, `purchase_orders`, `purchase_order_items`.]

Quy trình nhập hàng gồm hai bước.

Bước một là **đề xuất nhập hàng**, bảng `restock_requests`. Nhân viên lập đề xuất ở trạng thái nháp, gửi lên chờ duyệt, và quản trị viên duyệt hoặc từ chối, có ghi chú. Các nguyên liệu cần nhập và số lượng nằm ở `restock_request_items`.

Bước hai là **phiếu nhập**, bảng `purchase_orders`. Phiếu gắn với nhà cung cấp và người tạo, đi qua các trạng thái nháp, đã đặt, đã nhận, hoặc hủy. Chi tiết từng nguyên liệu, số lượng, đơn giá nằm ở `purchase_order_items`. Khi nhận hàng, hệ thống cộng tồn kho và ghi một dòng vào `inventory_transactions`.

Trong cài đặt MongoDB, hai bảng chi tiết `restock_request_items` và `purchase_order_items` được nhúng vào phiếu cha.

---

## Phần 11. Khách hàng thân thiết và phản hồi (khoảng 1 phút 30 giây)

[Chỉ vào `loyalty_transactions` và `customer_reviews` ở giữa ảnh.]

Bảng `loyalty_transactions` ghi mọi lần cộng trừ điểm của khách: loại giao dịch gồm tích điểm, đổi điểm, hoàn điểm và điều chỉnh, kèm số điểm thay đổi và số dư sau giao dịch.

Quy tắc tích điểm: mặc định một điểm cho mỗi một nghìn đồng, tính trên tổng tiền sau giảm giá. Con số này cấu hình được trong bảng thiết lập quán. Điểm chỉ được cộng khi đơn đã thanh toán thành công đúng số tiền, và mỗi đơn chỉ cộng một lần nhờ ràng buộc duy nhất theo đơn. Nếu đơn bị hủy thì điểm đã đổi được hoàn lại và điểm đã tích bị thu hồi.

Bảng `customer_reviews` lưu đánh giá và khiếu nại của khách. Đánh giá có số sao từ một đến năm. Khiếu nại đi qua các trạng thái chờ, đang xử lý, đã giải quyết hoặc từ chối, kèm phản hồi và người phản hồi của quản trị viên. Mỗi phản hồi có thể gắn với một đơn hàng cụ thể.

---

## Phần 12. Các cơ chế bảo vệ dữ liệu (khoảng 1 phút)

Ngoài thiết kế bảng, em xin nêu bốn cơ chế giúp dữ liệu luôn đúng.

Một, **transaction**: các thao tác nhiều bước như thanh toán, hoàn tiền, nộp COD, đóng ca đều chạy trong một transaction, nên hoặc hoàn tất toàn bộ hoặc không thay đổi gì. Vì thế MongoDB được chạy ở chế độ replica set.

Hai, **khóa lạc quan**: nếu hai người cùng sửa một đơn hay một ca, người ghi sau sẽ nhận thông báo xung đột và phải tải lại, thay vì ghi đè lên nhau.

Ba, **ràng buộc duy nhất**: số điện thoại, email, mã đơn, mã chuyển khoản, và mỗi đơn chỉ được cộng điểm một lần.

Bốn, **khóa chống đặt trùng** khi đặt hàng: nếu khách bấm đặt hai lần do mạng chậm thì chỉ tạo một đơn.

---

## Phần 13. Kết (khoảng 30 giây)

Tóm lại, cơ sở dữ liệu của Aura Café xoay quanh ba trục chính: đơn hàng và thanh toán, ca làm việc cùng đối soát tiền, và kho cùng nhập hàng. Các bảng tài khoản và thực đơn là nền, còn khách hàng thân thiết và phản hồi bổ sung trải nghiệm cho khách.

Điểm mạnh của thiết kế là mọi thao tác liên quan đến tiền và kho đều có người thực hiện, thời điểm và trạng thái được lưu lại, nên khi cần có thể truy ngược toàn bộ.

Em xin cảm ơn thầy cô và các bạn đã lắng nghe. Em sẵn sàng nhận câu hỏi.

---

## Phụ lục: câu hỏi có thể gặp và cách trả lời ngắn

**Vì sao ERD vẽ kiểu quan hệ mà dùng MongoDB?**
ERD là mô hình logic để mô tả quan hệ giữa thực thể. Khi cài đặt, dữ liệu luôn đi cùng nhau như chi tiết đơn, các bước giao được nhúng vào bảng cha để đọc và ghi trong một lần. Dữ liệu dùng chung như người dùng, sản phẩm, nguyên liệu vẫn tham chiếu bằng id.

**Vì sao lưu lại tên và giá món trong chi tiết đơn?**
Để đổi giá hoặc tên món sau này không làm sai đơn và doanh thu cũ.

**Hai thu ngân cùng xác nhận một khoản thanh toán thì sao?**
Việc xác nhận chỉ thành công khi thanh toán còn đang chờ, người thứ hai nhận lỗi xung đột. Mã chuyển khoản cũng duy nhất nên không dùng lại được.

**Điểm thân thiết có bị cộng hai lần không?**
Không. Có ràng buộc duy nhất theo đơn và kiểm tra trước khi cộng.

**Ai được chấm công và duyệt bàn giao?**
Quản trị viên chấm công và duyệt biên bản bàn giao. Thu ngân nhận COD từ shipper. Shipper xác nhận nhận đơn và báo sự cố giao hàng.

**Tồn kho có xuống âm không?**
Không. Tồn kho có ràng buộc không âm, đặt hàng kiểm tra tồn trước, và mọi lần thay đổi tồn đều có dòng ghi sổ với tồn trước và tồn sau.

**Xóa người dùng có mất lịch sử không?**
Không xóa được nếu đã có đơn, ca hay giao dịch. Chỉ chuyển sang ngừng hoạt động.

**Sơ đồ có bảng ảnh nhưng code không dùng?**
Bản hiện tại lưu ảnh bằng đường dẫn. Hai bảng ảnh là thiết kế dự phòng khi cần lưu ảnh trong cơ sở dữ liệu.
