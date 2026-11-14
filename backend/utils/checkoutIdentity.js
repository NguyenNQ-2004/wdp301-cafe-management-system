const { createHash } = require('crypto');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function checkoutIdentity(req) {
  const checkoutSessionId = req.body.checkoutSessionId;
  const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;
  if (!UUID.test(checkoutSessionId || '') || !UUID.test(idempotencyKey || '')) throw Object.assign(new Error('Phiên đặt hàng không hợp lệ. Vui lòng tải lại trang.'), { status: 400 });
  if (req.body.idempotencyKey && req.body.idempotencyKey !== idempotencyKey) throw Object.assign(new Error('Khóa yêu cầu không khớp.'), { status: 400 });
  const payload = { ...req.body, idempotencyKey };
  return { checkoutSessionId, idempotencyKey, requestHash: createHash('sha256').update(JSON.stringify(canonical(payload))).digest('hex') };
}
module.exports = { checkoutIdentity };
