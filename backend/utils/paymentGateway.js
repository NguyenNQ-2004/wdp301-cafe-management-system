const { createHmac, timingSafeEqual } = require('crypto');
const sign = payload => createHmac('sha256', process.env.PAYMENT_CALLBACK_SECRET || '').update(payload).digest('hex');
const enabled = () => !!(process.env.PAYMENT_GATEWAY_URL && process.env.PAYMENT_CALLBACK_SECRET && process.env.PAYMENT_BANK_ID && process.env.PAYMENT_ACCOUNT_NO && process.env.PAYMENT_ACCOUNT_NAME);
const verify = body => {
  if (!enabled() || typeof body.signature !== 'string' || !/^[a-f0-9]{64}$/i.test(body.signature)) return false;
  const canonical = [body.orderCode, body.transactionCode, body.amount, String(body.status || '').toUpperCase()].map(value => String(value ?? '').trim()).join('|');
  return timingSafeEqual(Buffer.from(sign(canonical), 'hex'), Buffer.from(body.signature, 'hex'));
};
const info = order => {
  const parameters = new URLSearchParams({ bank: process.env.PAYMENT_BANK_ID, acc: process.env.PAYMENT_ACCOUNT_NO, holder: process.env.PAYMENT_ACCOUNT_NAME, amount: String(order.finalAmount), des: order.orderCode, template: 'compact', showinfo: 'true', fullacc: 'true', store: 'AURA Cafe' });
  return { bankName: process.env.PAYMENT_BANK_NAME || process.env.PAYMENT_BANK_ID, accountNo: process.env.PAYMENT_ACCOUNT_NO, accountName: process.env.PAYMENT_ACCOUNT_NAME, qrUrl: `https://vietqr.app/img?${parameters}` };
};
async function register(order, payment) {
  if (!enabled()) throw Object.assign(new Error('Cổng thanh toán chưa được cấu hình.'), { status: 503 });
  const appId = process.env.PAYMENT_APP_ID || 'aura_cafe';
  const signature = sign(`${appId}|${order.orderCode}|${order.finalAmount}`);
  const response = await fetch(`${process.env.PAYMENT_GATEWAY_URL.replace(/\/+$/, '')}/api/orders/register`, {
    method: 'POST', signal: AbortSignal.timeout(5000), headers: { 'Content-Type': 'application/json', 'X-Signature': signature },
    body: JSON.stringify({ appId, orderCode: order.orderCode, amount: order.finalAmount, transactionCode: payment.transactionCode, signature })
  });
  if (!response.ok) throw Object.assign(new Error('Cổng thanh toán chưa nhận được giao dịch. Vui lòng thử lại.'), { status: 502 });
}
module.exports = { enabled, verify, info, register };
