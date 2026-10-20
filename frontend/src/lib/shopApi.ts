import type { CartItem, CatalogProduct } from '../types/shop';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export class ShopApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ShopApiError';
    this.status = status;
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
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ShopApiError(data?.message || (response.status === 404 ? 'API cho chức năng này chưa được kết nối (404).' : 'Không kết nối được với máy chủ.'), response.status);
  return data as T;
}

export const formatVnd = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;

export const cartIdFor = (productId: string, size: string) => `${productId}:${size}`;

export function productToCartItem(product: CatalogProduct, size = 'M'): CartItem {
  return {
    cartId: cartIdFor(product._id, size),
    productId: product._id,
    name: product.name,
    image: product.imageUrl || '',
    categoryTitle: product.category?.name || 'Aura Café',
    size,
    unitPrice: product.basePrice + (product.variantsConfig?.sizes?.[size] || 0),
    quantity: 1,
    checked: true
  };
}

export const cartPayload = (items: CartItem[]) => items.map(({ productId, quantity, size, checked }) => ({
  productId, quantity, size, checked
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
