import { create } from 'zustand';
import useCartStore from './cartStore';

interface User {
  _id: string;
  fullName: string;
  phone: string;
  address?: string;
  role: string;
  position?: string;
  token: string;
}

interface AuthState {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  login: (user) => {
    const cart = useCartStore.getState();
    if (cart.ownerId && cart.ownerId !== user._id) cart.clear();
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    if (useCartStore.getState().ownerId) useCartStore.getState().clear();
    localStorage.removeItem('user');
    set({ user: null });
  },
}));

export default useAuthStore;
