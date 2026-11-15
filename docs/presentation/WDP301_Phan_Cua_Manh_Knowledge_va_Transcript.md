# Phần của Mạnh: kiến thức nền và transcript thuyết trình

Nguồn: file `WDP301_Aura_Cafe_FinalReleaseDocument.docx.pdf` (150 trang, các mục I.2.3 đến I.2.5, I.2.13, II.3 đến II.10, III.2 đến III.3) đối chiếu với code trên `develop` (commit `b09e2d0`). Chỗ nào tài liệu và code khác nhau đều ghi ở mục 5.

---

## 1. Phạm vi của Mạnh

Mạnh là lead của **4 luồng nghiệp vụ** và sở hữu **7 màn hình**.

| Luồng | Tên | Use case | Người dùng chính |
|---|---|---|---|
| BF-05 | Bán tại quầy (Counter Ordering) | UC14, UC18 đến UC22, UC62, UC64 | Thu ngân |
| BF-03 | Pha chế (Order Preparation) | UC23, UC24 | Pha chế |
| BF-04 | Giao hàng (Order Delivery) | UC26 đến UC30, UC71, UC72 | Shipper, Admin |
| BF-13 | Theo dõi bán hàng (Sales Review and Order Follow Up) | UC14, UC61, UC66, UC67 | Admin |

Bảy màn hình (theo bảng phân công trong tài liệu): Counter POS (08), Counter Order Management (12), Barista Preparation Dashboard (13), Delivery Dashboard (14), Business Reports Dashboard (31), Admin Order Management (32), Delivery Area Fee Management (35).

Ghi chú: UC62 và UC64 (tích và đổi điểm) có lead là Nguyên (BF-12), Mạnh chỉ dùng trong luồng bán tại quầy. UC61 (quản lý khách hàng) nằm trong BF-13 của Mạnh, nhưng mục trách nhiệm ở tài liệu (trang phân công) lại ghi Ngọc, nên hai chỗ chưa khớp nhau.

---

## 2. Kiến thức từng luồng

### 2.1 BF-05 Bán tại quầy

**Mục tiêu:** khách đến quán, thu ngân lập đơn và thu tiền ngay, pha chế làm, thu ngân giao cho khách.

**Các bước:**
1. Thu ngân chọn món, tùy chọn (size, topping, đường, đá), số lượng. Chọn loại đơn: tại quán (kèm số bàn) hoặc mang đi.
2. Tìm khách hội viên theo số điện thoại để tích hoặc đổi điểm (không bắt buộc).
3. Thu tiền:
   - **Tiền mặt:** nhập số khách đưa, hệ thống tính tiền thối. Đơn sang `CONFIRMED`, thanh toán `SUCCESS` ngay.
   - **Chuyển khoản:** thanh toán ở `PENDING`, thu ngân đối chiếu mã giao dịch rồi xác nhận. Mã này là duy nhất, không dùng lại cho đơn khác.
4. Pha chế làm xong thì đơn `READY`. Thu ngân bấm **Hoàn tất** để giao cho khách, đơn `COMPLETED`.
5. Hủy: tài liệu cho hủy khi đơn còn `PENDING` hoặc `CONFIRMED`. Đơn đã thu tiền phải qua hoàn tiền (xem mục 3).

**Màn danh sách đơn tại quầy (UC20):** chọn ngày (mặc định hôm nay), lọc theo loại và trạng thái, tìm theo mã đơn hoặc số bàn. Thu ngân và pha chế xem được, vai trò khác nhận lỗi 403.

**Điểm kỹ thuật:** giá, tổng tiền, điểm do máy chủ tính lại, không tin dữ liệu trình duyệt gửi lên. Sửa đơn tại quầy chỉ được khi kho chưa bị trừ.

### 2.2 BF-03 Pha chế

**Mục tiêu:** pha chế thấy hàng chờ, làm từng món, báo xong.

