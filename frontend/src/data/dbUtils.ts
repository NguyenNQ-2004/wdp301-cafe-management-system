import type { OrderStatus, OrderType } from '../types';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang pha chế',
  READY: 'Sẵn sàng phục vụ',
  DELIVERING: 'Đang giao hàng',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy'
};

export const ORDER_STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800 border border-amber-200',
  CONFIRMED: 'bg-sky-50 text-sky-800 border border-sky-200',
  PREPARING: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
  READY: 'bg-teal-50 text-teal-800 border border-teal-200',
  DELIVERING: 'bg-purple-50 text-purple-800 border border-purple-200',
  COMPLETED: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-800 border border-rose-200'
};

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  DINE_IN: 'Tại quán',
  TAKEAWAY: 'Mang về',
  ONLINE: 'Giao hàng'
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Tiền mặt',
  COD: 'Thu tiền khi nhận (COD)',
  PAY_AT_COUNTER: 'Tại quầy',
  VNPAY: 'VNPAY-QR',
  MOMO: 'Ví MoMo',
  BANK_TRANSFER: 'Chuyển khoản NH',
  DEMO_ONLINE: 'Online Demo'
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chưa thanh toán',
  SUCCESS: 'Đã thanh toán',
  FAILED: 'Thanh toán lỗi'
};

export const PAYMENT_STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  SUCCESS: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  FAILED: 'bg-rose-50 text-rose-700 border border-rose-200'
};

export const fmtDateTime = (d: string | Date | undefined | null): string => {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(d));
  } catch {
    return String(d);
  }
};

export const fmtMoney = (amount: number | undefined | null): string => {
  return `${(amount || 0).toLocaleString('vi-VN')}đ`;
};

export const describeCustomization = (customization: any): string => {
  if (!customization) return 'Mặc định';
  if (typeof customization === 'string') return customization;
  if (customization.size) return `Size: ${customization.size}`;
  const parts: string[] = [];
  for (const [key, val] of Object.entries(customization)) {
    if (val) parts.push(`${key}: ${val}`);
  }
  return parts.length > 0 ? parts.join(', ') : 'Mặc định';
};

export const orderCustomerName = (db: any, order: any): string => {
  if (!order) return 'Khách hàng';
  if (order.customer?.fullName) return order.customer.fullName;
  if (order.customer?.full_name) return order.customer.full_name;
  if (order.customer_id && db?.users) {
    const u = db.users.find((user: any) => user.id === order.customer_id || user._id === order.customer_id);
    if (u) return u.fullName || u.full_name || u.name;
  }
  if (order.recipient_name) return order.recipient_name;
  if (order.recipientName) return order.recipientName;
  return 'Khách vãng lai';
};

export const userName = (db: any, userId: any, fallback = 'Không rõ'): string => {
  if (!userId) return fallback;
  if (typeof userId === 'object' && (userId.fullName || userId.full_name)) {
    return userId.fullName || userId.full_name;
  }
  if (db?.users) {
    const u = db.users.find((user: any) => user.id === userId || user._id === userId);
    if (u) return u.fullName || u.full_name || u.name;
  }
  return fallback;
};

export const orderItemsOf = (db: any, orderId: any): any[] => {
  const order = db?.orders?.find((o: any) => o.id === orderId || o._id === orderId);
  if (order?.items && Array.isArray(order.items)) {
    return order.items.map((it: any, idx: number) => ({
      id: it._id || it.id || idx + 1,
      product_name_at_time: it.productNameAtTime || it.product_name_at_time || it.product?.name || 'Món',
      quantity: it.quantity || 1,
      unit_price: it.unitPrice || it.unit_price || 0,
      subtotal: it.subtotal || (it.unitPrice || 0) * (it.quantity || 1),
      customization: it.customization,
      is_prepared: it.isPrepared !== undefined ? it.isPrepared : it.is_prepared
    }));
  }
  if (db?.order_items && Array.isArray(db.order_items)) {
    return db.order_items.filter((it: any) => it.order_id === orderId || it.order === orderId);
  }
  return [];
};

export const paymentOf = (db: any, orderId: any): any => {
  const order = db?.orders?.find((o: any) => o.id === orderId || o._id === orderId);
  if (db?.payments && Array.isArray(db.payments)) {
    const p = db.payments.find((pay: any) => pay.order_id === orderId || pay.order === orderId || pay.order?._id === orderId);
    if (p) {
      return {
        payment_method: p.payment_method || p.paymentMethod || 'CASH',
        status: p.status || 'PENDING',
        amount: p.amount || order?.final_amount || order?.finalAmount || 0
      };
    }
  }
  if (order) {
    return {
      payment_method: order.payment_method || order.paymentMethod || 'CASH',
      status: order.status === 'COMPLETED' ? 'SUCCESS' : 'PENDING',
      amount: order.final_amount || order.finalAmount || 0
    };
  }
  return null;
};

export const productSizes = (p: any): [string, number][] => {
  if (!p) return [];
  const cfg = p.variants_config || p.variantsConfig;
  if (cfg?.sizes) {
    if (Array.isArray(cfg.sizes)) {
      return cfg.sizes.map((s: any) => [s.name || String(s), Number(s.delta || s.price || 0)]);
    }
    if (typeof cfg.sizes === 'object') {
      return Object.entries(cfg.sizes).map(([name, delta]) => [name, Number(delta) || 0]);
    }
  }
  return [['M', 0], ['L', 10000]];
};

export const productToppings = (p: any): { name: string; price: number }[] => {
  if (!p) return [];
  const cfg = p.variants_config || p.variantsConfig;
  if (cfg?.toppings && Array.isArray(cfg.toppings)) {
    return cfg.toppings.map((t: any) => ({
      name: typeof t === 'string' ? t : t.name,
      price: Number(t.price) || 0
    }));
  }
  return [];
};

export const productCost = (db: any, productId: any): number | null => {
  if (!db) return null;
  const pis = db.product_ingredients?.filter((pi: any) => pi.product_id === productId || pi.productId === productId);
  if (pis && pis.length > 0) {
    let total = 0;
    for (const item of pis) {
      const ing = db.ingredients?.find((i: any) => i.id === item.ingredient_id || i._id === item.ingredient_id);
      const unitCost = ing?.cost_per_unit || ing?.price || 5000;
      total += (Number(item.amount || item.quantity || 1) * unitCost);
    }
    return total > 0 ? total : null;
  }
  const prod = db.products?.find((p: any) => p.id === productId || p._id === productId);
  if (prod?.recipe && Array.isArray(prod.recipe) && prod.recipe.length > 0) {
    let total = 0;
    for (const r of prod.recipe) {
      const ingCost = r.ingredient?.costPrice || r.ingredient?.cost_per_unit || 5000;
      total += (Number(r.quantity || 1) * ingCost);
    }
    return total > 0 ? total : null;
  }
  return null;
};
