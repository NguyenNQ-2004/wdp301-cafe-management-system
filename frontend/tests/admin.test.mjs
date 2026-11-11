import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const memory = new Map([['user', JSON.stringify({ _id: 'admin-fixture', fullName: 'Admin Fixture', role: 'ADMIN', phone: '0999999999', token: 'fixture-token' })]]);
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
globalThis.window = { localStorage: globalThis.localStorage };
let vite, context, utils, interfaceUtils, components;
before(async () => {
  vite = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' });
  const auth = (await vite.ssrLoadModule('/src/store/authStore.ts')).default;
  auth.getState().login({ _id: 'admin-fixture', fullName: 'Admin Fixture', role: 'ADMIN', phone: '0999999999', token: 'fixture-token' });
  ({ DbContext: context } = await vite.ssrLoadModule('/src/data/DbContext.tsx'));
  utils = await vite.ssrLoadModule('/src/data/dbUtils.ts');
  interfaceUtils = await vite.ssrLoadModule('/src/interface/data/dbUtils.ts');
  components = {};
  for (const name of ['Dashboard', 'Reports', 'Orders', 'Categories', 'Recipes', 'Ingredients', 'Stock', 'Restock', 'RestockRequests', 'Suppliers', 'Purchases', 'Users', 'Shifts', 'Schedules', 'Attendance', 'Handovers', 'Customers', 'Memberships', 'Complaints', 'Settings', 'DeliveryAreas']) {
    components[name] = (await vite.ssrLoadModule(`/src/pages/admin/Admin${name}Page.tsx`)).default;
  }
});
after(async () => { await vite?.close(); });
const empty = () => Object.fromEntries(['categories', 'products', 'orders', 'users', 'payments', 'ingredients', 'product_ingredients', 'suppliers', 'purchase_orders', 'purchase_order_items', 'inventory_transactions'].map(table => [table, []]));

test('purchase input converts kg and litres and sends total money without manual unit price', async () => {
  const { purchaseItemsPayload } = await vite.ssrLoadModule('/src/lib/purchaseCost.ts');
  const ingredients = [{ _id: 'tea', name: 'Tea', unit: 'gram' }, { _id: 'milk', name: 'Milk', unit: 'ml' }];
  assert.deepEqual(purchaseItemsPayload([{ ingredient: 'tea', quantity: 2, inputUnit: 'kg', totalCost: 200000 }, { ingredient: 'milk', quantity: 1.5, inputUnit: 'lít', totalCost: 45000 }], ingredients), [{ ingredient: 'tea', quantity: 2000, totalCost: 200000 }, { ingredient: 'milk', quantity: 1500, totalCost: 45000 }]);
  assert.throws(() => purchaseItemsPayload([{ ingredient: 'tea', quantity: 1, inputUnit: 'kg', totalCost: '' }], ingredients));
});

test('old stock without purchase history calculates after its total valuation is provided', () => {
  const db = empty();
  db.ingredients = [{ _id: 'coffee', currentStock: 10000 }];
  assert.deepEqual(utils.recipeLineCost(db, 'coffee', 1000), { cost: null, estimated: false });
  db.ingredients[0].stockLots = [{ _id: 'opening', receivedAt: '1970-01-01', remainingQuantity: 10000, unitCost: 2000000 / 10000 }];
  assert.deepEqual(utils.recipeLineCost(db, 'coffee', 1000), { cost: 200000, estimated: false });
  assert.deepEqual(utils.recipeLineCost(db, 'coffee', 20), { cost: 4000, estimated: false });
});

test('recipe costs consume FIFO lots rather than replacing old prices with newest quotes', () => {
  const db = empty();
  db.ingredients = [{ id: 'tea', current_stock: 400, stockLots: [
    { _id: 'new', receivedAt: '2026-10-02', remainingQuantity: 300, unitCost: 200 },
    { _id: 'old', receivedAt: '2026-10-01', remainingQuantity: 100, unitCost: 100 }
  ] }];
  db.product_ingredients = [{ product_id: 'cup', ingredient_id: 'tea', quantity_required: 150 }];
  assert.deepEqual(utils.productCostDetails(db, 'cup'), { cost: 20000, estimated: false });
  assert.equal(db.ingredients[0].stockLots[0]._id, 'new');
  db.ingredients[0].stockLots[1].unitCost = null;
  assert.equal(utils.productCost(db, 'cup'), null);
});

for (const name of ['Dashboard', 'Reports', 'Orders', 'Categories', 'Recipes', 'Ingredients', 'Stock', 'Restock', 'RestockRequests', 'Suppliers', 'Purchases', 'Users', 'Shifts', 'Schedules', 'Attendance', 'Handovers', 'Customers', 'Memberships', 'Complaints', 'Settings', 'DeliveryAreas']) {
  test(`admin ${name} renders with an empty database`, () => {
    const html = renderToString(React.createElement(MemoryRouter, null,
      React.createElement(context.Provider, { value: { db: empty(), loading: false, refresh: async () => {} } }, React.createElement(components[name], { onNavigate() {} }))));
    assert.match(html, /AURA CAFÉ/);
    assert.doesNotMatch(html, /\b(?:NaN|undefined)\b/);
    if (['Customers', 'Memberships'].includes(name)) {
      assert.doesNotMatch(html, /Hạng thẻ|Hạng thành viên|thăng hạng|Kim Cương|Loyalty &amp; Tiers/i);
      assert.match(html, /điểm/i);
    }
  });
}

