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
  finalAmount: number;
  recipientName?: string;
  recipientPhone?: string;
  deliveryAddress?: string;
  orderNote?: string;
  paymentMethod?: 'COD' | 'PAY_AT_COUNTER';
  createdAt: string;
}
