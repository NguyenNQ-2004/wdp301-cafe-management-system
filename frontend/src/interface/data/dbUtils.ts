import type {
  DbState,
  InventoryRefType,
  InventoryTxType,
  Order,
  OrderCustomization,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  Product,
  PurchaseOrderStatus,
  ReviewStatus,
  ReviewType,
  ScheduleStatus,
  ShiftName,
  StaffPosition,
  UserRole,
  UserStatus
} from '../types';

// =====================================================
// Nhãn tiếng Việt cho các giá trị ENUM trong database
// =====================================================

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Quản trị',
  STAFF: 'Nhân viên',
  CUSTOMER: 'Khách hàng'
};

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  LOCKED: 'Đã khóa'
};

export const POSITION_LABEL: Record<StaffPosition, string> = {
  MANAGER: 'Quản lý',
  BARISTA: 'Pha chế',
  CASHIER: 'Thu ngân',
  SHIPPER: 'Giao hàng'
};

export const SHIFT_LABEL: Record<ShiftName, string> = {
  MORNING: 'Ca sáng',
  AFTERNOON: 'Ca chiều',
  EVENING: 'Ca tối'
};

export const SHIFT_SETTING_KEY: Record<ShiftName, string> = {
  MORNING: 'shift_morning',
  AFTERNOON: 'shift_afternoon',
  EVENING: 'shift_evening'
};

export const SCHEDULE_STATUS_LABEL: Record<ScheduleStatus, string> = {
  SCHEDULED: 'Đã xếp lịch',
  PRESENT: 'Có mặt',
  ABSENT: 'Vắng',
  COMPLETED: 'Hoàn thành'
};

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  DINE_IN: 'Tại quán',
  TAKEAWAY: 'Mang đi',
  ONLINE: 'Giao hàng (Online)'
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang pha chế',
  READY: 'Sẵn sàng',
  DELIVERING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy'
};

export const ORDER_STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: 'bg-stone-100 text-stone-700',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-amber-100 text-amber-900',
  READY: 'bg-emerald-100 text-emerald-800',
  DELIVERING: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-stone-200 text-stone-700',
  CANCELLED: 'bg-rose-100 text-rose-800'
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  VNPAY: 'VNPAY',
  MOMO: 'Ví MoMo',
  BANK_TRANSFER: 'Chuyển khoản'
};

export const PAYMENT_METHOD_ICON: Record<PaymentMethod, string> = {
  CASH: 'payments',
  VNPAY: 'qr_code_2',
  MOMO: 'account_balance_wallet',
  BANK_TRANSFER: 'account_balance'
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Chờ thanh toán',
  SUCCESS: 'Đã thanh toán',
  FAILED: 'Thất bại'
};

export const PAYMENT_STATUS_STYLE: Record<PaymentStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-900',
  SUCCESS: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-rose-100 text-rose-800'
};

export const REVIEW_TYPE_LABEL: Record<ReviewType, string> = {
  RATING: 'Đánh giá',
  COMPLAINT: 'Khiếu nại'
};

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  PENDING: 'Chờ xử lý',
  RESOLVED: 'Đã giải quyết',
  REJECTED: 'Từ chối'
};

export const REVIEW_STATUS_STYLE: Record<ReviewStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-900',
  RESOLVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-stone-200 text-stone-600'
};

export const PO_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Nháp / Đề xuất',
  ORDERED: 'Đã đặt hàng',
  RECEIVED: 'Đã nhập kho',
  CANCELLED: 'Đã hủy'
};

export const PO_STATUS_STYLE: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'bg-stone-100 text-stone-700',
  ORDERED: 'bg-blue-100 text-blue-800',
  RECEIVED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-rose-100 text-rose-800'
};

export const INV_TX_LABEL: Record<InventoryTxType, string> = {
  IN_PURCHASE: 'Nhập mua hàng',
  OUT_ORDER: 'Xuất theo đơn bán',
  ADJUSTMENT: 'Điều chỉnh tăng',
  SPOILAGE: 'Hao hụt / Hủy'
};

