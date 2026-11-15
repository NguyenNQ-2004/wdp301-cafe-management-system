# Danh mục Use Case của toàn bộ dự án Aura Café

Nguồn: `SE2064_G1_CafeManagementSystem_SRS_01.docx`, mục 4.2 (bảng Use Case). File này ghi **yêu cầu nghiệp vụ trong SRS**, không xác nhận trạng thái hoàn thành của code. Tên và mô tả được giữ theo tài liệu gốc để dễ đối chiếu.

SRS liệt kê **74 UC**: `UC01–UC73` và `UC75`. **Không có `UC74`** trong danh mục của SRS. Bảng Project Tracking cũ chỉ có đến `UC73`, nên `UC75` được lấy từ SRS.

## Tài khoản, thực đơn, đặt hàng và thanh toán

| UC | Use Case | Phân hệ | Mô tả trong SRS |
| --- | --- | --- | --- |
| UC01 | Register Account | Authentication | Guest creates a Customer account with full name, phone, e-mail and password (≥ 6 characters). |
| UC02 | Log In | Authentication | Any user signs in with phone, e-mail or e-mail name and password; the system redirects by role/position. |
| UC03 | Log Out | Authentication | Signed-in user ends the session. |
| UC04 | Reset Forgotten Password | Authentication | Guest enters the registered e-mail, receives a 6-digit OTP, verifies it and sets a new password. |
| UC05 | Manage Personal Profile | Customer Profile | The signed-in user views and updates name, phone, email, birthday and default address, changes password and views the Aura point history. |
| UC06 | View Homepage | Homepage | Guest/Customer views the banner and favourite products. |
| UC07 | Browse Menu by Category | Menu | Guest/Customer lists available products filtered by an active category. |
| UC08 | Search Products | Menu | Guest/Customer searches products by keyword. |
| UC09 | View Product Details | Product Detail | Guest/Customer views price, description, sizes, toppings and related products. |
| UC10 | Manage Shopping Cart | Shopping Cart | Guest/Customer adds items, changes quantity, selects/removes lines and clears the cart. |
| UC11 | Place Online Order | Online Ordering | Customer enters recipient and Hanoi delivery address and confirms the order (status PENDING). |
| UC12 | Pay by Bank Transfer (VietQR) | Payment | Customer transfers via VietQR; the Payment Gateway callback confirms the payment and the order. |
| UC13 | Choose Cash on Delivery | Payment | The customer chooses COD; the order is confirmed and cash is collected by delivery staff. |
| UC14 | View e-Bill | Bill | Customer (own orders), Cashier or Admin views and prints the electronic bill of an order. |
| UC15 | Track Order Status | Customer Order Management | Customers follows in-progress orders and their current status. |
| UC16 | View Order History | Customer Order Management | The customer lists orders by status tab, order code and date. |
| UC17 | Cancel Unpaid Order | Customer Order Management | Customer cancels an own PENDING order without successful payment; redeemed points are refunded. |

## Bán tại quầy, pha chế và giao hàng

| UC | Use Case | Phân hệ | Mô tả trong SRS |
| --- | --- | --- | --- |
| UC18 | Create Counter Order | Counter Ordering | The cashier builds a DINE_IN/TAKEAWAY order with options, table number and note. |
| UC19 | Take Counter Payment | Counter Ordering | The cashier takes cash (with change) or VietQR payment for the counter order. |
| UC20 | View Counter Order List | Counter Order List | Cashier/Barista views counter orders of a date filtered by status and type. |
| UC21 | Cancel Counter Order | Counter Ordering | Cashier cancels a PENDING/CONFIRMED counter order; points are refunded/reversed. |
| UC22 | Hand Over Counter Order | Counter Ordering | Cashier marks a READY dine-in/takeaway order as COMPLETED. |
| UC23 | View Preparation Queue | Drink Preparation | Barista sees CONFIRMED/PREPARING/READY paid orders with items and notes. |
| UC24 | Update Preparation Progress | Drink Preparation | Barista ticks prepared items and marks the order READY; ingredients are deducted by recipe. |
| UC25 | Reorder Previous Order | Customer Order Management | The customer adds the items of a previous order back to the cart at current prices. |
| UC26 | View Assigned Deliveries | Delivery Management | Delivery staff lists deliveries assigned to him/her with items and counters. |
| UC27 | Accept, Pick Up and Complete Delivery | Delivery Management | Delivery staff accepts, picks up a READY order and confirms successful delivery. |
| UC28 | View Delivery Details and History | Delivery Management | Delivery staff views one delivery with items and issues, and deliveries of a date. |
| UC29 | Report Delivery Issue | Delivery Management | Delivery staff reports an issue type and description for an unfinished delivery. |
| UC30 | Collect and Hand Over COD Cash | Delivery Management | Delivery staff collects the exact COD amount and hands all held COD cash to a Cashier. |

## Danh mục, sản phẩm, công thức và kho

