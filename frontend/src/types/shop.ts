export interface CatalogProduct {
  _id: string;
  name: string;
  basePrice: number;
  description?: string;
  subtitle?: string;
  badge?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  category?: { _id: string; name: string };
  variantsConfig?: { sizes?: Record<string, number> };
}

export interface CartItem {
  cartId: string;
  productId: string;
  name: string;
  image: string;
  categoryTitle: string;
  size: string;
  unitPrice: number;
  quantity: number;
  checked: boolean;
  customization?: { size?: string; sugar?: string; ice?: string; note?: string; topping?: string[] };
}

export interface RewardOffer {
  _id: string;
  name: string;
  pointsCost: number;
  discountValue: number;
  minOrderValue: number;
  stock: number;
}

export interface LoyaltySummary {
  totalPoints: number;
  canRedeem: boolean;
  rewards: RewardOffer[];
}

export interface OrderItem {
  product: string | { _id: string; name: string; imageUrl?: string };
  productNameAtTime: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  customization?: { size?: string };
}

export interface OrderRecord {
  _id: string;
  orderCode: string;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';
  orderType: 'ONLINE' | 'TAKEAWAY';
  items: OrderItem[];
  totalAmount: number;
  deliveryFee: number;
  discountAmount: number;
  pointsRedeemed?: number;
  reward?: string;
  finalAmount: number;
  recipientName?: string;
  recipientPhone?: string;
  deliveryAddress?: string;
  orderNote?: string;
  paymentMethod?: 'COD' | 'PAY_AT_COUNTER' | 'DEMO_ONLINE' | 'CASH' | 'VNPAY' | 'MOMO' | 'BANK_TRANSFER';
  createdAt: string;
}

export interface PaymentRecord {
  _id: string;
  order: string;
  paymentMethod: 'CASH' | 'VNPAY' | 'MOMO' | 'BANK_TRANSFER' | 'DEMO_ONLINE';
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  transactionCode?: string;
  paidAt?: string;
  paymentNote?: string;
}
