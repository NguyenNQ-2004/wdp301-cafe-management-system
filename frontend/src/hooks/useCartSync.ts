import { useEffect } from 'react';
import { cartPayload, mergeCartItems, productToCartItem, shopApi } from '../lib/shopApi';
import useCartStore from '../store/cartStore';
import type { CartItem, CatalogProduct } from '../types/shop';

interface CartResponse {
  items: { product: CatalogProduct | null; quantity: number; size: string; checked: boolean }[];
}

export default function useCartSync(user: { _id: string; token: string } | null) {
  const items = useCartStore((state) => state.items);
  const ownerId = useCartStore((state) => state.ownerId);
  const ready = useCartStore((state) => state.ready);

  useEffect(() => {
    let active = true;
    const cart = useCartStore.getState();
    if (!user) {
      if (cart.ownerId) cart.clear();
      cart.setReady(true);
      return;
    }
    cart.setReady(false);
    const load = async () => {
      try {
        const response = await shopApi<CartResponse>('/api/cart', { token: user.token });
        if (!active) return;
        const remote = response.items.filter((line) => line.product).map((line) => ({
          ...productToCartItem(line.product!, line.size), quantity: line.quantity, checked: line.checked
        }));
        const current = useCartStore.getState();
        const next: CartItem[] = current.ownerId === null ? mergeCartItems(remote, current.items) : remote;
        current.replace(next, user._id);
      } catch {
        if (active && useCartStore.getState().ownerId && useCartStore.getState().ownerId !== user._id) {
          useCartStore.getState().replace([], user._id);
        }
      } finally {
        if (active) useCartStore.getState().setReady(true);
      }
    };
    load();
    return () => { active = false; };
  }, [user?._id, user?.token]);

  useEffect(() => {
    if (!user || !ready || ownerId !== user._id) return;
    const timer = window.setTimeout(() => {
      shopApi('/api/cart', { method: 'PUT', token: user.token, body: { items: cartPayload(items) } }).catch(() => {});
    }, 350);
    return () => window.clearTimeout(timer);
  }, [items, ownerId, ready, user?._id, user?.token]);
}
