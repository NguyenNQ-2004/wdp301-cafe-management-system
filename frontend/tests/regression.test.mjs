import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const memory = new Map([['user', '{invalid json']]);
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
globalThis.window = { localStorage: globalThis.localStorage };
let vite, auth, cart, api, options, credentials, BillPage, InterfaceContext, App, SourceScreen, Header, CounterOrderEditor;
const account = { _id: 'test-customer', fullName: 'Test Customer', phone: '0999999999', role: 'CUSTOMER', token: 'test-token' };
const tables = ['users', 'work_schedules', 'categories', 'products', 'orders', 'order_items', 'payments', 'loyalty_transactions', 'customer_reviews', 'suppliers', 'ingredients', 'product_ingredients', 'purchase_orders', 'purchase_order_items', 'inventory_transactions', 'shop_settings'];
const emptyDb = () => Object.fromEntries(tables.map(table => [table, []]));
const product = { _id: 'coffee', name: 'Coffee', basePrice: 30000, isAvailable: true, variantsConfig: { sizes: { M: 0, L: 10000 } } };
before(async () => {
  vite = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' });
  auth = (await vite.ssrLoadModule('/src/store/authStore.ts')).default;
  cart = (await vite.ssrLoadModule('/src/store/cartStore.ts')).default;
  api = await vite.ssrLoadModule('/src/lib/shopApi.ts');
  options = await vite.ssrLoadModule('/src/lib/cartOptions.ts');
  credentials = await vite.ssrLoadModule('/src/lib/authCredentials.ts');
  ({ BillPage } = await vite.ssrLoadModule('/src/interface/pages/BillPage.tsx'));
  ({ InterfaceContext } = await vite.ssrLoadModule('/src/interface/LiveProvider.tsx'));
  App = (await vite.ssrLoadModule('/src/ConnectedApp.tsx')).default;
  SourceScreen = (await vite.ssrLoadModule('/src/interface/SourceScreen.tsx')).default;
  ({ Header } = await vite.ssrLoadModule('/src/components/Header.tsx'));
  CounterOrderEditor = (await vite.ssrLoadModule('/src/interface/pages/pos/CounterOrderEditor.tsx')).default;
});
after(async () => { await vite?.close(); });
beforeEach(() => { cart.getState().clear(); });

test('Corrupt stored authentication does not crash startup', () => assert.equal(auth.getState().user, null));
test('Login and logout tolerate browser storage being blocked', () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = { ...original, setItem: () => { throw new Error('Blocked'); }, removeItem: () => { throw new Error('Blocked'); } };
  try { auth.getState().login(account); assert.equal(auth.getState().user._id, account._id); auth.getState().logout(); assert.equal(auth.getState().user, null); }
  finally { globalThis.localStorage = original; }
});
test('Switching accounts clears the previous owner cart', () => {
  cart.getState().replace([api.productToCartItem(product)], 'previous-customer');
  auth.getState().login(account);
  assert.equal(cart.getState().items.length, 0);
  auth.getState().logout();
});
test('Cart computes size price and merges the same product and size', () => {
  cart.getState().addProduct(product, 'L'); cart.getState().addProduct(product, 'L'); cart.getState().addProduct(product, 'M');
  assert.equal(cart.getState().items.length, 2);
  assert.equal(cart.getState().items.find(item => item.size === 'L').quantity, 2);
  assert.equal(cart.getState().items.find(item => item.size === 'L').unitPrice, 40000);
});
test('Cart quantity is capped at 99 and zero removes an item', () => {
  cart.getState().addProduct(product);
  const id = cart.getState().items[0].cartId;
  cart.getState().updateQuantity(id, 200); assert.equal(cart.getState().items[0].quantity, 99);
  cart.getState().updateQuantity(id, -99); assert.equal(cart.getState().items.length, 0);
});
test('Removing selected cart lines preserves unselected lines', () => {
  cart.getState().addProduct(product, 'M'); cart.getState().addProduct(product, 'L');
  cart.getState().toggleItem('coffee:M'); cart.getState().removeSelected();
  assert.deepEqual(cart.getState().items.map(item => item.size), ['M']);
});
test('Customization comparison detects changes without depending on key order', () => {
  const line = { ...api.productToCartItem(product), customization: { sugar: '50%', ice: 'Less ice', note: 'Hello' } };
  assert.equal(options.hasDifferentOptions(line, { note: ' Hello ', ice: 'Less ice', sugar: '50%' }), false);
  assert.equal(options.hasDifferentOptions(line, { sugar: '0%', ice: 'Less ice', note: 'Hello' }), true);
  assert.equal(options.hasDifferentOptions(line), true);
});
test('POS consolidates repeated product and size for the actual API', () => {
  const result = options.groupOrderItems([{ productId: 'coffee', size: 'M', quantity: 1 }, { productId: 'coffee', size: 'M', quantity: 2 }, { productId: 'coffee', size: 'L', quantity: 1 }]);
  assert.equal(result.length, 2); assert.equal(result[0].quantity, 3);
});
test('POS rejects excess and invalid quantities before sending a request', () => {
  assert.throws(() => options.groupOrderItems([{ productId: 'coffee', size: 'M', quantity: 60 }, { productId: 'coffee', size: 'M', quantity: 40 }]));
  for (const quantity of [0, -1, 1.5, NaN]) assert.throws(() => options.groupOrderItems([{ productId: 'coffee', size: 'M', quantity }]));
});
test('Cart API payload contains the supported fields only', () => {
  const result = api.cartPayload([{ ...api.productToCartItem(product), customization: { sugar: '0%' } }]);
  assert.deepEqual(result, [{ productId: 'coffee', quantity: 1, size: 'M', checked: true }]);
});
test('Missing API routes produce an actionable error for an HTML 404 response', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html>Not found</html>', { status: 404 });
  try { await assert.rejects(api.shopApi('/api/cart'), error => error instanceof api.ShopApiError && error.status === 404 && /404/.test(error.message)); }
  finally { globalThis.fetch = original; }
});

