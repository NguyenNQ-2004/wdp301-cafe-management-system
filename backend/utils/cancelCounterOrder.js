const Order = require('../models/Order');
const Payment = require('../models/Payment');
const fail = (message, status = 409) => Object.assign(new Error(message), { status });

// Caller must own the order mutation lock. Used by both cancellation entry points.
async function cancelCounterOrder(order, reason, res) {
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) throw fail('Nhập lý do hủy từ 1 đến 500 ký tự.', 400);
  if (!['DINE_IN', 'TAKEAWAY'].includes(order.orderType)) throw fail('Đây không phải đơn tại quầy.');
  if (order.status === 'CANCELLED') {
    if (order.cancelReason === reason.trim()) return order;
    throw fail('Đơn đã hủy; không thể thay đổi lý do hủy.');
  }
  if (!['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status)) throw fail('Không thể hủy đơn đã kết thúc.');
  const payments = await Payment.find({ order: order._id });
  if (payments.some(payment => payment.status === 'SUCCESS')) throw fail('Đơn đã thanh toán. Cần xử lý hoàn tiền trước khi hủy.');
  if (payments.length !== 1 || payments[0].status !== 'PENDING' || payments[0].amount !== order.finalAmount) throw fail('Cần kiểm tra khoản thanh toán của đơn trước khi hủy.');
  if (order.pointsRedeemed || order.reward || order.voucher) throw fail('Đơn có ưu đãi cần xử lý hoàn điểm hoặc ưu đãi trước khi hủy.');
  const payment = payments[0];
  const original = { status: order.status, cancelReason: order.cancelReason || null, updatedAt: order.updatedAt };
  let changed = false;
  try {
    const result = await Payment.updateOne({ _id: payment._id, status: 'PENDING', amount: payment.amount }, {
      $set: { status: 'FAILED', paymentNote: `Hủy đơn tại quầy: ${reason.trim()}` },
    });
    if (result.matchedCount !== 1) throw fail('Khoản thanh toán đã thay đổi. Vui lòng tải lại.');
    changed = true;
    order.status = 'CANCELLED'; order.cancelReason = reason.trim(); await order.save();
    return order;
  } catch (error) {
    if (changed) {
      try {
        await Order.updateOne({ _id: order._id }, { $set: original }, { timestamps: false });
        await Payment.updateOne({ _id: payment._id }, { $set: { status: payment.status, paymentNote: payment.paymentNote || null, updatedAt: payment.updatedAt } }, { timestamps: false });
      } catch (rollbackError) {
        res.locals.retainMutationLock = true;
        console.error('Counter cancellation rollback failed:', String(order._id), rollbackError.message);
        throw fail('Đơn đang tạm khóa để kiểm tra dữ liệu. Vui lòng liên hệ quản lý.', 500);
      }
    }
    throw error;
  }
}

module.exports = { cancelCounterOrder };
