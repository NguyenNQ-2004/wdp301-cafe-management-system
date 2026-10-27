# Counter order list

Branch: `feature/counter-order-list`, built on `feature/counter-order-update`.
UI: team's cloned `cafe_system` reference (`701af25`), using existing POS list and KDS layouts.

- `/cashier/orders` permits Barista, Cashier, Manager and Admin. Baristas see the list, item options, status, filters and a link to `/barista`; cashier creation/payment/cancellation/handover actions are hidden.
- `GET /api/orders/counter` requires an authenticated ADMIN or STAFF in BARISTA/CASHIER/MANAGER position. Returns only DINE_IN/TAKEAWAY orders, newest first, populated customers/cashier/product details. Optional `status` must be a counter status. Delivery orders are excluded.
- POS list and KDS poll every 5 seconds, and refresh on browser focus/visibility changes. KDS retains online orders through the existing `/api/orders` endpoint. Cashier list also refreshes payment statuses; Barista never requests payment data.
- Background updates preserve filters, selected orders and the existing screen. No full-screen loading/remount occurs. Polling pauses while hidden, during mutations/loading and while a dialog is open; only one sync request runs at a time. Logout/route changes abort the request. A visible error marks stale data and polling retries automatically.
- Tests: `npm run test:counter-order-list` in backend; `npm test` and `npm run build` in frontend. API tests use an isolated temporary database; frontend tests include role-based rendering and polling cleanup/retry behavior.

Changes in this branch do not implement Barista drink-preparation business rules assigned to another member.
