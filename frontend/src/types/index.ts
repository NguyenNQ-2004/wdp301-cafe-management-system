export type PageRoute = 'home' | 'menu' | 'profile' | 'cart' | 'login' | 'orders' | 'feedback' | 'checkout' | 'payment' | 'admin' | 'cashier' | 'barista';

export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}
