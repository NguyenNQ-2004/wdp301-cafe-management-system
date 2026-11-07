const pending = new Set();
function lockOrder(id) {
  const key = String(id);
  if (pending.has(key)) throw Object.assign(new Error('Đơn hàng đang được cập nhật. Vui lòng thử lại.'), { status: 409 });
  pending.add(key);
  return () => pending.delete(key);
}
const mongoose = require('mongoose');
const { randomBytes } = require('crypto');
const Order = require('../models/Order');

// Called inside atomicRouter's transaction. The claim, business writes and
// release commit together; a crash aborts them instead of leaving a stale lock.
const withOrderMutation = (handler, resolveId = req => req.params.id) => async (req, res, next) => {
  const id = await resolveId(req);
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ.' });
  const token = randomBytes(16).toString('hex');
  const order = await Order.findOneAndUpdate(
    { _id: id, mutationLock: { $exists: false } },
    { $set: { mutationLock: token } },
    { timestamps: false }
  );
  if (!order) {
    const exists = await Order.exists({ _id: id });
    return res.status(exists ? 409 : 404).json({ message: exists ? 'Đơn đang được xử lý. Vui lòng thử lại.' : 'Không tìm thấy đơn hàng.' });
  }
  await handler(req, res, next);
  await Order.updateOne({ _id: id, mutationLock: token }, { $unset: { mutationLock: 1 } }, { timestamps: false });
};

module.exports = { lockOrder, withOrderMutation };
