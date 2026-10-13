export type PageRoute = 'home' | 'menu' | 'profile' | 'cart' | 'login' | 'orders' | 'feedback' | 'checkout' | 'payment';

export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}