const renderWithDb = (component, db, overrides = {}) => renderToString(React.createElement(InterfaceContext.Provider, { value: { db, session: { customerId: 1 }, loading: false, unavailable: [], rawId: id => String(id), idFor: (_table, id) => Number(id), notify() {}, ...overrides } }, component));
const bill = id => React.createElement(BillPage, { orderId: id, onSelectOrder() {}, onNavigate() {} });
const sampleOrder = { id: 1, order_code: 'ONLY-ORDER-001', order_type: 'TAKEAWAY', status: 'PENDING', created_at: '2026-10-20 10:00:00', total_amount: 30000, final_amount: 30000, customer_id: null, discount_amount: 0, delivery_fee: 0 };
test('An unknown bill ID never displays another order', () => {
  const db = emptyDb(); db.orders = [sampleOrder];
  const html = renderWithDb(bill(999), db);
  assert.doesNotMatch(html, /ONLY-ORDER-001/); assert.match(html, /Không tìm thấy đơn hàng/);
});
test('Valid and empty bills render safely', () => {
  const db = emptyDb(); db.orders = [sampleOrder];
  assert.match(renderWithDb(bill(1), db), /ONLY-ORDER-001/);
  assert.match(renderWithDb(bill(null), emptyDb()), /Chưa có đơn hàng/);
});
test('Login route renders the password form', () => {
  auth.getState().logout();
  const html = renderToString(React.createElement(MemoryRouter, { initialEntries: ['/login'] }, React.createElement(App)));
  assert.match(html, /type="password"/); assert.match(html, /autoComplete="current-password"/i);
  assert.match(html, /type="email"/);
  assert.match(html, /name="email"/);
  assert.match(html, /Gmail \/ Email đăng nhập/);
  assert.doesNotMatch(html, /name="phone"/);
});
test('Email login payload normalizes email and preserves the account password', () => {
  assert.deepEqual(credentials.loginCredentials(' My.Email@Gmail.com ', ' Case-Sensitive Password '), { email: 'my.email@gmail.com', password: ' Case-Sensitive Password ' });
});
test('Phone numbers and malformed emails cannot be used as login identifiers', () => {
  for (const identifier of ['0901234567', 'bad-email', 'user@', 'a b@gmail.com']) assert.throws(() => credentials.loginCredentials(identifier, 'password'));
  assert.throws(() => credentials.loginCredentials('valid@gmail.com', ''));
});
test('Registration sends email credentials and a separate normalized contact phone', () => {
  assert.deepEqual(credentials.registrationPayload({ fullName: ' Test Customer ', email: ' TEST@gmail.com ', phone: '090 123 4567', password: 'account-password' }), { fullName: 'Test Customer', email: 'test@gmail.com', phone: '0901234567', password: 'account-password' });
});
test('Registration requires valid email, contact phone and an account password', () => {
  const input = { fullName: 'Test Customer', email: 'test@gmail.com', phone: '0901234567', password: 'account-password' };
  for (const patch of [{ email: '' }, { phone: 'invalid' }, { fullName: ' ' }, { password: 'short' }]) assert.throws(() => credentials.registrationPayload({ ...input, ...patch }));
});
test('Guest header exposes separate login and registration links and a mobile account row', () => {
  const html = renderToString(React.createElement(MemoryRouter, null, React.createElement(Header, { currentRoute: 'home', cartCount: 0, onNavigate() {}, onOpenAuth() {} })));
  assert.match(html, /href="\/login"[^>]*>Đăng nhập<\/a>/);
  assert.match(html, /href="\/register"[^>]*>Đăng ký<\/a>/);
  assert.match(html, /aria-label="Tài khoản khách hàng"/);
});
test('Registration route opens the registration form directly', () => {
  auth.getState().logout();
  const html = renderToString(React.createElement(MemoryRouter, { initialEntries: ['/register'] }, React.createElement(App)));
  assert.match(html, /aria-label="Đăng ký tài khoản"/);
  assert.match(html, /Tạo tài khoản Aura/);
  assert.match(html, /autoComplete="new-password"/i);
  assert.match(html, /Số điện thoại liên hệ/);
  assert.doesNotMatch(html, /autoComplete="current-password"/i);
});
test('Authenticated header exposes account and logout instead of guest links', () => {
  const html = renderToString(React.createElement(MemoryRouter, null, React.createElement(Header, { currentRoute: 'home', user: account, cartCount: 0, onNavigate() {}, onOpenAuth() {}, onLogout() {} })));
  assert.match(html, /aria-label="Tài khoản Test Customer"/);
  assert.match(html, /aria-label="Đăng xuất"/);
  assert.doesNotMatch(html, /href="\/(?:login|register)"/);
});
test('Unknown product ID never falls back to the first catalog product', () => {
  const db = emptyDb(); db.products = [{ id: 1, name: 'WRONG-PRODUCT', is_available: true }];
  const node = React.createElement(MemoryRouter, { initialEntries: ['/product?productId=999'] }, React.createElement(SourceScreen, { screen: 'customize' }));
  const html = renderWithDb(node, db);
  assert.match(html, /Không tìm thấy sản phẩm/); assert.doesNotMatch(html, /WRONG-PRODUCT/);
});
test('Load error names the failed data and exposes retry without preview messaging', () => {
  const screen = React.createElement(MemoryRouter, null, React.createElement(SourceScreen, { screen: 'home' }));
  const html = renderWithDb(screen, emptyDb(), { unavailable: ['/api/products', '/api/categories'] });
  assert.match(html.replace(/<!--.*?-->/g, ''), /Chưa tải được: danh sách sản phẩm, danh mục sản phẩm/);
  assert.match(html, /Thử lại/); assert.doesNotMatch(html, /Bạn vẫn có thể xem giao diện/);
});
test('Unrelated endpoint failures do not show an error on the menu', () => {
  const screen = React.createElement(MemoryRouter, null, React.createElement(SourceScreen, { screen: 'menu' }));
  const html = renderWithDb(screen, emptyDb(), { unavailable: ['/api/purchase-orders'] });
  assert.doesNotMatch(html, /Chưa tải được:/);
});
test('Successful data loads do not show a warning', () => {
  const screen = React.createElement(MemoryRouter, null, React.createElement(SourceScreen, { screen: 'home' }));
  assert.doesNotMatch(renderWithDb(screen, emptyDb()), /Chưa tải được:/);
});

