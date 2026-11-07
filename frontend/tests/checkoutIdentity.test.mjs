import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
let vite, identity;
before(async () => {
  vite = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' });
  identity = (await vite.ssrLoadModule('/src/lib/checkoutIdentity.ts')).checkoutIdentity;
});
after(async () => { await vite?.close(); });
test('checkout retains its key for a retry, changes it for edited input and isolates accounts/tabs', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const storage = new Map();
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) } });
  try {
    const first = identity('customer-A', { quantity: 1 });
    assert.deepEqual(identity('customer-A', { quantity: 1 }), first);
    const changed = identity('customer-A', { quantity: 2 });
    assert.equal(changed.checkoutSessionId, first.checkoutSessionId);
    assert.notEqual(changed.idempotencyKey, first.idempotencyKey);
    assert.notEqual(identity('customer-B', { quantity: 1 }).checkoutSessionId, first.checkoutSessionId);
    storage.clear(); // A separate tab has its own sessionStorage.
    assert.notEqual(identity('customer-A', { quantity: 1 }).checkoutSessionId, first.checkoutSessionId);
  } finally { if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor); else delete globalThis.sessionStorage; }
});
