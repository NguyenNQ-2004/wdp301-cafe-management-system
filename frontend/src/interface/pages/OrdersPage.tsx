import React, { useState } from 'react';
import type { PageRoute, Order, OrderStatus } from '../types';
import { useDb } from '../data/DbContext';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  ORDER_TYPE_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  describeCustomization,
  fmtDateTime,
  fmtMoney,
  isActiveOrder,
  orderItemsOf,
  paymentOf,
  userName
} from '../data/dbUtils';

interface OrdersPageProps {
  onNavigate: (route: PageRoute) => void;
  onReorder: (orderId: number) => void;
  onOpenBill: (orderId: number) => void;
  onOpenPayment: (orderId: number) => void;
  onShowToast?: (msg: string) => void;
}

type Tab = 'all' | 'processing' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';

const PROCESSING: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'];
const CANCEL_REASONS = [
  'Khách đổi ý / Thay đổi kế hoạch',
  'Thời gian chờ dự kiến quá lâu',
  'Đặt nhầm món / Nhầm địa chỉ giao',
  'Lý do khác'
];

// Các bước hiển thị tiến trình theo orders.status
const stepsFor = (o: Order): OrderStatus[] =>
  o.order_type === 'ONLINE'
    ? ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED']
    : ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];

const STEP_ICON: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'receipt_long',
  PREPARING: 'local_cafe',
  READY: 'notifications_active',
  DELIVERING: 'two_wheeler',
  COMPLETED: 'flag'
};