- Hàng chờ chung cho cả ba kênh (tại quán, mang đi, online). Đơn xuất hiện khi **đã thanh toán thành công**, hoặc là đơn online chọn **COD**.
- Pha chế tick từng món đã làm (theo từng ly). Đơn có món được tick hiện "Đang pha". Cờ này lưu trên máy chủ nên tải lại trang không mất.
- Bấm **Hoàn tất** thì đơn `READY`. Hệ thống **trừ nguyên liệu theo công thức**, ghi sổ `OUT_ORDER`, mỗi đơn đúng một lần. Không đủ tồn thì báo lỗi và đơn không chuyển trạng thái. Nếu đơn bị người khác đổi trong lúc đó cũng báo lỗi.
- Giá vốn được ghi theo lô nhập (nhập trước dùng trước) và chốt vào đơn, nên đổi giá nhập sau này không làm đổi giá vốn đơn cũ.

### 2.3 BF-04 Giao hàng

**Mục tiêu:** đơn online được giao tới khách, tiền COD về tay thu ngân.

1. Admin gán shipper cho đơn online (UC72). Chỉ gán được shipper đang hoạt động, đơn chưa hoàn tất hay hủy, và **chưa được lấy hàng**. Sau khi lấy hàng thì không đổi shipper nữa.
2. Shipper chỉ thấy đơn được gán cho mình. Trạng thái giao: `ASSIGNED` → `ACCEPTED` → `DELIVERING` → `DELIVERED`.
   - **Nhận đơn:** `ASSIGNED` sang `ACCEPTED`.
   - **Lấy hàng:** chỉ khi đơn đã `READY`, khi đó giao hàng và đơn cùng sang `DELIVERING`.
   - **Giao thành công:** với COD phải nhập đúng số tiền đã thu bằng số tiền COD. Thanh toán `SUCCESS`, cộng điểm, đơn `COMPLETED`. Bấm lại lần hai không thu hay cộng điểm hai lần.
3. **Báo sự cố (UC29):** chọn loại (không liên lạc được, sai địa chỉ, khách từ chối, hàng hỏng, giao trễ, khác), nhập mô tả tối đa 500 ký tự, và kết quả xử lý. Báo được khi đơn chưa giao xong.
4. **Nộp COD (UC30):** shipper nộp tiền cho thu ngân đang trong ca. Thu ngân xác nhận số tiền thực nhận. Shipper còn đơn chưa giao xong thì không chốt ca được.
5. **Phí giao theo quận (UC71):** Admin cấu hình phí và cờ "Nhận giao" cho từng quận ở Hà Nội. Khách đặt hàng chỉ chọn được quận đang nhận giao. Đổi phí không làm đổi giá các đơn đã đặt, vì đơn lưu bản chụp phí và địa chỉ.

### 2.4 BF-13 Theo dõi bán hàng (Admin)

- **Quản lý đơn (UC67):** xem mọi đơn của mọi kênh, có số liệu tổng quan (tổng đơn, đang xử lý, đã hủy, doanh thu hoàn tất). Lọc theo loại, trạng thái, tìm theo mã, tên, điện thoại. Mở chi tiết thấy món, cờ đã pha, thanh toán, giao hàng và sự cố. Đổi trạng thái theo bảng chuyển hợp lệ.
- **Hóa đơn điện tử (UC14):** xem hóa đơn của đơn đã lưu.
- **Quản lý khách hàng (UC61):** tìm, thêm khách, khóa hoặc mở khóa, xem điểm, số đơn, tổng chi tiêu. Tổng chi tiêu tính theo các khoản thanh toán thành công.
- **Báo cáo (UC66):** chọn kỳ (hôm nay, 7 ngày, 30 ngày, tháng này, tùy chọn tối đa 366 ngày). Không lưu dữ liệu báo cáo, tính trực tiếp từ đơn, thanh toán, nguyên liệu và sổ kho.
  - Doanh thu = các khoản thanh toán thành công, bỏ đơn đã hủy.
  - Có doanh thu theo ngày và theo loại đơn, thanh toán theo phương thức, đơn theo trạng thái, món bán chạy, nguyên liệu dùng nhiều.
  - Mục "Cần xử lý": nguyên liệu dưới mức tối thiểu, đề xuất nhập đang chờ, phản hồi chờ.
  - Tổng tiền theo sản phẩm không phải lợi nhuận ròng.

---

## 3. Quy tắc và công thức cần thuộc

