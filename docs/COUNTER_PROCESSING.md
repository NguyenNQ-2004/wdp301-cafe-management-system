# Counter order processing

Branch: `feature/counter-order-processing`, based on `feature/counter-order-cancellation`.

The existing POS order list now supports **Xác nhận đơn** for PENDING counter orders. The action waits for server success before reporting completion. TAKEAWAY orders then enter the existing Barista CONFIRMED queue. Existing DINE_IN creation starts in PREPARING.

**Thu tiền** opens the existing `/cashier/payments?orderId=...&method=...` screen with the correct order highlighted. It no longer attempts a payment mutation blocked by the UI adapter. That payment screen links back to the counter order list. Actual payment confirmation uses the existing authorized endpoint.

**Trả đồ cho khách** requires a READY order with a confirmed matching payment. The backend also verifies one SUCCESS payment with an amount matching finalAmount, protecting direct API callers. Success is reported after the server responds. Existing loyalty earning on completion remains idempotent under the per-order lock.

`npm run test:counter-processing` in backend runs an isolated full API flow: real email login, cashier order creation with server price, Barista list/confirmation/preparation, unpaid handoff rejection, authorized payment, completion and duplicate completion without duplicate points. Frontend verification: `npm test` and `npm run build`.

Counter point redemption/topping support and payment gateways depend on the shared catalog/loyalty/payment modules; this branch integrates the existing payment screen without changing those modules' business contracts.
