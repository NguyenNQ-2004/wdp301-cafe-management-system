# Counter order update

Branch: `feature/counter-order-update`.

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

The existing development database is standalone MongoDB, so this change uses a shared database mutation lock and compensating writes rather than requiring replica-set transactions. Editing, status/preparation changes and counter payment confirmation acquire the same per-order lock. Other requests receive 409 and may retry after the operation completes. Responses are sent after lock release.

If a write fails, restore the order, standalone OrderItem records and payment amount. If rollback fails, retain the lock and report that management must review the order. A process terminated mid-write also leaves its lock in place: there is deliberately no automatic expiry that could allow overlapping writes. During recovery, stop the original writer, inspect the exact affected order and its OrderItem/Payment records, reconcile snapshots and totals, then clear `mutationLock` only on that order. This is not crash-atomic storage; read requests may observe intermediate state during a write. No automatic recovery or broad unlock endpoint is added.

## Verification

- `cd backend; npm run test:counter-order-update`: isolated temporary database; covers permissions, validation, persisted totals/snapshots/payment, stale requests, lock contention, rollback and paid/prepared/closed rejection.
- `cd backend; npm run test:online-ordering`: regression for creation and counter payment.
- `cd frontend; npm test` and `npm run build`.

Push only this feature branch. New functions require separate branches without UC codes in branch names. Never push to `main` or `develop`.
