import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cartPayload, mergeCartItems, productToCartItem, shopApi } from '../lib/shopApi';
import useCartStore from '../store/cartStore';
import type { CartItem, CatalogProduct } from '../types/shop';

interface CartResponse {
  items: { product: CatalogProduct | null; quantity: number; size: string; checked: boolean }[];
}

const retryDelay = () => new Promise<void>((resolve) => window.setTimeout(resolve, 3000));

export default function useCartSync(user: { _id: string; token: string } | null) {
  const userId = user?._id;
  const userToken = user?.token;
  const items = useCartStore((state) => state.items);
  const ownerId = useCartStore((state) => state.ownerId);
  const ready = useCartStore((state) => state.ready);
  const [loadAttempt, retryLoad] = useState(0);
  const saveChain = useRef(Promise.resolve());
  const lastSaved = useRef('');

  useLayoutEffect(() => {
    let active = true;
    let retryTimer: number | undefined;
    const cart = useCartStore.getState();
    if (!userId || !userToken) {
      if (cart.ownerId) cart.clear();
      cart.setReady(true);
      cart.setSyncError(null);
      lastSaved.current = '';
      return;
    }
    cart.setReady(false);
    if (cart.ownerId && cart.ownerId !== userId) cart.replace([], userId);
    const load = async () => {
      try {
        const response = await shopApi<CartResponse>('/api/cart', { token: userToken });
        if (!active) return;
        const remote = response.items.filter((line) => line.product).map((line) => ({
          ...productToCartItem(line.product!, line.size), quantity: line.quantity, checked: line.checked
        }));
        const current = useCartStore.getState();
        const next: CartItem[] = current.ownerId === null ? mergeCartItems(remote, current.items) : remote;
        current.replace(next, userId);
        current.setSyncError(null);
        current.setReady(true);
      } catch {
        if (!active) return;
        useCartStore.getState().setSyncError('Không tải được giỏ hàng. Hệ thống sẽ tự thử lại.');
        retryTimer = window.setTimeout(() => retryLoad((attempt) => attempt + 1), 3000);
      }
    };
    load();
    return () => { active = false; window.clearTimeout(retryTimer); };
  }, [userId, userToken, loadAttempt]);

  useEffect(() => {
    if (!userId || !userToken || !ready || ownerId !== userId) return;
    const token = userToken;
    const timer = window.setTimeout(() => {
      saveChain.current = saveChain.current.catch(() => {}).then(async () => {
        while (true) {
          const current = useCartStore.getState();
          if (!current.ready || current.ownerId !== userId) return;
          const payload = JSON.stringify(cartPayload(current.items));
          const key = `${userId}:${payload}`;
          if (lastSaved.current === key) return;
          try {
            await shopApi('/api/cart', { method: 'PUT', token, body: { items: JSON.parse(payload) } });
            lastSaved.current = key;
            if (useCartStore.getState().ownerId === userId) useCartStore.getState().setSyncError(null);
          } catch {
            if (useCartStore.getState().ownerId !== userId) return;
            useCartStore.getState().setSyncError('Không lưu được giỏ hàng. Hệ thống sẽ tự thử lại.');
            await retryDelay();
          }
        }
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [items, ownerId, ready, userId, userToken]);
}
