// Local development gateway for testing signed bank-transfer callbacks.
// It simulates settlement; it never moves money.
require('dotenv').config();
const http = require('http');
const { createHmac, timingSafeEqual } = require('crypto');

if (process.env.NODE_ENV === 'production') throw new Error('Mock gateway is disabled in production.');
const secret = process.env.PAYMENT_CALLBACK_SECRET;
if (!secret || secret.length < 16) throw new Error('Set PAYMENT_CALLBACK_SECRET to at least 16 characters in backend/.env.');
const port = Number(process.env.MOCK_GATEWAY_PORT || 5050);
const backendUrl = process.env.MOCK_BACKEND_URL || 'http://127.0.0.1:5000';
const registered = new Map();
const sign = (value) => createHmac('sha256', secret).update(value).digest('hex');
const reply = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
const readJson = async (req) => {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 10_000) throw new Error('Request too large.');
  }
  return JSON.parse(raw || '{}');
};

http.createServer(async (req, res) => {
  try {
    if (req.method !== 'POST') return reply(res, 405, { message: 'POST required.' });
    const body = await readJson(req);
    if (req.url === '/api/orders/register') {
      const expected = sign(`${body.appId}|${body.orderCode}|${body.amount}`);
      const signature = req.headers['x-signature'];
      if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature) || !timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex')) || body.signature !== signature) return reply(res, 401, { message: 'Invalid registration signature.' });
      if (!body.orderCode || !body.transactionCode || !Number.isSafeInteger(body.amount) || body.amount < 0) return reply(res, 400, { message: 'Invalid payment.' });
      registered.set(body.orderCode, { transactionCode: body.transactionCode, amount: body.amount });
      return reply(res, 200, { registered: true, orderCode: body.orderCode });
    }
    if (req.url === '/mock/settle') {
      const record = registered.get(body.orderCode);
      if (!record) return reply(res, 404, { message: 'Register the order from the cashier screen first.' });
      const status = body.status === 'FAILED' ? 'FAILED' : 'SUCCESS';
      const callback = { orderCode: body.orderCode, transactionCode: record.transactionCode, amount: record.amount, status };
      callback.signature = sign(`${callback.orderCode}|${callback.transactionCode}|${callback.amount}|${callback.status}`);
      const result = await fetch(`${backendUrl.replace(/\/+$/, '')}/api/payments/callback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(callback) });
      const data = await result.json();
      if (result.ok && status === 'SUCCESS') registered.delete(body.orderCode);
      return reply(res, result.status, data);
    }
    return reply(res, 404, { message: 'Unknown route.' });
  } catch (error) { return reply(res, 500, { message: error.message }); }
}).listen(port, '127.0.0.1', () => console.log(`Mock gateway listening at http://127.0.0.1:${port}`));
