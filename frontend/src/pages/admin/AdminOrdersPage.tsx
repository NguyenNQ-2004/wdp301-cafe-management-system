import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { PageRoute } from '../../types';
import useAuthStore from '../../store/authStore';
import { shopApi } from '../../lib/shopApi';
import { AdminLayout, Badge, Modal, StatCard, inputCls } from './AdminUi';

type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERING'
  | 'COMPLETED'
  | 'CANCELLED';
type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'ONLINE';

interface OrderPerson {
  _id: string;
  fullName?: string;
  phone?: string;
}

interface OrderItem {
  productNameAtTime?: string;
  name?: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
  customization?: string[] | Record<string, string> | string;
}

interface Order {
  _id: string;
  orderCode?: string;
  createdAt?: string;
  orderType: OrderType;
  status: OrderStatus;
  customer?: OrderPerson | null;
  cashier?: OrderPerson | null;
  shipper?: OrderPerson | null;
  items: OrderItem[];
  totalAmount?: number;
  discountAmount?: number;
  deliveryFee?: number;
  finalAmount?: number;
  paymentMethod?: string;
  recipientName?: string;
  recipientPhone?: string;
  tableNumber?: string | number;
  orderNote?: string;
  cancelReason?: string;
}

interface Payment {
  order: string | { _id: string };
  paymentMethod?: string;
  status?: string;
}

interface Employee {
  _id: string;
  fullName: string;
  position: string;
  status: string;
}

interface AdminOrdersPageProps {
  onNavigate?: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
  onOpenBill?: (orderId: string | number) => void;
}

const STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DELIVERING',
  'COMPLETED',
  'CANCELLED'
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang pha chế',
  READY: 'Sẵn sàng',
  DELIVERING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy'
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  PREPARING: 'bg-indigo-50 text-indigo-700',
  READY: 'bg-cyan-50 text-cyan-700',
  DELIVERING: 'bg-violet-50 text-violet-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-rose-50 text-rose-700'
};

const TYPE_LABEL: Record<OrderType, string> = {
  DINE_IN: 'Tại quán',
  TAKEAWAY: 'Mang đi',
  ONLINE: 'Giao hàng'
};

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Tiền mặt',
  CARD: 'Thẻ',
  BANK_TRANSFER: 'Chuyển khoản',
  MOMO: 'Ví MoMo',
  COD: 'COD',
  PAY_AT_COUNTER: 'Thanh toán tại quầy',
  VNPAY: 'VNPAY',
  DEMO_ONLINE: 'Thanh toán online'
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  SUCCESS: 'Thành công',
  PENDING: 'Chờ thanh toán',
  FAILED: 'Thất bại',
  REFUNDED: 'Đã hoàn tiền'
};

const formatMoney = (amount = 0) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
const formatDate = (date?: string) => date
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date))
  : '—';
const personName = (person?: OrderPerson | null) => person?.fullName || '—';
const refId = (ref: Payment['order']) => typeof ref === 'string' ? ref : ref?._id;
const customizationText = (value?: OrderItem['customization']) => {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'string') return value;
  return value ? Object.entries(value).map(([key, item]) => `${key}: ${item}`).join(', ') : '';
};

const fetchOrdersPaymentsAndEmployees = async (token: string) => Promise.all([
  shopApi<Order[]>('/api/orders', { token }),
  shopApi<Payment[]>('/api/payments', { token }),
  shopApi<Employee[]>('/api/employees', { token })
]);

