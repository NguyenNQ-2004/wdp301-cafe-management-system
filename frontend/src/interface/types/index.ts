export * from './db';

import type { OrderCustomization } from './db';

export type AppModule = 'customer' | 'pos' | 'kds' | 'delivery' | 'admin';

export type PageRoute =
  | 'home'
  | 'menu'
  | 'customize'
  | 'cart'
  | 'checkout'
  | 'payment'
  | 'bill'
  | 'orders'
  | 'profile'
  | 'pos-create'
  | 'pos-orders'
  | 'kds-terminal'
  | 'delivery-orders'
  | 'feedback'
  | 'pos-shift'
  | 'pos-handover'
  | 'delivery-report'
  | 'delivery-cod'
  | 'admin-ingredients'
  | 'admin-recipes'
  | 'admin-purchases'
  | 'admin-overview'
  | 'admin-categories'
  | 'admin-products'
  | 'admin-stock'
  | 'admin-restock'
  | 'admin-orders'
  | 'admin-users'
  | 'admin-attendance'
  | 'admin-shifts'
  | 'admin-schedules'
  | 'admin-suppliers'
  | 'admin-customers'
  | 'admin-memberships'
  | 'admin-complaints'
  | 'admin-settings';

// =========================================
// GIỎ HÀNG (chỉ tồn tại phía giao diện, khi đặt sẽ thành order_items)
// =========================================

export interface CartItem {
  cartId: string;
  product_id: number;
  quantity: number;
  unit_price: number; // base_price + giá size + giá topping (giống order_items.unit_price)
  customization: OrderCustomization;
  checked?: boolean;
}

// Thông tin đơn ở bước Checkout, sang bước Thanh toán mới ghi vào bảng orders
export interface CheckoutDraft {
  order_type: 'ONLINE' | 'TAKEAWAY';
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
  order_note: string;
  points_to_redeem: number;
}