// IN_PURCHASE, ADJUSTMENT làm tăng tồn; OUT_ORDER, SPOILAGE làm giảm tồn
export const INV_TX_SIGN: Record<InventoryTxType, 1 | -1> = {
  IN_PURCHASE: 1,
  OUT_ORDER: -1,
  ADJUSTMENT: 1,
  SPOILAGE: -1
};

export const INV_REF_LABEL: Record<InventoryRefType, string> = {
  ORDER: 'Đơn hàng',
  PURCHASE_ORDER: 'Phiếu nhập',
  ADJUSTMENT: 'Điều chỉnh'
};

// =====================================================
// Định dạng
// =====================================================

export const fmtMoney = (n: number | null | undefined) =>
  `${new Intl.NumberFormat('vi-VN').format(Math.round(n ?? 0))}₫`;

export const fmtNumber = (n: number | null | undefined) => new Intl.NumberFormat('vi-VN').format(n ?? 0);

const pad = (n: number) => String(n).padStart(2, '0');

// 'YYYY-MM-DD HH:mm:ss' theo giờ máy, giống DATETIME của MySQL
export const nowSql = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const todaySql = () => nowSql().slice(0, 10);

// '2026-10-03 09:00:00' -> '03/10/2026 09:00'
export const fmtDateTime = (s: string | null | undefined) => {
  if (!s) return '—';
  const [date, time = ''] = s.split(' ');
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}${time ? ' ' + time.slice(0, 5) : ''}`;
};

export const fmtDate = (s: string | null | undefined) => (s ? fmtDateTime(s.slice(0, 10)) : '—');

export const fmtTime = (s: string | null | undefined) => (s ? s.slice(11, 16) : '--:--');

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

// =====================================================
// shop_settings
// =====================================================

export const getSetting = (db: DbState, key: string, fallback = '') =>
  db.shop_settings.find(s => s.setting_key === key)?.setting_value ?? fallback;

export const getSettingNumber = (db: DbState, key: string, fallback = 0) => {
  const v = Number(getSetting(db, key, String(fallback)));
  return Number.isFinite(v) ? v : fallback;
};

export const shiftTimeRange = (db: DbState, shift: ShiftName) => getSetting(db, SHIFT_SETTING_KEY[shift], '');

// =====================================================
// Sản phẩm, tuỳ chọn món
// =====================================================

export const productSizes = (p: Product) => Object.entries(p.variants_config?.sizes ?? {});

export const productToppings = (p: Product) => p.variants_config?.toppings ?? [];

export const defaultSize = (p: Product) => productSizes(p)[0]?.[0];

// Đơn giá = base_price + phụ thu size + tổng giá topping (giống order_items.unit_price)
export const calcUnitPrice = (p: Product, size: string | undefined, toppings: string[] = []) => {
  const sizeDelta = size ? p.variants_config?.sizes?.[size] ?? 0 : 0;
  const toppingSum = productToppings(p)
    .filter(t => toppings.includes(t.name))
    .reduce((sum, t) => sum + t.price, 0);
  return p.base_price + sizeDelta + toppingSum;
};

export const describeCustomization = (c: OrderCustomization | null | undefined) => {
  if (!c) return '';
  const parts: string[] = [];
  if (c.size) parts.push(`Size ${c.size}`);
  if (c.sugar) parts.push(`${c.sugar} đường`);
  if (c.ice) parts.push(c.ice);
  (c.topping ?? []).forEach(t => parts.push(`+${t}`));
  return parts.join(' • ');
};

export const customizationTags = (c: OrderCustomization | null | undefined) => {
  const desc = describeCustomization(c);
  return desc ? desc.split(' • ') : [];
};

// =====================================================
// Điểm thưởng (shop_settings: points_earn_unit, points_step, points_step_value)
// - Tích: 1 điểm cho mỗi points_earn_unit đồng (sau giảm giá, không tính phí ship), làm tròn xuống bội số points_step
// - Đổi: mỗi points_step điểm = points_step_value đồng
// =====================================================

export const calcEarnPoints = (db: DbState, amount: number) => {
  const unit = getSettingNumber(db, 'points_earn_unit', 1000) || 1000;
  const step = getSettingNumber(db, 'points_step', 10) || 1;
  return Math.floor(Math.floor(amount / unit) / step) * step;
};

export const pointsToMoney = (db: DbState, points: number) => {
  const step = getSettingNumber(db, 'points_step', 10) || 1;
  const stepValue = getSettingNumber(db, 'points_step_value', 2000);
  return Math.floor(points / step) * stepValue;
};

// Số điểm tối đa có thể đổi: không vượt điểm hiện có và không vượt giá trị đơn
export const maxRedeemPoints = (db: DbState, available: number, orderAmount: number) => {
  const step = getSettingNumber(db, 'points_step', 10) || 1;
  const stepValue = getSettingNumber(db, 'points_step_value', 2000) || 1;
  const byPoints = Math.floor(available / step);
  const byAmount = Math.floor(orderAmount / stepValue);
  return Math.max(0, Math.min(byPoints, byAmount)) * step;
};

// =====================================================
// Đơn hàng
// =====================================================

export const deliveryFeeFor = (db: DbState, orderType: OrderType, totalAmount: number) => {
  if (orderType !== 'ONLINE') return 0;
  const threshold = getSettingNumber(db, 'freeship_threshold', 0);
  if (threshold > 0 && totalAmount >= threshold) return 0;
  return getSettingNumber(db, 'delivery_fee', 0);
};

export const nextOrderCode = (db: DbState) => {
  const max = db.orders.reduce((m, o) => {
    const n = Number(o.order_code.replace(/\D/g, ''));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `AURA-${String(max + 1).padStart(3, '0')}`;
};

export const orderItemsOf = (db: DbState, orderId: number) => db.order_items.filter(i => i.order_id === orderId);

export const paymentOf = (db: DbState, orderId: number) =>
  [...db.payments].reverse().find(p => p.order_id === orderId);

export const userName = (db: DbState, userId: number | null | undefined, fallback = '—') =>
  userId ? db.users.find(u => u.id === userId)?.full_name ?? fallback : fallback;

export const orderCustomerName = (db: DbState, o: Order) =>
  o.customer_id ? userName(db, o.customer_id) : o.recipient_name || 'Khách vãng lai';

export const isActiveOrder = (o: Order) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED';

// =====================================================
// Kho: giá nhập gần nhất & giá vốn theo định mức (BOM)
// =====================================================

export const lastPurchasePrice = (db: DbState, ingredientId: number): number | null => {
  const items = db.purchase_order_items
    .filter(i => i.ingredient_id === ingredientId)
    .map(i => ({ item: i, po: db.purchase_orders.find(p => p.id === i.po_id) }))
    .filter(x => x.po && x.po.status !== 'CANCELLED')
    .sort((a, b) => (a.po!.created_at < b.po!.created_at ? 1 : -1));
  return items[0]?.item.unit_price ?? null;
};

// Giá vốn 1 phần sản phẩm. Trả về null nếu chưa có định mức hoặc nguyên liệu chưa có giá nhập.
export const productCost = (db: DbState, productId: number): number | null => {
  const bom = db.product_ingredients.filter(b => b.product_id === productId);
  if (bom.length === 0) return null;
  let total = 0;
  for (const b of bom) {
    const price = lastPurchasePrice(db, b.ingredient_id);
    if (price === null) return null;
    total += price * b.quantity_required;
  }
  return total;
};

export const isLowStock = (i: { current_stock: number; min_stock_level: number }) => i.current_stock <= i.min_stock_level;

export const poCode = (id: number) => `PO-${String(id).padStart(4, '0')}`;

export const userCode = (id: number) => `#${String(id).padStart(4, '0')}`;