test('Counter editor renders persisted items, table and note in an accessible dialog', () => {
  const db = emptyDb();
  const order = { ...sampleOrder, order_type: 'DINE_IN', table_number: 'T07', order_note: 'Keep this note', update_token: '2026-10-27T03:00:00.123Z' };
  db.orders = [order];
  db.products = [{ id: 5, name: 'Test Coffee', base_price: 30000, is_available: true, variants_config: { sizes: { M: 0, L: 10000 } } }];
  db.order_items = [{ id: 8, order_id: 1, product_id: 5, product_name_at_time: 'Test Coffee', quantity: 2, customization: { size: 'L' } }];
  const html = renderWithDb(React.createElement(CounterOrderEditor, { order, onClose() {} }), db);
  assert.match(html, /role="dialog"/); assert.match(html, /aria-modal="true"/);
  assert.match(html, /value="T07"/); assert.match(html, /Keep this note/);
  assert.match(html, /<option selected="">L<\/option>/); assert.match(html, /value="2"/);
  assert.match(html, /Lưu thay đổi/);
});

test('Counter edit action is available only to eligible staff and unpaid unprepared orders', () => {
  const db = emptyDb(); db.orders = [{ ...sampleOrder, status: 'PREPARING' }];
  db.payments = [{ id: 2, order_id: 1, status: 'PENDING', payment_method: 'CASH', amount: 30000 }];
  db.order_items = [{ id: 3, order_id: 1, product_id: 5, product_name_at_time: 'Coffee', quantity: 1, is_prepared: false }];
  const screen = () => renderWithDb(React.createElement(MemoryRouter, null, React.createElement(SourceScreen, { screen: 'pos-orders' })), db);
  const initialState = auth.getInitialState();
  const previous = initialState.user;
  // SSR normally reads Zustand's startup snapshot rather than browser login state.
  try {
    initialState.user = { ...account, role: 'STAFF', position: 'CASHIER' };
    assert.match(screen(), /Sửa đơn/);
    db.payments[0].status = 'SUCCESS'; assert.doesNotMatch(screen(), /Sửa đơn/);
    db.payments[0].status = 'PENDING'; db.order_items[0].is_prepared = true;
    assert.doesNotMatch(screen(), /Sửa đơn/);
    db.order_items[0].is_prepared = false;
    initialState.user = { ...account, role: 'STAFF', position: 'BARISTA' };
    assert.doesNotMatch(screen(), /Sửa đơn/);
  } finally { initialState.user = previous; }
});
