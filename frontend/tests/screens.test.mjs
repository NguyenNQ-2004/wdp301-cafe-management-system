// Render checks only: these do not claim to test browser clicks or API writes.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
globalThis.window = { localStorage: globalThis.localStorage };
let vite, SourceScreen, InterfaceContext;
before(async () => {
  vite = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' });
  SourceScreen = (await vite.ssrLoadModule('/src/interface/SourceScreen.tsx')).default;
  ({ InterfaceContext } = await vite.ssrLoadModule('/src/interface/LiveProvider.tsx'));
});
after(async () => { await vite?.close(); });

const tables = ['users', 'work_schedules', 'categories', 'products', 'orders', 'order_items', 'payments', 'loyalty_transactions', 'customer_reviews', 'suppliers', 'ingredients', 'product_ingredients', 'purchase_orders', 'purchase_order_items', 'inventory_transactions', 'shop_settings'];
const empty = () => Object.fromEntries(tables.map(table => [table, []]));
const populated = empty();
populated.users = [{ id: 1, full_name: 'Fixture Customer', phone: '0999999999', role: 'CUSTOMER', status: 'ACTIVE', tier_name: 'BRONZE', total_points: 0, created_at: '2026-10-20 10:00:00' }];
populated.categories = [{ id: 2, name: 'Coffee', status: 'ACTIVE' }];
populated.products = [{ id: 3, category_id: 2, name: 'Fixture Coffee', base_price: 30000, is_available: true, image_url: '/cafe-placeholder.svg', variants_config: { sizes: { M: 0, L: 10000 }, toppings: [] } }];
populated.orders = [{ id: 4, customer_id: 1, cashier_id: 1, shipper_id: 1, order_code: 'TEST-ORDER', order_type: 'ONLINE', status: 'DELIVERING', created_at: '2026-10-20 10:00:00', total_amount: 30000, final_amount: 48000, delivery_fee: 18000, discount_amount: 0, recipient_name: 'Fixture Customer', recipient_phone: '0999999999', delivery_address: 'Test address' }];
populated.order_items = [{ id: 5, order_id: 4, product_id: 3, product_name_at_time: 'Fixture Coffee', unit_price: 30000, quantity: 1, subtotal: 30000, customization: { size: 'M' }, is_prepared: true }];
populated.payments = [{ id: 6, order_id: 4, payment_method: 'CASH', status: 'PENDING', amount: 48000 }];
populated.shop_settings = [{ setting_key: 'store_name', setting_value: 'Test Cafe' }];

for (const [state, db] of [['empty', empty()], ['populated', populated]]) {
  for (const screen of ['home', 'menu', 'customize', 'profile', 'orders', 'bill', 'pos-create', 'pos-orders', 'kds-terminal', 'delivery-orders', 'delivery-report', 'delivery-cod', 'admin-products']) {
    test(`Render ${screen} with ${state} data`, () => {
      const value = { db, session: { customerId: 1, cashierId: 1, baristaId: 1, shipperId: 1, adminId: 1 }, loading: false, busy: false, revision: 0, error: '', notice: '', unavailable: [], refresh: async () => {}, notify() {}, rawId: id => String(id), idFor: (_table, id) => Number(id) };
      const html = renderToString(React.createElement(MemoryRouter, { initialEntries: ['/product?productId=3'] }, React.createElement(InterfaceContext.Provider, { value }, React.createElement(SourceScreen, { screen }))));
      assert.ok(html.length > 50);
      assert.doesNotMatch(html, /\b(?:NaN|undefined)\b/);
    });
  }
}
