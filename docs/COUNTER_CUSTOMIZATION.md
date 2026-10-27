# Counter order customization

Branch: `feature/counter-order-customization`, based on `feature/counter-order-creation`.

Extends the existing team's POS detail editor with the same sugar/ice levels and catalog topping choices used by the create-order screen. It supports independent lines of the same product and size, preserving options and notes when editing quantities, changing sizes or reordering lines. Selecting another product resets that line's old options. Retired toppings remain visible and must be explicitly deselected.

`PUT /api/orders/:id/counter` now uses the same catalog-backed POS normalizer as creation. Submit full `customization` on every line (size, sugar, ice, topping names, note), plus the exact `expectedUpdatedAt` and optional `expectedTotal`. The UI supplies both version and quote. The server rejects invalid/unavailable options and price changes before writing, and synchronizes Order, OrderItem and pending Payment. Older requests that omit customization on customized orders are rejected instead of erasing saved options. Existing authorization, payment/preparation checks and rollback remain in place.

No new topping restriction is needed for cancellation: the existing cancellation service already closes unpaid topped orders and keeps item snapshots. Integration tests explicitly verify create → edit duplicate customized lines → reject retired topping → remove topping → cancel with preserved snapshots.

Reward redemption/refund remains outside this change. Verification: backend `npm run test:counter-customization`, counter regression suites, frontend `npm test` and `npm run build`. Frontend render checks cover persisted sugar/ice/topping/note values and the topping-inclusive quote.
