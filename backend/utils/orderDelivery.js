// Order.shipper and Order.status remain authoritative. This embedded history
// records the delivery lifecycle without a second competing order state.
function recordDelivery(order, action, actor) {
  const now = new Date();
  if (!order.delivery) order.delivery = {};
  order.delivery.status = action;
  if (action === 'ASSIGNED') {
    order.delivery.assignedAt = now;
    order.delivery.acceptedAt = undefined;
    order.delivery.pickedUpAt = undefined;
    order.delivery.deliveredAt = undefined;
  }
  if (action === 'ACCEPTED') order.delivery.acceptedAt = now;
  if (action === 'DELIVERING') order.delivery.pickedUpAt = now;
  if (action === 'DELIVERED') order.delivery.deliveredAt = now;
  order.delivery.history.push({ action, actor, shipper: order.shipper, at: now });
}

module.exports = { recordDelivery };
