import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
let vite, execute, Kitchen, Context;
before(async () => {
  vite = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' });
  execute = (await vite.ssrLoadModule('/src/lib/kitchenWorkflow.ts')).executeKitchenCommand;
  Kitchen = (await vite.ssrLoadModule('/src/interface/pages/kds/KdsTerminal.tsx')).KdsTerminal;
  Context = (await vite.ssrLoadModule('/src/interface/LiveProvider.tsx')).InterfaceContext;
});
after(async () => { await vite?.close(); });
const order = (id, status) => ({ id, status, kitchen_eligible: true, order_code: `KDS-${id}`, order_type: 'ONLINE', created_at: '2026-11-07 20:00:00', recipient_name: 'Test Customer' });
const item = (id, orderId, prepared = false) => ({ id, order_id: orderId, product_id: 10, product_name_at_time: `Coffee ${id}`, quantity: 1, is_prepared: prepared, customization: { size: 'M' } });
function fixture() {
  const sent = [];
  const deps = { orders: [order(1, 'CONFIRMED')], items: [item(11, 1)], rawId: id => `raw-${id}`, location: id => id === 11 ? { order: 'raw-1', index: 0 } : undefined, send: async (path, body) => { sent.push({ path, body }); } };
  return { deps, sent };
}
function render(view, orders, items, busy = false) {
  const value = { db: { orders, order_items: items, users: [] }, session: {}, busy, refresh: async () => {}, updatePreparation: async () => true };
  return renderToString(React.createElement(MemoryRouter, { initialEntries: [`/barista${view}`] }, React.createElement(Context.Provider, { value }, React.createElement(Kitchen)))).replace(/<!--[\s\S]*?-->/g, '');
}
test('Start awaits the PREPARING response and propagates failure, not a false success', async () => {
  const { deps, sent } = fixture();
  const result = await execute({ action: 'START', orderId: 1 }, deps);
  assert.deepEqual(sent, [{ path: '/api/orders/raw-1/status', body: { status: 'PREPARING' } }]);
  assert.match(result, /Đã bắt đầu pha/);
  deps.send = async () => { throw new Error('Insufficient stock'); };
  await assert.rejects(execute({ action: 'START', orderId: 1 }, deps), /Insufficient stock/);
});
test('marking a prepared item does not silently complete its order', async () => {
  const { deps, sent } = fixture(); deps.orders[0].status = 'PREPARING';
  await execute({ action: 'ITEMS', itemIds: [11, 11], prepared: true }, deps);
  assert.deepEqual(sent, [{ path: '/api/orders/raw-1/items/0/prepared', body: { isPrepared: true, autoReady: false } }]);
});
test('finish requires PREPARING and all prepared items; it sends READY, never COMPLETED', async () => {
  const { deps, sent } = fixture(); deps.orders[0].status = 'PREPARING';
  await assert.rejects(execute({ action: 'FINISH', orderId: 1 }, deps), /tất cả món/);
  assert.equal(sent.length, 0);
  deps.items[0].is_prepared = true;
  await execute({ action: 'FINISH', orderId: 1 }, deps);
  assert.deepEqual(sent, [{ path: '/api/orders/raw-1/status', body: { status: 'READY' } }]);
});
test('all selected rows are validated before sending a grouped item action', async () => {
  const { deps, sent } = fixture(); deps.orders[0].status = 'PREPARING';
  await assert.rejects(execute({ action: 'ITEMS', itemIds: [11, 999], prepared: true }, deps), /Không tìm thấy món/);
  assert.equal(sent.length, 0);
});
test('waiting, preparing and ready are separate lists with explicit per-item controls', () => {
  const orders = [order(1, 'CONFIRMED'), order(2, 'PREPARING'), order(3, 'READY')];
  const items = [item(11, 1), item(12, 2), item(13, 3, true)];
  const waiting = render('', orders, items);
  assert.match(waiting, /Chờ pha \(1\)/); assert.match(waiting, /Bắt đầu pha/);
  const cards = html => html.slice(html.indexOf('class="swp-kds-orders"'));
  assert.match(cards(waiting), /KDS-1/); assert.doesNotMatch(cards(waiting), /KDS-2|KDS-3/);
  const preparing = render('?action=preparing', orders, items);
  assert.match(cards(preparing), /KDS-2/); assert.doesNotMatch(cards(preparing), /KDS-1|KDS-3/);
  assert.match(preparing, /Đã pha xong<\/button>/);
  assert.match(preparing, /disabled="">Hoàn thành đơn/);
  const ready = render('?action=completed', orders, items);
  assert.match(cards(ready), /KDS-3/); assert.doesNotMatch(cards(ready), /KDS-1|KDS-2/);
});
test('finish is enabled only when all rows are saved as prepared and no request is pending', () => {
  const html = render('?action=preparing', [order(1, 'PREPARING')], [item(11, 1, true)]);
  assert.match(html, /class="finish">Hoàn thành đơn/);
  const busy = render('?action=preparing', [order(1, 'PREPARING')], [item(11, 1, true)], true);
  assert.match(busy, /class="finish" disabled="">Hoàn thành đơn/);
});