| UC | Use Case | Phân hệ | Mô tả trong SRS |
| --- | --- | --- | --- |
| UC31 | View Category List | Category Management | Admin lists categories with image, product count and status. |
| UC32 | Create / Update Category | Category Management | Admin saves name, status and image of a category. |
| UC33 | Show / Hide Category | Category Management | Admin switches a category between ACTIVE and INACTIVE. |
| UC34 | Delete Category | Category Management | Admin deletes a category that has no product. |
| UC35 | View and Search Products | Product Management | Admin lists products filtered by category and keyword with counters. |
| UC36 | Create Product | Product Management | Admin creates a product with name, category, base price, description and image. |
| UC37 | Update Product | Product Management | Admin edits product information and image. |
| UC38 | Configure Sizes and Toppings | Product Management | Admin defines sizes with surcharges and toppings with prices of a product. |
| UC39 | Change Product Availability | Product Management | Admin pauses or resumes selling a product. |
| UC40 | View Recipe List | Recipe Management | Admin sees which products have or lack a recipe. |
| UC41 | View Recipe Details | Recipe Management | Admin views the ingredient lines of one product. |
| UC42 | Set Up Recipe (BOM) | Recipe Management | Admin adds, edits or removes ingredient lines and quantities of a product. The active recipe form saves the BOM only. |
| UC43 | Calculate Recipe Cost | Recipe Management | The system calculates the cost of one portion from the latest received purchase prices. |
| UC44 | View and Search Ingredients | Ingredient Management | Admin lists ingredients by keyword and supplier with stock and latest price. |
| UC45 | Create Ingredient | Ingredient Management | Admin creates an ingredient with unit, supplier, opening stock and minimum level. |
| UC46 | Update Ingredient | Ingredient Management | Admin updates name, unit, supplier and minimum level. |
| UC47 | Delete Ingredient | Ingredient Management | Admin deletes an ingredient that is not used in any recipe. |
| UC48 | View Stock and Movement History | Inventory Management | Admin views current stock, stock status and the movement history. |
| UC49 | Adjust Stock | Inventory Management | Admin records a stock-count adjustment (+/−) or spoilage with a reason. |
| UC50 | Create Restock Request | Restock Request | Barista or Admin creates an ingredient restock request as draft or sends it for approval. |
| UC51 | Review Restock Request | Restock Request | Admin submits, approves, rejects or cancels a restock request. |
| UC52 | Manage Suppliers | Supplier Management | Admin creates, updates and activates/deactivates suppliers. |
| UC53 | Manage Purchase Orders | Purchase Order | Admin creates/edits draft purchase orders, places orders, receives full/partial stock, handles discrepancies (excess/damaged) or cancels/adjusts orders. |

## Nhân sự và ca làm

| UC | Use Case | Phân hệ | Mô tả trong SRS |
| --- | --- | --- | --- |
| UC54 | Manage Employees | Employee Management | Admin creates and edits staff accounts, filters by role and locks/unlocks accounts. |
| UC55 | Manage Weekly Work Shifts | Work Shift Management | Admin adds, edits, deletes or copies the shifts of a selected week. |
| UC56 | Assign Work Schedule | Employee Schedule | Admin assigns an employee to a date and shift (opening cash for cashiers), updates or deletes it. |
| UC57 | View Work Schedules | Employee Schedule | Admin views schedules by week (calendar / table) or by day (board). |
| UC58 | Record Attendance | Attendance | Admin records check-in/check-out time, status and note of a scheduled shift. |
| UC59 | View Daily Attendance | Attendance | Admin views attendance of a date with late minutes. |
| UC60 | Close Shift and Submit Handover | Shift Handover | Cashier enters actual closing cash and note; the system completes the shift and submits a handover. |

## Khách hàng, báo cáo và quản trị

| UC | Use Case | Phân hệ | Mô tả trong SRS |
| --- | --- | --- | --- |
| UC61 | Manage Customers | Customer Management | Admin lists customers with points, orders and spending, adds a customer and locks/unlocks. |
| UC62 | Earn Loyalty Points | Phone Loyalty | The system adds floor(goods amount after discount / points_earn_unit) points when payment succeeds. |
| UC63 | Manage Loyalty Rules and Points | Phone Loyalty | Admin sets earn/redeem rules, looks up a customer by phone and adds/subtracts points. |
| UC64 | Redeem Loyalty Points | Phone Loyalty | Customer (cart) or Cashier (POS) uses points in multiples of points_step for a discount. |
| UC65 | Submit Feedback or Complaint | Feedback & Complaints | Customer sends a rating or complaint about an own order and follows the response. |
| UC66 | View Business Reports | Reports Dashboard | Admin views revenue, orders, payments, top products, ingredient usage and low stock for a period. |
| UC67 | Manage Orders | Admin Order Management | Admin lists all orders, views details, payments and delivery, and updates order status. |
| UC68 | Configure Shop Settings | Shop Settings | Admin configures freeship threshold, delivery fee/time, point rules and other setting keys. |
| UC69 | Review Shift Handover | Shift Handover | Admin confirms or rejects (with reason) a submitted cash handover report. |
| UC70 | Handle Feedback and Complaints | Feedback & Complaints | Admin answers a ticket and sets it PROCESSING, RESOLVED or REJECTED. |
| UC71 | Configure Delivery Area Fees | Delivery Management | Admin adds districts and edits delivery fee and active flag per district. |
| UC72 | Assign Delivery Staff | Admin Order Management | Admin assigns, changes or removes the delivery staff of an ONLINE order before pick-up. |
| UC73 | Resubmit Rejected Handover | Shift Handover | The cashier writes an explanation for a rejected handover and sends it again. |
| UC75 | View and Reconcile Bank Transactions | Bank Transactions & Reconciliation | Admin monitors live bank transactions feed from SePay and verifies automated reconciliation status (MATCHED, OVERPAID, UNDERPAID, DUPLICATE, ORDER_NOT_FOUND, ORDER_CANCELLED). |

## Ghi chú

- Mã UC là mã yêu cầu trong SRS; số màn hình trong bảng phân công là một hệ số khác.
- Để xem phần đã triển khai và người phụ trách, cần đối chiếu thêm bảng phân công và code hiện tại; danh mục này không tự suy ra trạng thái `Done`.
