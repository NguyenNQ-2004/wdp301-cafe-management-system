# Counter order creation

Branch: `feature/counter-order-creation`, based on `feature/counter-order-processing`.
Extends the team's existing `PosCreateOrderPage` from the cloned `cafe_system` source.

- Create DINE_IN/TAKEAWAY orders through `/cashier`. Only ADMIN or STAFF in CASHIER/MANAGER position may create counter orders. DINE_IN requires a table. Referenced customers must be active CUSTOMER records.
- POS preserves independent product/size lines, including sugar, ice, per-item notes and toppings. The server calculates size and topping prices from Product configuration and validates quantities, options and availability. Supplied unit prices are ignored. `expectedTotal` detects a catalog price change and returns 409 before any write.
- The cart API and online checkout retain their existing normalization contract. The POS uses a dedicated payload/normalizer and stores all item options in both embedded Order items and standalone OrderItem records.
- Creating a customer uses the existing `/api/users/customers` response's nested `customer` object, maps its persisted MongoDB ID, and updates the current provider without a full-screen reload. The draft cart and table remain in place; success is shown after the server responds. The resulting customer is linked to the order.
- Quantities are capped at 99 per line, 50 lines per order; order notes are capped at 500 and item notes at 300 characters. After creation the existing payment screen opens with the order selected.
- Point redemption at the counter remains disabled pending the shared loyalty contract. Existing customer point earning on completed orders still works. The later `feature/counter-order-customization` extension supports editing topped orders; unpaid topped orders can also be cancelled with their snapshots preserved. Reward-specific edit/refund handling still requires shared loyalty support.

Tests: backend `npm run test:counter-creation` plus `npm run test:counter-processing`; frontend `npm test` and `npm run build`. Isolated API tests verify customer persistence, duplicate customized lines, server price/topping snapshots, payment totals, authorization and invalid/stale request rejection.
