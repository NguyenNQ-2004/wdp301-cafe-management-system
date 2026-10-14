export type PageRoute = 
  | 'home' 
  | 'menu' 
  | 'profile' 
  | 'cart' 
  | 'login' 
  | 'orders' 
  | 'feedback' 
  | 'checkout' 
  | 'payment' 
  | 'admin' 
  | 'admin-categories'
  | 'admin-products'
  | 'admin-recipes'
  | 'admin-ingredients'
  | 'admin-inventory'
  | 'admin-purchases'
  | 'admin-suppliers'
  | 'admin-employees'
  | 'admin-shifts'
  | 'admin-schedules'
  | 'my-schedule'
  | 'my-attendance'
  | 'admin-attendance'
  | 'admin-handover'
  | 'admin-customers'
  | 'admin-loyalty'
  | 'admin-complaints'
  | 'admin-reports'
  | 'admin-settings'
  | 'cashier' 
  | 'barista';

export type ActiveStatus = 'ACTIVE' | 'INACTIVE';

export interface Category {
  id: string | number;
  _id?: string;
  name: string;
  icon?: string | null;
  description?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  status: ActiveStatus;
}

export interface Product {
  id: string | number;
  _id?: string;
  category_id?: string | number;
  category?: any;
  name: string;
  price?: number;
  base_price?: number;
  basePrice?: number;
  imageUrl?: string;
  image_url?: string;
  status?: string;
  isAvailable?: boolean;
}
