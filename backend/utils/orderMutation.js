const { randomBytes } = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/Order');

// A database lock also protects requests handled by different server instances.
// Never expire an active lock: a stopped process requires explicit recovery.
const withOrderMutation = (handler, resolveId = (req) => req.params.id) => async (req, res, next) => {
  let id;
  const token = randomBytes(16).toString('hex');
  let locked = false;
  let responseBody;
  let hasResponse = false;
  const json = res.json.bind(res);
  try {
    id = await resolveId(req);
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
    const order = await Order.findOneAndUpdate(
      { _id: id, mutationLock: { $exists: false } },
      { $set: { mutationLock: token } },
      { timestamps: false }
    );
    if (!order) {
      const exists = await Order.exists({ _id: id });
      return res.status(exists ? 409 : 404).json({ message: exists ? 'Đơn đang được xử lý. Vui lòng thử lại.' : 'Không tìm thấy đơn hàng.' });
    }
    locked = true;
    res.json = (body) => { responseBody = body; hasResponse = true; return res; };
    await handler(req, res, next);
  } catch (error) {
    if (!res.headersSent) { res.status(error.status || 500); responseBody = { message: error.message }; hasResponse = true; }
  } finally {
    if (locked && !res.locals.retainMutationLock) {
      try { await Order.updateOne({ _id: id, mutationLock: token }, { $unset: { mutationLock: 1 } }, { timestamps: false }); }
      catch (error) { console.error('Could not release order mutation lock:', String(id), error.message); }
    }
    res.json = json;
    if (hasResponse && !res.headersSent) json(responseBody);
  }
};

module.exports = { withOrderMutation };