export const AdminOrdersPage: React.FC<AdminOrdersPageProps> = ({
  onNavigate = () => {},
  onShowToast,
  onOpenBill
}) => {
  const token = useAuthStore((state) => state.user?.token);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | OrderType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [billOrder, setBillOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refreshData = useCallback(async () => {
    if (!token) return false;
    try {
      const [loadedOrders, loadedPayments, loadedEmployees] = await fetchOrdersPaymentsAndEmployees(token);
      setOrders(loadedOrders);
      setPayments(loadedPayments);
      setEmployees(loadedEmployees);
      setError('');
      return true;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không thể tải dữ liệu đơn hàng.';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetchOrdersPaymentsAndEmployees(token)
      .then(([loadedOrders, loadedPayments, loadedEmployees]) => {
        if (!active) return;
        setOrders(loadedOrders);
        setPayments(loadedPayments);
        setEmployees(loadedEmployees);
        setError('');
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Không thể tải dữ liệu đơn hàng.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const paymentByOrder = useMemo(() => {
    const lookup = new Map<string, Payment>();
    payments.forEach((payment) => {
      const orderId = refId(payment.order);
      if (orderId) lookup.set(orderId, payment);
    });
    return lookup;
  }, [payments]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return [...orders]
      .filter((order) => typeFilter === 'all' || order.orderType === typeFilter)
      .filter((order) => statusFilter === 'all' || order.status === statusFilter)
      .filter((order) => {
        if (!query) return true;
        const values = [
          order.orderCode,
          order.customer?.fullName,
          order.customer?.phone,
          order.recipientName,
          order.recipientPhone
        ];
        return values.some((value) => value?.toLocaleLowerCase().includes(query));
      })
      .sort((first, second) => new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime());
  }, [orders, search, statusFilter, typeFilter]);

  const detail = orders.find((order) => order._id === detailId) || null;
  const shippers = employees.filter((employee) => employee.position === 'SHIPPER' && employee.status === 'ACTIVE');
  const completedOrders = orders.filter((order) => order.status === 'COMPLETED');
  const revenue = completedOrders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
  const activeOrders = orders.filter((order) => !['COMPLETED', 'CANCELLED'].includes(order.status)).length;

  const persistOrderUpdate = async (
    order: Order,
    changes: { status?: OrderStatus; cancelReason?: string; shipperId?: string }
  ) => {
    const status = changes.status || order.status;
    if (status === order.status && !changes.shipperId) return;
    let cancelReason: string | undefined;
    if (changes.status === 'CANCELLED') {
      const reason = window.prompt('Nhập lý do hủy đơn:');
      if (reason === null) return;
      cancelReason = reason.trim();
      if (!cancelReason) {
        setNotice('');
        setError('Vui lòng nhập lý do hủy đơn.');
        return;
      }
    }

    setUpdatingOrderId(order._id);
    setError('');
    setNotice('');
    try {
      await shopApi(`/api/orders/${encodeURIComponent(order._id)}/status`, {
        method: 'PUT',
        token: token || undefined,
        body: { ...changes, status, ...(cancelReason ? { cancelReason } : {}) }
      });
      setOrders((current) => current.map((item) => item._id === order._id
        ? {
          ...item,
          status,
          ...(cancelReason ? { cancelReason } : {}),
          ...(changes.shipperId ? { shipper: shippers.find((shipper) => shipper._id === changes.shipperId) || item.shipper } : {})
        }
        : item));
      const message = changes.shipperId
        ? `Đã gán shipper cho đơn ${order.orderCode || ''}.`
        : `Đã cập nhật đơn ${order.orderCode || ''} thành "${STATUS_LABEL[status]}".`;
      setNotice(message);
      if (onShowToast) onShowToast(message);
      const refreshed = await refreshData();
      if (!refreshed) {
        setNotice('');
        setError((message) => `Đơn đã cập nhật thành công nhưng không tải lại được danh sách. ${message}`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể cập nhật trạng thái đơn hàng.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const updateStatus = (order: Order, status: OrderStatus) => persistOrderUpdate(order, { status });
  const updateShipper = (order: Order, shipperId: string) => persistOrderUpdate(order, { shipperId });

  const openBill = (order: Order) => {
    if (onOpenBill) {
      onOpenBill(order._id);
      return;
    }
    setBillOrder(order);
  };

  const paymentInfo = (order: Order) => paymentByOrder.get(order._id);
  const paymentMethod = (order: Order) => paymentInfo(order)?.paymentMethod || order.paymentMethod || '';
  const paymentStatus = (order: Order) => paymentInfo(order)?.status || '';
  const customerName = (order: Order) => order.customer?.fullName || order.recipientName || 'Khách tại quán';
  const orderPhone = (order: Order) => order.customer?.phone || order.recipientPhone || '—';

  return (
    <AdminLayout
      route="admin-orders"
      onNavigate={onNavigate}
      onShowToast={onShowToast}
      table="orders, payments"
      title="Quản lý đơn hàng"
      subtitle="Toàn bộ đơn tại quán, mang đi và giao hàng."
      stats={
        <>
          <StatCard label="Tổng đơn" value={orders.length} />
          <StatCard label="Đang xử lý" value={activeOrders} tone="primary" />
          <StatCard label="Đã hoàn thành" value={completedOrders.length} tone="success" />
          <StatCard label="Doanh thu hoàn tất" value={formatMoney(revenue)} tone="warning" />
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-lg">error</span>{error}</span>
            <button type="button" onClick={() => { setLoading(true); void refreshData(); }} className="font-bold underline underline-offset-2">Thử lại</button>
          </div>
        )}
        {notice && !error && (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>
        )}

        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-stone-400">search</span>
              <input
                className={`${inputCls} pl-10`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm mã đơn, tên hoặc số điện thoại khách..."
                aria-label="Tìm đơn hàng"
              />
            </label>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
              <select className={`${inputCls} w-full sm:w-auto sm:min-w-36`} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | OrderType)} aria-label="Lọc loại đơn">
                <option value="all">Tất cả loại đơn</option>
                {Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select className={`${inputCls} w-full sm:w-auto sm:min-w-40`} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | OrderStatus)} aria-label="Lọc trạng thái">
                <option value="all">Tất cả trạng thái</option>
                {STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => { setLoading(true); void refreshData(); }} disabled={loading} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-50">
              <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>refresh</span>
              Làm mới
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-[10px] uppercase tracking-wide text-stone-500">
                  <th className="px-3 py-3 font-bold">Mã đơn / Thời gian</th>
                  <th className="px-3 py-3 font-bold">Hình thức</th>
                  <th className="px-3 py-3 font-bold">Khách hàng</th>
                  <th className="px-3 py-3 font-bold">Thu ngân / Shipper</th>
                  <th className="px-3 py-3 text-right font-bold">Thành tiền</th>
                  <th className="px-3 py-3 font-bold">Thanh toán</th>
                  <th className="px-3 py-3 font-bold">Trạng thái</th>
                  <th className="px-3 py-3 text-center font-bold">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading && orders.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-14 text-center text-stone-500">Đang tải đơn hàng...</td></tr>
                ) : filteredOrders.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-14 text-center text-stone-500">
                    {orders.length === 0 ? 'Chưa có đơn hàng nào.' : 'Không tìm thấy đơn hàng phù hợp.'}
                  </td></tr>
                ) : filteredOrders.map((order) => {
                  const method = paymentMethod(order);
                  const paidStatus = paymentStatus(order);
                  return (
                    <tr key={order._id} className="transition-colors hover:bg-stone-50/80">
                      <td className="px-3 py-3.5">
                        <div className="font-bold text-[#800020]">{order.orderCode || order._id.slice(-7).toUpperCase()}</div>
                        <div className="mt-1 text-[10px] text-stone-500">{formatDate(order.createdAt)}</div>
                      </td>
                      <td className="px-3 py-3.5 text-stone-700">{TYPE_LABEL[order.orderType] || order.orderType}</td>
                      <td className="px-3 py-3.5">
                        <div className="font-semibold text-stone-800">{customerName(order)}</div>
                        <div className="mt-1 text-[10px] text-stone-500">{orderPhone(order)}</div>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="text-stone-700">{personName(order.cashier)}</div>
                        <div className="mt-1 text-[10px] text-stone-500">Giao: {personName(order.shipper)}</div>
                      </td>
                      <td className="px-3 py-3.5 text-right font-bold text-stone-900">{formatMoney(order.finalAmount)}</td>
                      <td className="px-3 py-3.5">
                        <div className="text-stone-700">{PAYMENT_LABEL[method] || method || '—'}</div>
                        <div className={`mt-1 text-[10px] ${paidStatus === 'SUCCESS' ? 'text-emerald-700' : paidStatus === 'FAILED' ? 'text-rose-700' : 'text-stone-500'}`}>
                          {PAYMENT_STATUS_LABEL[paidStatus] || (paidStatus ? paidStatus : 'Chưa có thanh toán')}
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge className={STATUS_STYLE[order.status]}>{STATUS_LABEL[order.status] || order.status}</Badge>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <button type="button" onClick={() => setDetailId(order._id)} className="rounded-lg p-1.5 text-stone-500 hover:bg-rose-50 hover:text-[#800020]" aria-label={`Xem chi tiết ${order.orderCode || 'đơn hàng'}`}>
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-right text-[11px] text-stone-500">Hiển thị {filteredOrders.length} / {orders.length} đơn hàng</div>
        </section>
      </div>

      {detail && (
        <Modal title={`Chi tiết đơn ${detail.orderCode || ''}`} onClose={() => setDetailId(null)} wide>
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-stone-50 p-3">
                <div className="text-[10px] font-bold uppercase text-stone-500">Khách hàng</div>
                <div className="mt-1 font-semibold text-stone-800">{customerName(detail)}</div>
                <div className="text-xs text-stone-500">{orderPhone(detail)}</div>
              </div>
              <div className="rounded-xl bg-stone-50 p-3">
                <div className="text-[10px] font-bold uppercase text-stone-500">Ngày tạo</div>
                <div className="mt-1 font-semibold text-stone-800">{formatDate(detail.createdAt)}</div>
                <div className="text-xs text-stone-500">{TYPE_LABEL[detail.orderType] || detail.orderType}{detail.tableNumber ? ` · Bàn ${detail.tableNumber}` : ''}</div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">Sản phẩm</h4>
              <div className="overflow-hidden rounded-xl border border-stone-200">
                <table className="w-full text-xs">
                  <thead className="bg-stone-50 text-stone-500"><tr><th className="px-3 py-2 text-left">Món</th><th className="px-3 py-2 text-center">SL</th><th className="px-3 py-2 text-right">Đơn giá</th><th className="px-3 py-2 text-right">Thành tiền</th></tr></thead>
                  <tbody className="divide-y divide-stone-100">
                    {(detail.items || []).map((item, index) => (
                      <tr key={`${item.productNameAtTime || item.name || 'item'}-${index}`}>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-stone-800">{item.productNameAtTime || item.name || 'Sản phẩm'}</div>
                          {customizationText(item.customization) && <div className="mt-0.5 text-[10px] text-stone-500">{customizationText(item.customization)}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-center">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-right">{formatMoney(item.unitPrice)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold">{formatMoney(item.subtotal ?? item.unitPrice * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-stone-100 pt-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <label htmlFor="order-status" className="block text-xs font-bold text-stone-700">Cập nhật trạng thái</label>
                <select
                  id="order-status"
                  className={`${inputCls} min-w-48`}
                  value={detail.status}
                  disabled={updatingOrderId === detail._id}
                  onChange={(event) => void updateStatus(detail, event.target.value as OrderStatus)}
                >
                  {STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
                </select>
                {detail.orderType === 'ONLINE' && (
                  <div className="space-y-2">
                    <label htmlFor="order-shipper" className="block text-xs font-bold text-stone-700">Nhân viên giao hàng</label>
                    <select
                      id="order-shipper"
                      className={`${inputCls} min-w-48`}
                      value={detail.shipper?._id || ''}
                      disabled={updatingOrderId === detail._id || shippers.length === 0}
                      onChange={(event) => {
                        if (event.target.value) void updateShipper(detail, event.target.value);
                      }}
                    >
                      <option value="">{shippers.length ? 'Chưa phân công' : 'Không có shipper đang hoạt động'}</option>
                      {shippers.map((shipper) => <option key={shipper._id} value={shipper._id}>{shipper.fullName}</option>)}
                    </select>
                  </div>
                )}
                {detail.cancelReason && <p className="max-w-sm text-[11px] text-rose-700">Lý do hủy: {detail.cancelReason}</p>}
              </div>
              <div className="w-full space-y-1.5 text-xs sm:max-w-xs">
                <div className="flex justify-between text-stone-500"><span>Tạm tính</span><span>{formatMoney(detail.totalAmount)}</span></div>
                {!!detail.discountAmount && <div className="flex justify-between text-stone-500"><span>Giảm giá</span><span>-{formatMoney(detail.discountAmount)}</span></div>}
                {!!detail.deliveryFee && <div className="flex justify-between text-stone-500"><span>Phí giao hàng</span><span>{formatMoney(detail.deliveryFee)}</span></div>}
                <div className="flex justify-between border-t border-stone-200 pt-2 text-sm font-bold text-[#800020]"><span>Tổng cộng</span><span>{formatMoney(detail.finalAmount)}</span></div>
              </div>
            </div>
            {detail.orderNote && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800"><strong>Ghi chú:</strong> {detail.orderNote}</p>}
            <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
              <button type="button" onClick={() => openBill(detail)} className="inline-flex items-center gap-1.5 rounded-xl bg-stone-100 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-200">
                <span className="material-symbols-outlined text-base">receipt_long</span>Hóa đơn
              </button>
              <button type="button" onClick={() => setDetailId(null)} className="rounded-xl bg-[#800020] px-4 py-2 text-xs font-bold text-white hover:bg-[#68001a]">Đóng</button>
            </div>
          </div>
        </Modal>
      )}

      {billOrder && (
        <Modal title="Hóa đơn" onClose={() => setBillOrder(null)}>
          <div className="mx-auto max-w-sm space-y-4 text-xs text-stone-700">
            <div className="text-center">
              <div className="text-lg font-black tracking-wide text-[#800020]">AURA CAFÉ</div>
              <div className="mt-1 text-[10px] text-stone-500">HÓA ĐƠN THANH TOÁN</div>
              <div className="mt-2 font-bold">{billOrder.orderCode || billOrder._id}</div>
              <div className="text-[10px] text-stone-500">{formatDate(billOrder.createdAt)}</div>
            </div>
            <div className="space-y-2 border-y border-dashed border-stone-300 py-3">
              {(billOrder.items || []).map((item, index) => (
                <div key={`bill-${index}`} className="flex justify-between gap-3">
                  <span>{item.productNameAtTime || item.name || 'Sản phẩm'} × {item.quantity}</span>
                  <span className="whitespace-nowrap font-semibold">{formatMoney(item.subtotal ?? item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-2 text-sm font-bold text-[#800020]"><span>TỔNG CỘNG</span><span>{formatMoney(billOrder.finalAmount)}</span></div>
            <div className="flex justify-end gap-2 border-t border-stone-100 pt-3">
              <button type="button" onClick={() => setBillOrder(null)} className="rounded-xl bg-stone-100 px-3.5 py-2 font-semibold hover:bg-stone-200">Đóng</button>
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-xl bg-[#800020] px-4 py-2 font-bold text-white hover:bg-[#68001a]">
                <span className="material-symbols-outlined text-base">print</span>In hóa đơn
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
};

export default AdminOrdersPage;