export const OrdersPage: React.FC<OrdersPageProps> = ({ onNavigate, onReorder, onOpenBill, onOpenPayment, onShowToast }) => {
  const { db, session, cancelOrder } = useDb();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [searchCode, setSearchCode] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);

  const myOrders = db.orders
    .filter(o => o.customer_id === session.customerId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const inTab = (o: Order, tab: Tab) =>
    tab === 'all' ? true : tab === 'processing' ? PROCESSING.includes(o.status) : o.status === tab;

  const filteredOrders = myOrders.filter(o => {
    const q = searchCode.trim().toLowerCase();
    return inTab(o, activeTab) && (q === '' || o.order_code.toLowerCase().includes(q));
  });

  const liveOrder = myOrders.find(isActiveOrder);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'all', label: 'Tất cả đơn' },
    { id: 'processing', label: 'Đang xử lý' },
    { id: 'DELIVERING', label: 'Đang giao hàng' },
    { id: 'COMPLETED', label: 'Hoàn thành' },
    { id: 'CANCELLED', label: 'Đã hủy' }
  ];

  const canCancel = (o: Order) => o.status === 'PENDING' || o.status === 'CONFIRMED';

  const renderItems = (o: Order) =>
    orderItemsOf(db, o.id).map(it => {
      const product = db.products.find(p => p.id === it.product_id);
      return (
        <div
          key={it.id}
          className="flex items-center justify-between p-space-sm rounded-lg bg-surface hover:bg-surface-container transition-colors border border-surface-container-high"
        >
          <div className="flex items-center gap-space-md">
            <img src={product?.image_url ?? ''} alt={it.product_name_at_time} className="w-12 h-12 rounded-lg object-cover bg-surface-container-high shrink-0" />
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">{it.product_name_at_time}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{describeCustomization(it.customization)}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-tabular-data text-tabular-data font-semibold text-on-surface block">{fmtMoney(it.subtotal)}</span>
            <span className="font-body-sm text-body-sm text-secondary">SL: {it.quantity}</span>
          </div>
        </div>
      );
    });

  return (
    <div className="flex flex-col w-full">
      <div className="w-full max-w-7xl mx-auto px-margin-lg py-space-xl flex flex-col gap-space-xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
          <div className="flex flex-col gap-space-xs">
            <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest font-semibold">Theo dõi đơn hàng</span>
            <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight font-bold">Đơn hàng của tôi</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {userName(db, session.customerId)} • {myOrders.length} đơn hàng
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">receipt_long</span>
            <input
              type="text"
              value={searchCode}
              onChange={e => setSearchCode(e.target.value)}
              placeholder="Tìm theo mã đơn AURA-..."
              className="w-full h-10 pl-9 pr-4 rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-secondary font-body-sm text-body-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border border-surface-container-high"
            />
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-space-xs overflow-x-auto pb-space-xs no-scrollbar">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-space-md py-2 rounded-lg font-label-md text-label-md flex items-center gap-space-xs shrink-0 shadow-sm cursor-pointer ${
                activeTab === t.id ? 'bg-primary text-white font-semibold' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
              }`}
            >
              <span>{t.label}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-black/10 text-current text-[10px] font-tabular-data">
                {myOrders.filter(o => inTab(o, t.id)).length}
              </span>
            </button>
          ))}
        </div>

        {/* Live Order Spotlight */}
        {liveOrder && (activeTab === 'all' || inTab(liveOrder, activeTab)) && (
          <div className="relative bg-surface-container-lowest rounded-xl shadow-md overflow-hidden flex flex-col border border-surface-container-high">
            <div className="bg-gradient-to-r from-primary-container via-primary to-primary-container p-space-md text-white flex flex-wrap items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px] text-white animate-pulse">skillet</span>
                </div>
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="font-headline-sm text-headline-sm font-bold tracking-wide">Đơn hàng {liveOrder.order_code}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white text-primary font-label-sm text-label-sm uppercase font-bold tracking-wider">
                      {ORDER_STATUS_LABEL[liveOrder.status]}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-primary-container">
                    {ORDER_TYPE_LABEL[liveOrder.order_type]} • Đặt lúc {fmtDateTime(liveOrder.created_at)}
                  </p>
                </div>
              </div>
              {liveOrder.shipper_id && (
                <span className="px-space-md py-1.5 rounded-lg bg-white/15 font-label-sm text-label-sm font-medium">
                  Shipper: {userName(db, liveOrder.shipper_id)}
                </span>
              )}
            </div>

            <div className="p-space-lg flex flex-col gap-space-xl">
              {/* Stepper */}
              <div className="flex flex-col gap-space-md bg-surface-container-low p-space-md rounded-xl border border-surface-container-high">
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Tiến trình đơn hàng</span>
                <div className="relative flex flex-col sm:flex-row justify-between gap-space-md sm:gap-0 pt-2 pb-1">
                  {(() => {
                    const steps = stepsFor(liveOrder);
                    const current = Math.max(0, steps.indexOf(liveOrder.status));
                    return steps.map((st, idx) => (
                      <div
                        key={st}
                        className={`relative z-10 flex sm:flex-col items-center gap-space-sm text-left sm:text-center flex-1 ${idx > current ? 'opacity-50' : ''}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            idx < current
                              ? 'bg-primary text-white'
                              : idx === current
                              ? 'bg-primary-container text-white ring-4 ring-primary-container/20'
                              : 'bg-surface-container text-secondary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">{idx < current ? 'done' : STEP_ICON[st]}</span>
                        </div>
                        <span className={`font-label-md text-label-md ${idx === current ? 'text-primary font-bold' : 'text-on-surface'}`}>
                          {ORDER_STATUS_LABEL[st]}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div className="flex flex-col gap-space-sm">
                <span className="font-label-lg text-label-lg text-on-surface font-semibold">Danh sách món</span>
                <div className="flex flex-col gap-space-xs">{renderItems(liveOrder)}</div>
                {liveOrder.order_note && (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Ghi chú: {liveOrder.order_note}</p>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-space-xs text-on-surface border-t border-surface-container-high gap-3">
                  <div>
                    <span className="font-body-md text-body-md text-on-surface-variant block">
                      Tổng thanh toán{liveOrder.delivery_fee > 0 ? ` (gồm phí ship ${fmtMoney(liveOrder.delivery_fee)})` : ''}:
                    </span>
                    <span className="font-headline-md text-headline-md font-tabular-data text-primary font-bold">
                      {fmtMoney(liveOrder.final_amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onOpenBill(liveOrder.id)}
                      className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                      <span>Xem hóa đơn</span>
                    </button>
                    {canCancel(liveOrder) && (
                      <button
                        type="button"
                        onClick={() => setCancelTarget(liveOrder)}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                        <span>Hủy đơn hàng</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order List */}
        <div className="flex flex-col gap-space-md">
          <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">Danh sách đơn hàng</h2>
          {filteredOrders.length === 0 && (
            <div className="p-space-lg bg-surface-container-lowest rounded-xl text-center text-on-surface-variant border border-surface-container-high">
              Không có đơn hàng nào.
            </div>
          )}
          {filteredOrders.map(o => {
            const items = orderItemsOf(db, o.id);
            const firstProduct = db.products.find(p => p.id === items[0]?.product_id);
            const payment = paymentOf(db, o.id);
            const earned = db.loyalty_transactions.find(l => l.order_id === o.id && l.transaction_type === 'EARN');
            return (
              <div
                key={o.id}
                className="bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md transition-shadow p-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-lg border border-surface-container-high"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-md flex-1">
                  {o.status === 'CANCELLED' ? (
                    <div className="w-16 h-16 rounded-xl bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[28px]">cancel</span>
                    </div>
                  ) : (
                    <img src={firstProduct?.image_url ?? ''} alt={o.order_code} className="w-16 h-16 rounded-xl object-cover bg-surface-container-high shrink-0" />
                  )}
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-space-xs">
                      <span className="font-headline-sm text-headline-sm font-bold text-on-surface">{o.order_code}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${ORDER_STATUS_STYLE[o.status]}`}>
                        {ORDER_STATUS_LABEL[o.status]}
                      </span>
                      <span className="font-tabular-data text-tabular-data text-on-surface-variant font-medium">
                        • {fmtDateTime(o.created_at)} • {ORDER_TYPE_LABEL[o.order_type]}
                      </span>
                    </div>
                    <p className={`font-body-md text-body-md ${o.status === 'CANCELLED' ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                      {items.map(i => `${i.quantity}x ${i.product_name_at_time}`).join(', ')}
                    </p>
                    {o.cancel_reason ? (
                      <div className="p-2 rounded-lg bg-surface-container-high text-body-sm text-on-surface-variant flex items-center gap-space-xs mt-1">
                        <span className="material-symbols-outlined text-[16px] text-secondary">info</span>
                        <span>Lý do hủy: {o.cancel_reason}</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-space-sm text-body-sm text-on-surface-variant">
                        {o.delivery_address && <span>Giao tới: {o.delivery_address}</span>}
                        {o.table_number && <span>Bàn {o.table_number}</span>}
                        {payment && (
                          <span>
                            • {PAYMENT_METHOD_LABEL[payment.payment_method]} ({PAYMENT_STATUS_LABEL[payment.status]})
                          </span>
                        )}
                        {earned && <span>• +{earned.points_change} điểm</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-space-sm shrink-0 pt-space-sm md:pt-0">
                  <div className="text-left md:text-right">
                    <span className="font-label-sm text-label-sm text-on-surface-variant block uppercase">Tổng tiền</span>
                    <span className="font-headline-md text-headline-md font-tabular-data font-bold text-primary">{fmtMoney(o.final_amount)}</span>
                  </div>
                  <div className="flex items-center gap-space-xs flex-wrap justify-end">
                    {o.payment_method === 'DEMO_ONLINE' && o.status !== 'CANCELLED' && <button type="button" onClick={() => onOpenPayment(o.id)} className="h-9 px-space-md rounded-lg bg-primary text-white font-label-md flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">qr_code_2</span>Xem thanh toán</button>}
                    <button
                      type="button"
                      onClick={() => onOpenBill(o.id)}
                      className="h-9 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors font-label-md text-label-md text-on-surface flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">receipt</span>
                      <span>Hóa đơn</span>
                    </button>
                    {o.status === 'COMPLETED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onNavigate('feedback')}
                          className="h-9 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors font-label-md text-label-md text-on-surface flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px] text-amber-600">rate_review</span>
                          <span>Đánh giá</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onReorder(o.id)}
                          className="h-9 px-space-md rounded-lg bg-primary-container hover:bg-primary transition-colors font-label-md text-label-md text-white flex items-center gap-1 cursor-pointer font-semibold shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">replay</span>
                          <span>Đặt lại</span>
                        </button>
                      </>
                    )}
                    {canCancel(o) && (
                      <button
                        type="button"
                        onClick={() => setCancelTarget(o)}
                        className="h-9 px-space-md rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-label-md text-label-md flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                        <span>Hủy</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancel Order Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">warning</span>
              </div>
              <div>
                <h3 className="font-bold text-base text-stone-900">Xác nhận hủy đơn hàng</h3>
                <span className="text-xs text-stone-500 font-mono">{cancelTarget.order_code}</span>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Chỉ hủy được khi quán chưa bắt đầu pha chế. Đơn đã thanh toán online sẽ được cửa hàng liên hệ hoàn tiền.
            </p>
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-stone-700 block">Lý do hủy đơn *</label>
              <select
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl outline-none focus:border-primary text-stone-800"
              >
                {CANCEL_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  cancelOrder(cancelTarget.id, cancelReason);
                  onShowToast?.(`Đã hủy đơn ${cancelTarget.order_code}.`);
                  setCancelTarget(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Xác nhận hủy đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
