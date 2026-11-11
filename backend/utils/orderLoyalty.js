const Order = require('../models/Order');
const Payment = require('../models/Payment');
const User = require('../models/User');
const ShopSetting = require('../models/ShopSetting');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const RewardItem = require('../models/RewardItem');

async function awardOrderPoints(orderId) {
  const order = await Order.findById(orderId);
  if (!order?.customer || order.status === 'CANCELLED') return;
  if (!await Payment.exists({ order: orderId, status: 'SUCCESS', amount: order.finalAmount })) return;
  if (await LoyaltyTransaction.exists({ order: orderId, transactionType: 'EARN' })) return;
  const customer = await User.findOne({ _id: order.customer, role: 'CUSTOMER' });
  if (!customer) return;
  const setting = await ShopSetting.findOne({ settingKey: 'points_earn_unit' });
  const configuredUnit = Number(setting?.settingValue ?? 1000);
  const unit = Number.isFinite(configuredUnit) && configuredUnit > 0 ? configuredUnit : 1000;
  const points = Math.floor(Math.max(0, order.totalAmount - order.discountAmount) / unit);
  if (points <= 0) return;
  let transaction;
  try {
    transaction = await LoyaltyTransaction.create({ customer: customer._id, order: orderId, transactionType: 'EARN', pointsChange: points, automatic: true, reason: 'Tích điểm thanh toán, không bao gồm phí giao hàng' });
  } catch (error) {
    if (require('mongoose').transactionAsyncLocalStorage?.getStore()?.session) throw error;
    if (error.code === 11000) return; throw error;
  }
  let updated;
  try {
    updated = await User.findOneAndUpdate({ _id: customer._id, role: 'CUSTOMER' }, { $inc: { totalPoints: points } }, { returnDocument: 'after' });
    if (!updated) throw new Error('Khách hàng không còn tồn tại.');
  } catch (error) {
    if (require('mongoose').transactionAsyncLocalStorage?.getStore()?.session) throw error;
    await LoyaltyTransaction.deleteOne({ _id: transaction._id });
    throw error;
  }
  transaction.balanceAfter = updated.totalPoints;
  await transaction.save();
}
async function refundRedemption(order) {
  if (order.status !== 'CANCELLED' || !order.customer) return;
  const earned = await LoyaltyTransaction.findOne({ order: order._id, automatic: true, transactionType: 'EARN' });
  const refunded = await LoyaltyTransaction.exists({ order: order._id, redemptionRefund: true });
  const reversed = await LoyaltyTransaction.exists({ order: order._id, earningReversal: true });
  const refund = refunded ? 0 : order.pointsRedeemed || 0;
  const reversal = reversed ? 0 : earned?.pointsChange || 0;
  if (!refund && !reversal) return;
  const transactions = [];
  const net = refund - reversal;
  let customerUpdated = false;
  let rewardUpdated = false;
  try {
    if (refund) transactions.push(await LoyaltyTransaction.create({ customer: order.customer, order: order._id, pointsChange: refund, transactionType: 'REFUND', redemptionRefund: true, reason: 'Hoàn điểm đổi ưu đãi do hủy đơn' }));
    if (reversal) transactions.push(await LoyaltyTransaction.create({ customer: order.customer, order: order._id, pointsChange: -reversal, transactionType: 'ADJUST', earningReversal: true, reason: 'Thu hồi điểm tích từ đơn đã hủy' }));
    // A refund must still complete after the customer spent earned points.
    // A negative balance is a points debt offset by future earnings.
    const customer = await User.findOneAndUpdate({ _id: order.customer }, { $inc: { totalPoints: net } }, { returnDocument: 'after' });
    if (!customer) throw Object.assign(new Error('Không tìm thấy khách hàng để hoàn điểm.'), { status: 409 });
    customerUpdated = true;
    if (refund && order.reward) {
      const result = await RewardItem.updateOne({ _id: order.reward, stock: { $gte: 0 } }, { $inc: { stock: 1 } });
      rewardUpdated = result.modifiedCount > 0;
    }
    for (const transaction of transactions) { transaction.balanceAfter = customer.totalPoints; await transaction.save(); }
  } catch (error) {
    if (require('mongoose').transactionAsyncLocalStorage?.getStore()?.session) throw error;
    if (rewardUpdated) await RewardItem.updateOne({ _id: order.reward }, { $inc: { stock: -1 } });
    if (customerUpdated) await User.updateOne({ _id: order.customer }, { $inc: { totalPoints: -net } });
    await LoyaltyTransaction.deleteMany({ _id: { $in: transactions.map(transaction => transaction._id) } });
    if (error.code === 11000) return;
    throw error;
  }
}
module.exports = { awardOrderPoints, refundRedemption };
