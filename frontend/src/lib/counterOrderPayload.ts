import type { OrderCustomization } from '../interface/types';

export function counterOrderPayload(lines: { productId: string; quantity: number; customization: OrderCustomization | null }[]) {
  if (!lines.length || lines.length > 50) throw new Error('Đơn phải có từ 1 đến 50 dòng món.');
  return lines.map(line => {
    if (!line.productId || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) throw new Error('Chọn món hợp lệ, số lượng mỗi dòng từ 1 đến 99.');
    return { productId: line.productId, quantity: line.quantity, size: line.customization?.size || 'M', customization: line.customization || {} };
  });
}
