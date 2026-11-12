import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

let vite, Header, Context;
const account = { _id: 'cashier-nav', fullName: 'Thu ngân mẫu', phone: '0900000003', role: 'STAFF', position: 'CASHIER', token: 'fixture' };
const memory = new Map([['user', JSON.stringify(account)]]);
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
globalThis.window = { localStorage: globalThis.localStorage };
before(async () => {
  vite = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' });
  const auth = (await vite.ssrLoadModule('/src/store/authStore.ts')).default;
  auth.getState().login(account);
  Header = (await vite.ssrLoadModule('/src/components/CashierWorkHeader.tsx')).default;
  Context = (await vite.ssrLoadModule('/src/interface/LiveProvider.tsx')).InterfaceContext;
});
after(async () => { await vite?.close(); });

for (const [url, currentRoute, activeLabel] of [
  ['/cashier/handover?mode=close', 'pos-shift', 'Chốt ca'],
  ['/cashier/handover?mode=handover', 'pos-handover', 'Bàn giao ca'],
  ['/cashier/restock-requests', 'pos-restock', 'Đề xuất nhập hàng']
]) {
  test(`cashier keeps both navigation bars at ${url}`, () => {
    const html = renderToString(React.createElement(MemoryRouter, { initialEntries: [url] },
      React.createElement(Context.Provider, { value: { db: { users: [], work_schedules: [] }, session: {} } },
        React.createElement(Header, { currentRoute }))));
    for (const path of ['/cashier/payments', '/cashier', '/my-schedule', '/my-attendance']) assert.ok(html.includes(`href="${path}"`), html);
    for (const label of ['Đăng xuất', 'Tạo đơn tại quầy', 'Danh sách đơn', 'Chốt ca', 'Bàn giao ca', 'Đề xuất nhập hàng']) assert.ok(html.includes(label));
    assert.match(html, new RegExp('class="[^"]*bg-primary text-white shadow-xs[^\\n]*?<span>' + activeLabel + '</span>'));
    assert.ok(html.indexOf('<span>Bàn giao ca</span>') < html.indexOf('<span>Đề xuất nhập hàng</span>'));
  });
}
