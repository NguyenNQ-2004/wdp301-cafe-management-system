import type { PlaceOrderInput } from '../interface/LiveProvider';
import { groupOrderItems } from './cartOptions';

export function counterOrderPayload(input: PlaceOrderInput, rawId: (id: number) => string) {
  return {
    items: groupOrderItems(input.items.map(item => ({
      productId: rawId(item.product_id), quantity: item.quantity,
      size: item.customization?.size || 'M', customization: item.customization || undefined
    }))),
    pointsToRedeem: input.points_to_redeem,
    orderType: input.order_type,
    customerId: input.customer_id ? rawId(input.customer_id) : undefined,
    tableNumber: input.table_number,
    orderNote: input.order_note,
    paymentMethod: input.payment_method || 'CASH'
  };
}