**Vòng đời đơn (các bước chuyển hợp lệ):**
- PENDING sang CONFIRMED, PREPARING, CANCELLED.
- CONFIRMED sang PREPARING, CANCELLED.
- PREPARING sang READY, CANCELLED.
- READY sang PREPARING, DELIVERING, COMPLETED, CANCELLED.
- DELIVERING sang READY, COMPLETED, CANCELLED.
- COMPLETED và CANCELLED là cuối, không đổi nữa.
- Chỉ đơn online mới sang DELIVERING. Đơn online phải qua DELIVERING mới COMPLETED.

**Hủy và hoàn tiền:** khách chỉ hủy được đơn `PENDING` chưa thanh toán. Đơn đã thanh toán phải do Admin **hoàn tiền rồi hủy**, ghi rõ phương thức hoàn và ca của thu ngân bị trừ két. Hủy cần ghi lý do.

**Công thức:**
- Giá một dòng = (giá gốc + phụ thu size + giá topping đã chọn) × số lượng.
- Giảm giá khi đổi điểm = làm tròn xuống (điểm dùng ÷ bước điểm) × giá trị mỗi bước. Không vượt số dư và tổng tiền hàng.
- Điểm tích = làm tròn xuống ((tiền hàng − giảm giá) ÷ số tiền cho 1 điểm). Không tính phí giao. Mặc định 1 điểm cho 1.000đ.
- Phí giao = phí của quận nếu tiền hàng dưới ngưỡng freeship, bằng 0 nếu từ ngưỡng trở lên.
- Tiền két kỳ vọng của thu ngân = tiền đầu ca + tiền mặt bán được + COD đã nhận − tiền mặt hoàn lại. Chênh lệch = tiền thực đếm − tiền kỳ vọng.

**An toàn dữ liệu:**
- Các thao tác tiền (thanh toán, hoàn tiền, hoàn tất giao, nộp COD) chạy trong transaction.
- Đơn có khóa lạc quan, hai người sửa cùng lúc thì người sau nhận xung đột.
- Trừ kho và cộng điểm đều có cơ chế chống làm hai lần.

---

## 4. Các điểm API và dữ liệu hay bị hỏi

| Việc | Điểm vào chính |
|---|---|
| Tạo đơn, danh sách, chi tiết | `POST/GET /api/orders` |
| Đổi trạng thái đơn | `PUT /api/orders/:id/status` |
| Tick món đã pha | `PUT /api/orders/:id/items/:index/prepared` |
| Shipper nhận đơn | `POST /api/orders/:id/delivery/accept` |
| Báo sự cố giao hàng | `POST /api/orders/:id/delivery/issues` |
| Sửa đơn tại quầy | `PUT /api/orders/:id/counter` |
| Xác nhận chuyển khoản tại quầy | `POST /api/payments/:id/counter-confirm` |
| Hoàn tiền và hủy | `POST /api/payments/order/:orderId/refund-and-cancel` |
| Nộp COD của shipper | `PUT /api/work-schedules/:id/shift-action` với `REMIT_COD` |
| Thu ngân nhận COD | `POST /api/work-schedules/:id/confirm-cod` |
| Báo cáo | `/api/reports` |

Dữ liệu liên quan: `orders` (nhúng món và thông tin giao hàng), `payments`, `delivery_issues`, `work_schedules` (tiền COD đã nhận), `delivery_areas`, `inventory_transactions`.

---

## 5. Tài liệu và code đang lệch: cần biết trước khi bị hỏi

