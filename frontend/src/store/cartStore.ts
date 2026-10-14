import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, CatalogProduct } from '../types/shop';
import { productToCartItem } from '../lib/shopApi';

interface CartState {
  items: CartItem[];
  ownerId: string | null;
  rewardId: string | null;
  ready: boolean;
  syncError: string | null;
  addProduct: (product: CatalogProduct, size?: string) => void;
  updateQuantity: (cartId: string, delta: number) => void;
  removeItem: (cartId: string) => void;
  removeSelected: () => void;
  toggleItem: (cartId: string) => void;
  toggleAll: (checked: boolean) => void;
  replace: (items: CartItem[], ownerId: string | null) => void;
  clear: () => void;
  setReady: (ready: boolean) => void;
  setSyncError: (error: string | null) => void;
  setRewardId: (rewardId: string | null) => void;
}

const useCartStore = create<CartState>()(persist((set) => ({
  items: [],
  ownerId: null,
  rewardId: null,
  ready: false,
  syncError: null,
  addProduct: (product, size = 'M') => set((state) => {
    const line = productToCartItem(product, size);
    const existing = state.items.find((item) => item.cartId === line.cartId);
    return {
      items: existing
        ? state.items.map((item) => item.cartId === line.cartId ? { ...item, quantity: Math.min(99, item.quantity + 1), checked: true } : item)
        : [line, ...state.items]
    };
  }),
  updateQuantity: (cartId, delta) => set((state) => ({
    items: state.items.map((item) => item.cartId === cartId ? { ...item, quantity: Math.min(99, item.quantity + delta) } : item)
      .filter((item) => item.quantity > 0)
  })),
  removeItem: (cartId) => set((state) => ({ items: state.items.filter((item) => item.cartId !== cartId) })),
  removeSelected: () => set((state) => ({ items: state.items.filter((item) => !item.checked) })),
  toggleItem: (cartId) => set((state) => ({
    items: state.items.map((item) => item.cartId === cartId ? { ...item, checked: !item.checked } : item)
  })),
  toggleAll: (checked) => set((state) => ({ items: state.items.map((item) => ({ ...item, checked })) })),
  replace: (items, ownerId) => set((state) => ({
    items, ownerId, rewardId: state.ownerId === ownerId ? state.rewardId : null
  })),
  clear: () => set({ items: [], ownerId: null, rewardId: null, syncError: null }),
  setReady: (ready) => set({ ready }),
  setSyncError: (syncError) => set({ syncError }),
  setRewardId: (rewardId) => set({ rewardId })
}), {
  name: 'aura-cart',
  partialize: (state) => ({ items: state.items, ownerId: state.ownerId, rewardId: state.rewardId })
}));

export default useCartStore;
