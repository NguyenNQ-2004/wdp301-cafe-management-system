const Cart = require('../models/Cart');
const Order = require('../models/Order');
const { optionText } = require('./optionText');
const optionKey = (product, options, size) => JSON.stringify([String(product), size || options?.size || 'M', options?.sugar || '', options?.ice || '', options?.note?.trim() || '', (options?.topping || []).map(optionText).sort()]);
async function clearCheckoutCart(order) {
  if (!order.customer) return;
  const claimed = await Order.updateOne({ _id: order._id, cartClearedAt: null }, { $set: { cartClearedAt: new Date() } });
  if (!claimed.modifiedCount) return;
  try {
    const cart = await Cart.findOne({ customer: order.customer });
    if (!cart) return;
    const purchased = new Map(order.items.map(item => [optionKey(item.product, item.customization), item.quantity]));
    cart.items = cart.items.flatMap(item => {
      const key = optionKey(item.product, item.customization, item.size);
      const amount = purchased.get(key) || 0;
      if (!amount) return [item];
      purchased.delete(key);
      return item.quantity > amount ? [{ ...item.toObject(), quantity: item.quantity - amount }] : [];
    });
    await cart.save();
  } catch (failure) { await Order.updateOne({ _id: order._id }, { $unset: { cartClearedAt: 1 } }); throw failure; }
}
module.exports = { clearCheckoutCart };