| Chỗ | Tài liệu nói | Code thực tế | Nên nói thế nào |
|---|---|---|---|
| Tiền két kỳ vọng | Tiền đầu ca + tiền mặt bán, COD không tự cộng | Cộng thêm COD đã nhận, trừ tiền mặt hoàn lại | Code là bản đúng và mới hơn, tài liệu cần cập nhật |
| Thời điểm trừ kho | Màn pha chế ghi trừ khi bấm Hoàn tất (READY), mục thiết kế ghi trừ khi vào PREPARING | Trừ khi vào PREPARING hoặc READY, tùy bước nào đến trước, đúng một lần | Nói "trừ một lần duy nhất khi bắt đầu hoặc hoàn tất pha chế" |
| Chấm công | Tài liệu mô tả nhân viên tự chấm công của mình | Develop mới chỉ cho Admin ghi giờ vào và giờ ra, shipper chỉ nộp COD | Chính sách đã đổi để tránh chấm hộ |
| Nộp COD | Shipper chọn thu ngân rồi bấm Nộp tiền | Thêm bước thu ngân xác nhận số tiền thực nhận, và shipper còn đơn chưa giao thì không chốt ca | Nói theo code, kèm ý nghĩa đối soát hai bước |
| Sự cố giao hàng | Chỉ có loại và mô tả | Có thêm kết quả xử lý (báo cáo, trả về quán, hủy) và lưu bảng riêng | Phần bổ sung sau tài liệu |
| Chuyển khoản tại quầy | Chờ xác nhận, tự động ở chế độ test | Thu ngân nhập và đối chiếu mã giao dịch, mã duy nhất | Nói theo code |
| UC61 | BF-13 của Mạnh | Mục trách nhiệm ghi Ngọc | Hỏi lại nhóm để thống nhất người phụ trách |
| CSRF | Màn giao hàng ghi cần CSRF token | Mục bảo mật ghi API dùng Bearer JWT, không cookie phiên | Nói API dùng JWT trong header |

Việc nên làm trước buổi báo cáo: cập nhật tài liệu ở các dòng trên, hoặc chuẩn bị sẵn câu trả lời.

---

## 6. Transcript thuyết trình (khoảng 6 phút)

[Chiếu sơ đồ luồng hoặc ảnh màn hình khi nói tới từng phần.]

**Mở đầu**

Kính chào thầy cô và các bạn. Em là Mạnh. Trong dự án Aura Café, em phụ trách bốn luồng nghiệp vụ: bán tại quầy, pha chế, giao hàng, và theo dõi bán hàng cho quản trị viên. Nói đơn giản, đây là hành trình của một đơn hàng từ lúc được tạo, được pha, được giao, cho tới lúc tiền về quán và được báo cáo.

**Luồng 1. Bán tại quầy**

Khách đến quán, thu ngân chọn món, tùy chọn size, topping, đường, đá, và loại đơn là tại quán hoặc mang đi. Nếu khách là hội viên, thu ngân nhập số điện thoại để tích hoặc đổi điểm.

Về thanh toán có hai cách. Tiền mặt thì hệ thống tính tiền thối, đơn được xác nhận ngay. Chuyển khoản thì thu ngân đối chiếu mã giao dịch rồi xác nhận, và mỗi mã chỉ dùng được một lần, tránh một giao dịch xác nhận cho hai đơn.

Một điểm em muốn nhấn mạnh: giá, tổng tiền và điểm đều do máy chủ tính lại, trình duyệt không thể gửi giá giả. Sau khi pha chế xong, thu ngân bấm hoàn tất để giao cho khách. Nếu cần hủy đơn đã thu tiền thì phải đi qua hoàn tiền do quản trị viên xác nhận.

**Luồng 2. Pha chế**

Pha chế thấy một hàng chờ chung cho cả ba kênh. Đơn chỉ xuất hiện khi đã thanh toán, hoặc là đơn online chọn trả tiền khi nhận. Pha chế tick từng ly đã làm, và trạng thái này lưu trên máy chủ nên tải lại trang không mất.

Khi hoàn tất, đơn sang trạng thái sẵn sàng, và hệ thống trừ nguyên liệu theo công thức. Việc trừ kho chỉ xảy ra đúng một lần cho mỗi đơn. Nếu không đủ nguyên liệu thì đơn không chuyển trạng thái và có thông báo. Giá vốn được tính theo lô nhập trước dùng trước và chốt vào đơn, nên đổi giá nhập sau này không làm sai giá vốn đơn cũ.

**Luồng 3. Giao hàng**

Với đơn online, quản trị viên gán shipper trước khi shipper lấy hàng. Shipper chỉ thấy đơn của mình. Quy trình là nhận đơn, lấy hàng khi đơn đã sẵn sàng, rồi giao thành công. Với đơn COD, shipper phải nhập đúng số tiền thu bằng số tiền của đơn mới hoàn tất được, và bấm hai lần không bị thu hay cộng điểm hai lần.