test('cost uses the latest entered price while received prices remain separate', () => {
  const db = empty();
  db.ingredients = [{ id: 'beans' }];
  db.product_ingredients = [{ product_id: 'coffee', ingredient_id: 'beans', quantity_required: 10 }];
  db.purchase_orders = [
    { _id: 'old', status: 'RECEIVED', createdAt: '2026-10-01', items: [{ ingredient: 'beans', unitPrice: 100 }] },
    { _id: 'new', status: 'RECEIVED', createdAt: '2026-10-10', items: [{ ingredient: 'beans', unitPrice: 200 }] },
    { _id: 'draft', status: 'DRAFT', createdAt: '2026-10-20', items: [{ ingredient: 'beans', unitPrice: 999 }] }
  ];
  assert.equal(utils.lastPurchasePrice(db, 'beans'), 200);
  assert.equal(utils.productCost(db, 'coffee'), 9990);
  assert.deepEqual(utils.productCostDetails(db, 'coffee'), { cost: 9990, estimated: true });
  db.purchase_orders[2].items[0].unitPrice = 0;
  assert.equal(utils.productCost(db, 'coffee'), 0);
});

test('missing purchase prices produce unknown cost instead of a fabricated margin', () => {
  const db = empty();
  db.product_ingredients = [{ product_id: 'coffee', ingredient_id: 'beans', quantity_required: 10 }];
  assert.equal(utils.productCost(db, 'coffee'), null);
});

test('ordered prices calculate recipe cost and render its amount before receiving inventory', () => {
  const db = empty();
  db.ingredients = [{ id: 'tea', _id: 'tea', name: 'Black tea', unit: 'gram', current_stock: 8000, min_stock_level: 1500 }];
  db.products = [{ id: 'coffee', name: 'Coffee', base_price: 45000, image_url: '/cafe-placeholder.svg', is_available: true }];
  db.product_ingredients = [{ id: 'bom', product_id: 'coffee', ingredient_id: 'tea', quantity_required: 2000 }];
  db.purchase_orders = [{ _id: 'ordered', status: 'ORDERED', createdAt: '2026-10-22', items: [{ ingredient: { _id: 'tea' }, unitPrice: 1000 }] }];
  assert.equal(utils.lastOrderedPrice(db, 'tea'), 1000);
  assert.equal(utils.lastPurchasePrice(db, 'tea'), null);
  assert.equal(utils.productCost(db, 'coffee'), 2000000);
  assert.deepEqual(utils.productCostDetails(db, 'coffee'), { cost: 2000000, estimated: true });
  for (const name of ['Ingredients', 'Recipes']) {
    const html = renderToString(React.createElement(MemoryRouter, null,
      React.createElement(context.Provider, { value: { db, loading: false, refresh: async () => {} } }, React.createElement(components[name], { onNavigate() {} }))));
    assert.match(html, /1\.000đ/);
    assert.match(html, name === 'Recipes' ? /Giá vốn dự kiến/ : /chưa nhập kho/);
    if (name === 'Recipes') {
      assert.match(html, /2\.000\.000đ/);
      assert.match(html, /Giá vốn dự kiến theo định mức/);
      assert.match(html, /-4344%/);
    }
  }
  db.purchase_orders[0].status = 'CANCELLED';
  assert.equal(utils.lastOrderedPrice(db, 'tea'), null);
  assert.equal(utils.productCost(db, 'coffee'), null);
  db.purchase_orders[0].status = 'RECEIVED';
  assert.equal(utils.lastOrderedPrice(db, 'tea'), null);
  assert.equal(utils.productCost(db, 'coffee'), 2000000);
  // Legacy stock has no priced lot provenance; a receipt quote remains an estimate.
  assert.deepEqual(utils.productCostDetails(db, 'coffee'), { cost: 2000000, estimated: true });
});

test('product management calculates the same cost from normalized purchase rows', () => {
  const db = empty();
  db.products = [{ id: 1, base_price: 45000 }];
  db.product_ingredients = [{ product_id: 1, ingredient_id: 2, quantity_required: 2000 }];
  db.purchase_orders = [{ id: 3, status: 'ORDERED', created_at: '2026-10-22 10:00:00' }];
  db.purchase_order_items = [{ id: 4, po_id: 3, ingredient_id: 2, quantity: 100, unit_price: 1000 }];
  assert.equal(interfaceUtils.productCost(db, 1), 2000000);
  assert.deepEqual(interfaceUtils.productCostDetails(db, 1), { cost: 2000000, estimated: true });
  db.purchase_orders[0].status = 'CANCELLED';
  assert.equal(interfaceUtils.productCost(db, 1), null);
});

test('attendance and handovers render cleanly in admin layout without crashing', () => {
  for (const name of ['Attendance', 'Handovers']) {
    const html = renderToString(React.createElement(MemoryRouter, null,
      React.createElement(context.Provider, { value: { db: empty(), loading: false, refresh: async () => {} } }, React.createElement(components[name], { onNavigate() {} }))));
    assert.match(html, name === 'Attendance' ? /Chấm công nhân sự/ : /Biên bản bàn giao ca/);
    assert.doesNotMatch(html, /\b(?:NaN|undefined)\b/);
  }
});
