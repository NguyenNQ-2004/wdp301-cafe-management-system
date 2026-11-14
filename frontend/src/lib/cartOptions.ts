import type { CartItem } from '../types/shop';

// The current cart API supports one line per product and size.
export function hasDifferentOptions(existing: CartItem, customization?: CartItem['customization']): boolean {
  const key = (value?: CartItem['customization']) => JSON.stringify([
    value?.sugar || '', value?.ice || '', value?.note?.trim() || '', [...(value?.topping || [])].sort()
  ]);
  return key(existing.customization) !== key(customization);
}

export function groupOrderItems(items: { productId: string; size: string; quantity: number; customization?: CartItem['customization'] }[]) {
  const grouped = new Map<string, typeof items[number]>();
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new Error('Số lượng món không hợp lệ.');
    const options = item.customization;
    const key = JSON.stringify([item.productId, item.size, options?.sugar || '', options?.ice || '', options?.note?.trim() || '', [...(options?.topping || [])].sort()]);
    const quantity = (grouped.get(key)?.quantity || 0) + item.quantity;
    if (quantity > 99) throw new Error('Mỗi món và size chỉ được đặt tối đa 99 ly.');
    grouped.set(key, { ...item, quantity });
  }
  return [...grouped.values()];
}
