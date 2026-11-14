const { timingSafeEqual } = require('crypto');

// SePay sends bank credit notifications to /api/payments/callback.
const enabled = () => !!(process.env.SEPAY_WEBHOOK_API_KEY && process.env.PAYMENT_BANK_ID && process.env.PAYMENT_ACCOUNT_NO && process.env.PAYMENT_ACCOUNT_NAME);
const paymentCode = payment => `AU${String(payment._id).toUpperCase()}`;

const verify = req => {
  if (!enabled()) return false;
  const expected = Buffer.from(`Apikey ${process.env.SEPAY_WEBHOOK_API_KEY}`);
  const supplied = Buffer.from(req.get('Authorization') || '');
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
};

const info = (order, payment) => {
  const code = paymentCode(payment);
  const parameters = new URLSearchParams({ bank: process.env.PAYMENT_BANK_ID, acc: process.env.PAYMENT_ACCOUNT_NO, holder: process.env.PAYMENT_ACCOUNT_NAME, amount: String(order.finalAmount), des: code, template: 'compact', showinfo: 'true', fullacc: 'true', store: 'AURA Cafe' });
  return { bankName: process.env.PAYMENT_BANK_NAME || process.env.PAYMENT_BANK_ID, accountNo: process.env.PAYMENT_ACCOUNT_NO, accountName: process.env.PAYMENT_ACCOUNT_NAME, paymentCode: code, qrUrl: `https://vietqr.app/img?${parameters}` };
};

module.exports = { enabled, verify, info, paymentCode };