Nếu có sự cố như không liên lạc được khách, sai địa chỉ, hay khách từ chối, shipper báo kèm mô tả và hướng xử lý. Sự cố được lưu riêng để quản lý xem lại.

Phần tiền COD đi như sau: khách trả cho shipper, shipper nộp cho thu ngân đang trong ca, thu ngân xác nhận số thực nhận, và số này vào biên bản bàn giao cuối ca. Shipper còn đơn chưa giao xong thì chưa được chốt ca. Ngoài ra quản trị viên cấu hình phí giao theo từng quận, và đổi phí không ảnh hưởng đơn đã đặt vì đơn lưu bản chụp phí.

**Luồng 4. Theo dõi bán hàng của quản trị viên**

Quản trị viên xem mọi đơn của mọi kênh, mở chi tiết để thấy món, thanh toán, giao hàng và sự cố, và đổi trạng thái theo các bước hợp lệ. Có trang quản lý khách hàng với điểm, số đơn và tổng chi tiêu.

Cuối cùng là báo cáo kinh doanh. Báo cáo không lưu sẵn mà tính trực tiếp từ đơn, thanh toán và kho. Doanh thu là các khoản thanh toán thành công, loại trừ đơn đã hủy. Có doanh thu theo ngày, theo loại đơn, theo phương thức thanh toán, món bán chạy, và danh sách cần xử lý như nguyên liệu dưới mức tối thiểu.

**Độ tin cậy**

Các thao tác liên quan đến tiền như thanh toán, hoàn tiền, hoàn tất giao và nộp COD đều chạy trong transaction, nên hoặc xong hết hoặc không đổi gì. Đơn có khóa lạc quan để hai người sửa cùng lúc không ghi đè nhau.

**Kết**

Tóm lại, phần của em nối liền chuỗi bán hàng: từ quầy hoặc online, qua pha chế và giao hàng, tới tiền và báo cáo. Mỗi bước đều có người thực hiện, thời điểm và trạng thái được lưu, nên truy ngược được. Em xin cảm ơn thầy cô và các bạn, và sẵn sàng nhận câu hỏi.

---

## 7. Câu hỏi dự kiến

**Vì sao đơn COD vẫn vào hàng chờ pha chế dù chưa trả tiền?** Vì COD thu tiền khi giao. Đơn được xác nhận khi khách chọn COD, và tiền chỉ tính là thành công khi shipper thu đúng số.

**Hai người cùng hủy hoặc sửa một đơn thì sao?** Đơn dùng khóa lạc quan và điều kiện trạng thái, người ghi sau nhận lỗi xung đột và phải tải lại.

**Trừ kho lúc nào, có trừ hai lần không?** Một lần khi bắt đầu hoặc hoàn tất pha chế. Đơn lưu mốc đã trừ và sổ `OUT_ORDER` có chống trùng, nên không trừ lần hai.

**Đổi phí giao theo quận có làm đổi đơn cũ không?** Không, đơn lưu bản chụp phí, quận và địa chỉ lúc đặt.

**Hủy đơn đã thanh toán thế nào?** Chỉ Admin hoàn tiền rồi hủy. Hoàn tiền mặt thì trừ vào két của đúng ca thu ngân đã nhận, nên đối soát ca không bị lệch.

**Tiền COD có thể thất thoát ở đâu không?** Mỗi bước có người nhận, số tiền và thời điểm: shipper thu, nộp thu ngân, thu ngân xác nhận, vào biên bản ca, Admin duyệt. Biên bản bị từ chối thì thu ngân phải giải trình và nộp lại.

**Báo cáo doanh thu có tính phí giao hay đơn hủy không?** Doanh thu lấy các khoản thanh toán thành công và bỏ đơn đã hủy. Tổng tiền theo sản phẩm không phải lợi nhuận ròng.

**Chuyển khoản tại quầy có kết nối cổng thanh toán thật không?** Không. Tài liệu ghi rõ POS chỉ có đối chiếu thủ công và mô phỏng kiểm thử, tích hợp ngân hàng thật cho POS chưa được chứng minh. Chuyển khoản online của khách mới đi qua callback có chữ ký.
