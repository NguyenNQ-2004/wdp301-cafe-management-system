const { createHmac, timingSafeEqual } = require('crypto');

// Prefer real SePay when configured; keep the signed local gateway for existing test flows.
const sepayEnabled = () => !!(process.env.SEPAY_WEBHOOK_API_KEY && process.env.PAYMENT_BANK_ID && process.env.PAYMENT_ACCOUNT_NO && process.env.PAYMENT_ACCOUNT_NAME);
const legacyEnabled = () => !!(process.env.PAYMENT_GATEWAY_URL && process.env.PAYMENT_CALLBACK_SECRET && process.env.PAYMENT_BANK_ID && process.env.PAYMENT_ACCOUNT_NO && process.env.PAYMENT_ACCOUNT_NAME);
const enabled = () => sepayEnabled() || legacyEnabled();
const mode = () => sepayEnabled() ? 'SEPAY' : legacyEnabled() ? 'SIGNED_GATEWAY' : null;
const paymentCode = payment => `AU${String(payment._id).toUpperCase()}`;

const verify = req => {
  if (!sepayEnabled()) return false;
  const expected = Buffer.from(`Apikey ${process.env.SEPAY_WEBHOOK_API_KEY}`);
  const supplied = Buffer.from(req.get('Authorization') || '');
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
};

const signLegacy = payload => createHmac('sha256', process.env.PAYMENT_CALLBACK_SECRET || '').update(payload).digest('hex');
const verifyLegacy = body => {
  if (!legacyEnabled() || typeof body.signature !== 'string' || !/^[a-f0-9]{64}$/i.test(body.signature)) return false;
  const canonical = [body.orderCode, body.transactionCode, body.amount, String(body.status || '').toUpperCase()].map(value => String(value ?? '').trim()).join('|');
  return timingSafeEqual(Buffer.from(signLegacy(canonical), 'hex'), Buffer.from(body.signature, 'hex'));
};

const info = (order, payment) => {
  const code = mode() === 'SEPAY' ? paymentCode(payment) : order.orderCode;
  const parameters = new URLSearchParams({ bank: process.env.PAYMENT_BANK_ID, acc: process.env.PAYMENT_ACCOUNT_NO, holder: process.env.PAYMENT_ACCOUNT_NAME, amount: String(order.finalAmount), des: code, template: 'compact', showinfo: 'true', fullacc: 'true', store: 'AURA Cafe' });
  return { bankName: process.env.PAYMENT_BANK_NAME || process.env.PAYMENT_BANK_ID, accountNo: process.env.PAYMENT_ACCOUNT_NO, accountName: process.env.PAYMENT_ACCOUNT_NAME, paymentCode: code, qrUrl: `https://vietqr.app/img?${parameters}` };
};

async function register(order, payment) {
  if (mode() !== 'SIGNED_GATEWAY') return;
  const appId = process.env.PAYMENT_APP_ID || 'aura_cafe';
  const signature = signLegacy(`${appId}|${order.orderCode}|${order.finalAmount}`);
  const response = await fetch(`${process.env.PAYMENT_GATEWAY_URL.replace(/\/+$/, '')}/api/orders/register`, {
    method: 'POST', signal: AbortSignal.timeout(5000), headers: { 'Content-Type': 'application/json', 'X-Signature': signature },
    body: JSON.stringify({ appId, orderCode: order.orderCode, amount: order.finalAmount, transactionCode: payment.transactionCode, signature })
  });
  if (!response.ok) throw Object.assign(new Error('Cổng thanh toán chưa nhận được giao dịch. Vui lòng thử lại.'), { status: 502 });
}

module.exports = { enabled, mode, verify, verifyLegacy, info, paymentCode, register };
