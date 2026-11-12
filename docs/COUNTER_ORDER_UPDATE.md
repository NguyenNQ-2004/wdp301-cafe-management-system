# Counter order update

Original feature branch: `feature/counter-order-update`. The 11 November workflow audit is on `fix/manh-report-workflow-audit`; see [audit evidence](WORKFLOW_AUDIT_2026-11-11.md).

UI reference: https://github.com/NguyenNQ-2004/cafe_system, cloned reference commit `701af25a8d382be368232e31719578b86a669c2a`; preview https://cafe-system-nine.vercel.app/.
The team's existing `src/pages/pos/PosOrdersPage.tsx` is already integrated under `frontend/src/interface/pages/pos`. This change extends that screen rather than replacing the application or importing the reference's mock database.

## User flow

Open `/cashier/orders`, select an eligible order, choose **Sửa đơn**, change products/sizes/quantities, table and note, then **Lưu thay đổi**. The order, item snapshots and pending payment are updated using server catalog prices. Existing item options are retained when matching product/size (also when a product has a single original line and its size changes).

The action is available to ADMIN and STAFF with CASHIER or MANAGER position. Only DINE_IN/TAKEAWAY orders in PENDING/CONFIRMED/PREPARING with no item marked prepared and one matching PENDING payment can be edited. This permits existing DINE_IN creation, which starts in PREPARING before any item is marked prepared. READY, completed, cancelled and paid orders are rejected. Orders using reward/voucher redemption or toppings require separate business support and are rejected.

## Endpoint

`PUT /api/orders/:id/counter` with bearer authentication:

```json
{
  "expectedUpdatedAt": "2026-10-27T03:00:00.000Z",
  "tableNumber": "T02",
  "orderNote": "Ít đá",
  "items": [{ "productId": "<MongoDB product id>", "size": "M", "quantity": 2 }]
}
```

Use the exact `updatedAt` from GET `/api/orders` as `expectedUpdatedAt`. The client adapter preserves this as `update_token`, independently of formatted dates. Successful response is `{ message, order }`. Reload order data after success. Empty/duplicate lines, invalid quantities/sizes and client-supplied totals are rejected. A stale version returns 409; reload the list and reopen the editor.

## Consistency and recovery

Business writes require a MongoDB replica set or Atlas. The per-order claim, order/items/payment updates and claim release execute inside the same transaction through `atomicRouter`. Responses are sent only after commit. Concurrent requests are serialized or rejected with 409 when their version is stale; a handled error aborts the entire transaction. No partial snapshots are committed.

If a write fails or the process terminates, MongoDB aborts the transaction, including the mutation claim. Standalone MongoDB is rejected with 503 before business writes. Pre-existing locks from the older non-transactional implementation are still respected; reconcile those exact records before any manual recovery. Orders whose inventory has already been deducted are not editable, so item changes cannot invalidate captured stock consumption or costs. New counter orders start PENDING, require payment before preparation, and remain editable while unpaid and unprepared.

## Verification

- `cd backend; npm run test:replica -- tests/counterOrderUpdate.test.js`: isolated replica set; covers permissions, validation, persisted totals/snapshots/payment, stale requests, lock contention, transactional rollback, concurrent edits/payment and paid/prepared/closed/inventory-captured rejection.
- `cd backend; npm run test:online-ordering`: regression for creation and counter payment.
- `cd frontend; npm test` and `npm run build`.

Push only this feature branch. New functions require separate branches without UC codes in branch names. Never push to `main` or `develop`.
