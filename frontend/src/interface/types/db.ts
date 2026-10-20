// =====================================================
// Kiểu dữ liệu khớp 1-1 với database aura_cafe_erp (aura_cafe.sql)
// Tên field giữ nguyên tên cột. Cột đánh dấu [Bổ sung] là cột thêm vào SQL cho giao diện.
// DECIMAL -> number, DATE/DATETIME -> string ('YYYY-MM-DD' / 'YYYY-MM-DD HH:mm:ss')
// =====================================================

export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';
export type StaffPosition = 'MANAGER' | 'BARISTA' | 'CASHIER' | 'SHIPPER';

// 1. users
export interface User {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  password_hash: string;
  birthday: string | null;
  address: string | null;
  role: UserRole;
  status: UserStatus;
  position: StaffPosition | null;
  base_salary: number;
  hire_date: string | null;
  total_points: number;
  created_at: string;
}

export type ShiftName = 'MORNING' | 'AFTERNOON' | 'EVENING';
export type ScheduleStatus = 'SCHEDULED' | 'PRESENT' | 'ABSENT' | 'COMPLETED';

// 2. work_schedules
export interface WorkSchedule {
  id: number;
  user_id: number;
  work_date: string;
  shift_name: ShiftName;
  check_in_time: string | null;
  check_out_time: string | null;
  starting_cash: number | null;
  ending_cash_system: number | null;
  ending_cash_actual: number | null;
  status: ScheduleStatus;
  note: string | null;
}

export type ActiveStatus = 'ACTIVE' | 'INACTIVE';

// 3. categories
export interface Category {
  id: number;
  name: string;
  icon: string | null;
  description: string | null;
  image_url: string | null;
  status: ActiveStatus;
}

// products.variants_config — VD: {"sizes":{"M":0,"L":10000},"toppings":[{"name":"Extra kem muối","price":8000}]}
export interface VariantsConfig {
  sizes: Record<string, number>;
  toppings: { name: string; price: number }[];
}

// 4. products
export interface Product {
  id: number;
  category_id: number;
  name: string;
  base_price: number;
  badge: string | null;
  subtitle: string | null;
  variants_config: VariantsConfig | null;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
}

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'ONLINE';
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERING'
  | 'COMPLETED'
  | 'CANCELLED';

// 5. orders
export interface Order {
  id: number;
  order_code: string;
  customer_id: number | null;
  cashier_id: number | null;
  order_type: OrderType;
  status: OrderStatus;
  total_amount: number;
  discount_amount: number;
  delivery_fee: number;
  final_amount: number;
  recipient_name: string | null;
  recipient_phone: string | null;
  delivery_address: string | null;
  shipper_id: number | null;
  table_number: string | null;
  order_note: string | null;
  cancel_reason: string | null; // [Bổ sung]
  created_at: string;
}

// order_items.customization — VD: {"size":"L","topping":["Jelly"]}; sugar/ice/note là khoá thêm trong cùng JSON
export interface OrderCustomization {
  size?: string;
  topping?: string[];
  sugar?: string;
  ice?: string;
  note?: string;
}

// 6. order_items
export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name_at_time: string;
  unit_price: number;
  customization: OrderCustomization | null;
  quantity: number;
  subtotal: number;
  is_prepared: boolean; // [Bổ sung]
}

export type PaymentMethod = 'CASH' | 'VNPAY' | 'MOMO' | 'BANK_TRANSFER';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

// 7. payments
export interface Payment {
  id: number;
  order_id: number;
  payment_method: PaymentMethod;
  transaction_code: string | null;
  amount: number;
  status: PaymentStatus;
  paid_at: string | null;
  payment_note: string | null;
}

export type LoyaltyType = 'EARN' | 'REDEEM';

// 8. loyalty_transactions (EARN: points_change > 0, REDEEM: points_change < 0)
export interface LoyaltyTransaction {
  id: number;
  customer_id: number;
  order_id: number | null;
  points_change: number;
  transaction_type: LoyaltyType;
  created_at: string;
}

export type ReviewType = 'RATING' | 'COMPLAINT';
export type ReviewStatus = 'PENDING' | 'RESOLVED' | 'REJECTED';

// 9. customer_reviews (RATING: rating 1-5, COMPLAINT: rating NULL)
export interface CustomerReview {
  id: number;
  customer_id: number;
  order_id: number;
  issue_type: ReviewType;
  rating: number | null;
  content: string;
  status: ReviewStatus;
  admin_response: string | null;
  created_at: string;
}

// 10. suppliers
export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  status: ActiveStatus;
}

// 11. ingredients
export interface Ingredient {
  id: number;
  supplier_id: number | null;
  name: string;
  unit: string;
  current_stock: number;
  min_stock_level: number;
}

// 12. product_ingredients (BOM)
export interface ProductIngredient {
  id: number;
  product_id: number;
  ingredient_id: number;
  quantity_required: number;
}

export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';

// 13. purchase_orders
export interface PurchaseOrder {
  id: number;
  supplier_id: number;
  creator_id: number;
  total_cost: number;
  status: PurchaseOrderStatus;
  note: string | null; // [Bổ sung]
  created_at: string;
}

// 14. purchase_order_items
export interface PurchaseOrderItem {
  id: number;
  po_id: number;
  ingredient_id: number;
  quantity: number;
  unit_price: number;
}

export type InventoryTxType = 'IN_PURCHASE' | 'OUT_ORDER' | 'ADJUSTMENT' | 'SPOILAGE';
export type InventoryRefType = 'ORDER' | 'PURCHASE_ORDER' | 'ADJUSTMENT';

// 15. inventory_transactions (quantity luôn dương, transaction_type quyết định chiều tăng/giảm)
export interface InventoryTransaction {
  id: number;
  ingredient_id: number;
  transaction_type: InventoryTxType;
  quantity: number;
  reference_type: InventoryRefType;
  reference_id: number | null;
  created_at: string;
}

// 16. shop_settings
export interface ShopSetting {
  setting_key: string;
  setting_value: string;
  updated_at: string;
}

export interface DbState {
  users: User[];
  work_schedules: WorkSchedule[];
  categories: Category[];
  products: Product[];
  orders: Order[];
  order_items: OrderItem[];
  payments: Payment[];
  loyalty_transactions: LoyaltyTransaction[];
  customer_reviews: CustomerReview[];
  suppliers: Supplier[];
  ingredients: Ingredient[];
  product_ingredients: ProductIngredient[];
  purchase_orders: PurchaseOrder[];
  purchase_order_items: PurchaseOrderItem[];
  inventory_transactions: InventoryTransaction[];
  shop_settings: ShopSetting[];
}

// Các bảng có khoá chính id tự tăng
export type IdTable = Exclude<keyof DbState, 'shop_settings'>;
export type Row<T extends IdTable> = DbState[T][number];
