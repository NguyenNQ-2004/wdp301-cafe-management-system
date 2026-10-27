# Counter order cancellation

Branch: `feature/counter-order-cancellation`, based on `feature/counter-order-list`.
Uses the existing team's POS detail drawer and adds a matching confirmation dialog instead of a browser prompt.

At `/cashier/orders`, choose an unpaid open order and **Hủy đơn**. Enter a reason (1–500 trimmed characters), then confirm. The form waits for the API, disables duplicate submissions, preserves the dialog and displays errors when rejected, and reports success only after confirmation. Paid orders instead explain that a refund must be handled first.

`PUT /api/orders/:id/counter-cancel` accepts `{ "cancelReason": "..." }`. Requires ADMIN or STAFF in CASHIER/MANAGER position. Valid counter order states are PENDING, CONFIRMED, PREPARING and READY. It sets the order to CANCELLED with a reason and its matching PENDING payment to FAILED with a cancellation note. Repeating the same reason is idempotent; modifying an existing cancellation reason is rejected.

The existing `PUT /api/orders/:id/status` route uses the same service for counter cancellation, retaining its existing caller authorization while preventing bypass of paid-order checks and synchronizing pending payments. Online cancellation remains on its existing flow. Orders using reward/voucher redemption require separate refund support and are rejected rather than losing points.

The shared order mutation lock prevents payment/edit/preparation changes from overlapping cancellation. Failed order writes restore the payment; failed restoration retains the lock for targeted management recovery as documented in `COUNTER_ORDER_UPDATE.md`.

Verification: `npm run test:counter-cancellation` uses a temporary isolated database and covers authorization, invalid reasons, persisted cancellation/payment state, retry, paid/closed/online/reward rejection, legacy endpoint consistency, payment-after-cancellation and rollback. Run frontend `npm test` and `npm run build` for dialog/rendering regression checks.
