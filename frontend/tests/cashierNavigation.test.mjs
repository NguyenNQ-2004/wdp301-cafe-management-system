import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

let vite, StaffWorkNav;
const account = { _id: 'cashier-nav', fullName: 'Thu ngân mẫu', phone: '0900000003', role: 'STAFF', position: 'CASHIER', token: 'fixture' };
const memory = new Map([['user', JSON.stringify(account)]]);
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
globalThis.window = { localStorage: globalThis.localStorage };
before(async () => {
  vite = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' });
  const auth = (await vite.ssrLoadModule('/src/store/authStore.ts')).default;
  auth.getState().login(account);
  StaffWorkNav = (await vite.ssrLoadModule('/src/components/StaffWorkNav.tsx')).default;
});
after(async () => { await vite?.close(); });

test('staff navigation keeps the schedule link and removes personal attendance', () => {
  const html = renderToString(React.createElement(MemoryRouter, { initialEntries: ['/my-schedule'] },
    React.createElement(StaffWorkNav, { showCounterPayments: true })));
  for (const path of ['/cashier/payments', '/cashier', '/my-schedule']) assert.ok(html.includes(`href="${path}"`), html);
  assert.ok(!html.includes('href="/my-attendance"'), html);
  assert.ok(html.includes('Lịch làm của tôi'));
  assert.ok(!html.includes('Chấm công của tôi'));
});
