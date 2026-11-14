import { create } from 'zustand';
import useCartStore from './cartStore';

interface User {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;
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

// A damaged or outdated browser session must not prevent the app from opening.
function readStoredUser(): User | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('user') || 'null');
    if (!value || typeof value !== 'object') return null;
    const account = value as Partial<User>;
    return typeof account._id === 'string' && !!account._id
      && typeof account.token === 'string' && !!account.token
      && typeof account.fullName === 'string' && typeof account.phone === 'string'
      && ['ADMIN', 'STAFF', 'CUSTOMER'].includes(account.role || '') ? account as User : null;
  } catch {
    return null;
  }
}

const useAuthStore = create<AuthState>((set) => ({
  user: readStoredUser(),
  login: (user) => {
    const cart = useCartStore.getState();
    if (cart.ownerId && cart.ownerId !== user._id) cart.clear();
    try { localStorage.setItem('user', JSON.stringify(user)); } catch { /* Keep the session in memory. */ }
    set({ user });
  },
  logout: () => {
    if (useCartStore.getState().ownerId) useCartStore.getState().clear();
    try { localStorage.removeItem('user'); } catch { /* The in-memory session is still cleared. */ }
    set({ user: null });
  },
}));

export default useAuthStore;
