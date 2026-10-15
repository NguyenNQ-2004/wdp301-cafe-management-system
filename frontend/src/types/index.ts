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
  | 'admin-orders'
  | 'admin-categories'
  | 'admin-products'
  | 'admin-recipes'
  | 'admin-ingredients'
  | 'admin-inventory'
  | 'admin-restock'
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

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERING'
  | 'COMPLETED'
  | 'CANCELLED';

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'ONLINE';

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
  id: any;
  _id?: string;
  category_id?: any;
  category?: any;
  name: string;
  price?: number;
  base_price?: number;
  basePrice?: number;
  imageUrl?: string;
  image_url?: string;
  status?: string;
  isAvailable?: boolean;
  is_available?: boolean;
  badge?: string;
  subtitle?: string;
  description?: string;
  variantsConfig?: any;
  variants_config?: any;
  recipe?: any[];
}

export interface Ingredient {
  id: any;
  _id?: string;
  supplier_id?: any;
  supplier?: any;
  name: string;
  unit: string;
  current_stock: number;
  currentStock?: number;
  min_stock_level: number;
  minStockLevel?: number;
  cost_per_unit?: number;
  latestUnitPrice?: number | null;
}

export interface Supplier {
  id: any;
  _id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: string;
}

