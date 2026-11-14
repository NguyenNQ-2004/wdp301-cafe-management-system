import type { CartItem, CatalogProduct } from '../types/shop';
import { repairDisplayData, repairDisplayText } from './displayText';

export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export class ShopApiError extends Error {
  readonly status: number;
  readonly data?: Record<string, unknown>;

  constructor(message: string, status: number, data?: Record<string, unknown>) {
    super(message);
    this.name = 'ShopApiError';
    this.status = status;
    this.data = data;
  }
}

export async function shopApi<T>(path: string, options: { method?: string; token?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = repairDisplayData(await response.json().catch(() => null));
  if (!response.ok) throw new ShopApiError(data?.message || (response.status === 404 ? 'API cho chức năng này chưa được kết nối (404).' : 'Không kết nối được với máy chủ.'), response.status, data);
  return data as T;
}

export const formatVnd = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;

export const cartIdFor = (productId: string, size: string, options?: CartItem['customization']) => {
  const suffix = options ? JSON.stringify([options.sugar || '', options.ice || '', options.note?.trim() || '', (options.topping || []).map(repairDisplayText).sort()]) : '';
  return `${productId}:${size}${suffix && suffix !== '["","","",[]]' ? ':' + suffix : ''}`;
};

export function productToCartItem(product: CatalogProduct, size = 'M', customization?: CartItem['customization']): CartItem {
  return {
    cartId: cartIdFor(product._id, size, customization),
    productId: product._id,
    name: product.name,
    image: product.imageUrl || '',
    categoryTitle: product.category?.name || 'Aura Café',
    size,
    unitPrice: product.basePrice + (product.variantsConfig?.sizes?.[size] || 0) + (customization?.topping || []).reduce((sum, name) => sum + (product.variantsConfig?.toppings?.find(item => item.name === name || repairDisplayText(item.name) === repairDisplayText(name))?.price || 0), 0),
    ...(customization ? { customization } : {}),
    quantity: 1,
    checked: true
  };
}

export const cartPayload = (items: CartItem[]) => items.map(({ productId, quantity, size, checked, customization }) => ({
  productId, quantity, size, checked, ...(customization ? { customization } : {})
}));

export function mergeCartItems(first: CartItem[], second: CartItem[]): CartItem[] {
  const merged = new Map(first.map((item) => [item.cartId, { ...item }]));
  second.forEach((item) => {
    const existing = merged.get(item.cartId);
    if (existing) existing.quantity = Math.min(99, existing.quantity + item.quantity);
    else merged.set(item.cartId, { ...item });
  });
  return Array.from(merged.values());
}
