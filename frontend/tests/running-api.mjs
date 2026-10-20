// Read-only checks against the running server. Uses the project's existing seed accounts.
// No registration, seed, cart update, order creation or business-data mutation.
const base = process.env.TEST_API_URL || 'http://127.0.0.1:5000';
const password = process.env.TEST_PASSWORD || '123456';
const checks = [];
async function check(name, path, expected, token, body) {
  try {
    const response = await fetch(base + path, {
      method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(8000),
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json().catch(() => null);
    checks.push({ name, path, expected, actual: response.status, pass: response.status === expected });
    return { status: response.status, data };
  } catch (error) {
    checks.push({ name, path, expected, actual: 'NETWORK_ERROR', pass: false, error: error.name });
    return {};
  }
}
await check('Reject missing credentials', '/api/auth/login', 400, null, {});
await check('Reject wrong password', '/api/auth/login', 401, null, { phone: '0900000001', password: 'incorrect-test-password' });
await check('Protect account details', '/api/auth/me', 401);
await check('Protect order list', '/api/orders', 401);
await check('Public categories', '/api/categories', 200);
await check('Public products', '/api/products', 200);
await check('Public settings', '/api/shop-settings', 200);
await check('Payment configuration', '/api/payments/config', 200);
const accounts = {};
for (const [role, phone] of Object.entries({ admin: '0900000001', barista: '0900000002', cashier: '0900000003', customer: '0900000004', shipper: '0900000006' })) {
  const result = await check(`${role} login`, '/api/auth/login', 200, null, { phone, password });
  if (!result.data?.token) continue;
  accounts[role] = result.data;
  await check(`${role} account`, '/api/auth/me', 200, result.data.token);
}
const today = new Date().toISOString().slice(0, 10);
if (accounts.admin) for (const path of ['/api/users', '/api/employees', '/api/categories', '/api/products', '/api/orders', '/api/payments', '/api/ingredients', '/api/suppliers', '/api/product-ingredients', '/api/inventory-transactions', '/api/purchase-orders', '/api/purchase-orders/restock-overview', '/api/work-shifts', '/api/loyalty-transactions/rules', '/api/customer-reviews', `/api/reports?startDate=${today.slice(0, 7)}-01&endDate=${today}`]) {
  await check('Admin endpoint', path, 200, accounts.admin.token);
}
if (accounts.customer) {
  const account = accounts.customer;
  await check('Customer cart', '/api/cart', 200, account.token);
  await check('Customer loyalty', '/api/loyalty-transactions', 200, account.token);
  await check('Customer cannot read employees', '/api/employees', 403, account.token);
  const result = await check('Customer orders', '/api/orders', 200, account.token);
  if (Array.isArray(result.data)) checks.push({ name: 'Customer orders contain only own records', pass: result.data.every(order => String(order.customer?._id || order.customer) === account._id) });
}
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), base, passed: checks.filter(c => c.pass).length, failed: checks.filter(c => !c.pass).length, checks }, null, 2));
if (checks.some(c => !c.pass)) process.exitCode = 1;
