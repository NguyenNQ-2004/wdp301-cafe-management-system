import React, { useState } from 'react';
import type { PageRoute, Order, OrderStatus } from '../../types';
import { PosHeader } from './PosHeader';
import CounterOrderEditor from './CounterOrderEditor';
import useAuthStore from '../../../store/authStore';
import { useDb } from '../../data/DbContext';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  ORDER_TYPE_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_STYLE,
  customizationTags,
  fmtDateTime,
  fmtMoney,
  fmtTime,
  nowSql,
  orderCustomerName,
  orderItemsOf,
  paymentOf,
  userName
} from '../../data/dbUtils';

interface PosOrdersPageProps {
  onNavigate: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
  onOpenBill?: (orderId: number) => void;
}

type StatusFilter = 'all' | OrderStatus;

export const PosOrdersPage: React.FC<PosOrdersPageProps> = ({ onNavigate, onShowToast, onOpenBill }) => {
  const { db, transact, setOrderStatus, cancelOrder } = useDb();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'DINE_IN' | 'TAKEAWAY'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const account = useAuthStore(state => state.user);
  const canEdit = account?.role === 'ADMIN' || (account?.role === 'STAFF' && ['CASHIER', 'MANAGER'].includes(account.position || ''));

  // Đơn phục vụ tại quầy: tại quán + mang đi (kể cả khách đặt online rồi đến lấy)
  const counterOrders = db.orders
    .filter(o => o.order_type === 'DINE_IN' || o.order_type === 'TAKEAWAY')
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const filteredOrders = counterOrders.filter(o => {
    const q = searchQuery.trim().toLowerCase();
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchType = typeFilter === 'all' || o.order_type === typeFilter;
    const customer = orderCustomerName(db, o).toLowerCase();
    const phone = o.customer_id ? db.users.find(u => u.id === o.customer_id)?.phone ?? '' : o.recipient_phone ?? '';
    const matchSearch =
      q === '' ||
      o.order_code.toLowerCase().includes(q) ||
      customer.includes(q) ||
      phone.includes(q) ||
      (o.table_number ?? '').toLowerCase().includes(q);
    return matchStatus && matchType && matchSearch;
  });

  const selected = filteredOrders.find(o => o.id === selectedId) ?? filteredOrders[0];

  const paidRevenue = counterOrders
    .filter(o => o.status !== 'CANCELLED' && paymentOf(db, o.id)?.status === 'SUCCESS')
    .reduce((s, o) => s + o.final_amount, 0);

  const handleComplete = (o: Order) => {
    const pay = paymentOf(db, o.id);
    if (pay && pay.status !== 'SUCCESS') {
      onShowToast?.(`Đơn ${o.order_code} chưa thanh toán. Hãy thu tiền trước khi trả đồ.`);
      return;
    }
    setOrderStatus(o.id, 'COMPLETED');
    onShowToast?.(`Đã trả đồ cho đơn ${o.order_code}.`);
  };

  const handleCollectPayment = (o: Order) => {
    const pay = paymentOf(db, o.id);
    if (!pay) return;
    transact(tx => tx.update('payments', pay.id, { status: 'SUCCESS', paid_at: nowSql() }));
    onShowToast?.(`Đã thu ${fmtMoney(pay.amount)} cho đơn ${o.order_code}.`);
  };

  const handleCancel = (o: Order) => {
    const reason = prompt(`Nhập lý do hủy đơn ${o.order_code}:`);
    if (reason && reason.trim()) {
      cancelOrder(o.id, reason.trim());
      onShowToast?.(`Đã hủy đơn ${o.order_code}.`);
    }
  };

  const statusTabs: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'CONFIRMED', label: ORDER_STATUS_LABEL.CONFIRMED },
    { id: 'PREPARING', label: ORDER_STATUS_LABEL.PREPARING },
    { id: 'READY', label: ORDER_STATUS_LABEL.READY },
    { id: 'COMPLETED', label: ORDER_STATUS_LABEL.COMPLETED },
    { id: 'CANCELLED', label: ORDER_STATUS_LABEL.CANCELLED }
  ];

  const isOpen = (o: Order) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED';

  return (
    <div className="min-h-screen bg-stone-50 pb-16 flex flex-col">
      {editingId !== null && db.orders.find(order => order.id === editingId) && <CounterOrderEditor order={db.orders.find(order => order.id === editingId)!} onClose={() => setEditingId(null)} />}
      <PosHeader currentRoute="pos-orders" onNavigate={onNavigate} onShowToast={onShowToast} />

      {/* Metrics */}
      <div className="w-full px-4 sm:px-6 py-4 bg-white shadow-2xs border-b border-stone-200 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">Screen 12 • Danh sách đơn tại quầy</span>
          <div className="flex items-baseline gap-2 mt-1">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900">Quản lý đơn tại quầy</h1>
            <span className="text-xs text-stone-500 font-mono">{counterOrders.length} đơn</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-stone-100 p-1.5 rounded-2xl">
          <div className="px-3 py-1.5 bg-white rounded-xl shadow-2xs">
            <span className="text-[10px] text-stone-500 block">{canEdit ? 'Đã thu' : 'Tổng đơn tại quầy'}</span>
            <span className="text-sm font-bold text-stone-900 font-mono">{canEdit ? fmtMoney(paidRevenue) : counterOrders.length}</span>
          </div>
          <div className="px-3 py-1.5 bg-white rounded-xl shadow-2xs">
            <span className="text-[10px] text-stone-500 block">Đang pha chế</span>
            <span className="text-sm font-bold text-amber-700 font-mono">
              {counterOrders.filter(o => o.status === 'CONFIRMED' || o.status === 'PREPARING').length} đơn
            </span>
          </div>
          <div className="px-3 py-1.5 bg-white rounded-xl shadow-2xs">
            <span className="text-[10px] text-stone-500 block">Sẵn sàng trả</span>
            <span className="text-sm font-bold text-emerald-600 font-mono">{counterOrders.filter(o => o.status === 'READY').length} đơn</span>
          </div>
          <div className="px-3 py-1.5 bg-white rounded-xl shadow-2xs">
            <span className="text-[10px] text-stone-500 block">Đã hủy</span>
            <span className="text-sm font-bold text-rose-700 font-mono">{counterOrders.filter(o => o.status === 'CANCELLED').length} đơn</span>
          </div>
        </div>
        {canEdit && <button
          onClick={() => onNavigate('pos-create')}
          className="h-10 px-4 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Tạo đơn mới</span>
        </button>}
      </div>

      {/* Filters */}
      <div className="w-full px-4 sm:px-6 py-2.5 bg-stone-100 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between border-b border-stone-200">
        <div className="relative flex-1 max-w-xl">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-stone-400">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã đơn, tên khách, số điện thoại, số bàn..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-white text-xs text-stone-900 placeholder:text-stone-400 border border-stone-200 focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 overflow-x-auto">
          {([
            { id: 'all', label: 'Tất cả hình thức' },
            { id: 'DINE_IN', label: ORDER_TYPE_LABEL.DINE_IN },
            { id: 'TAKEAWAY', label: ORDER_TYPE_LABEL.TAKEAWAY }
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                typeFilter === t.id ? 'bg-primary text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 bg-white border-b border-stone-200 flex items-center gap-2 overflow-x-auto py-2">
        {statusTabs.map(s => {
          const active = statusFilter === s.id;
          const count = s.id === 'all' ? counterOrders.length : counterOrders.filter(o => o.status === s.id).length;
          return (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                active ? 'bg-primary text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <span>{s.label}</span>
              <span className={`px-1.5 rounded text-[10px] font-mono ${active ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="w-full px-4 sm:px-6 py-4 flex flex-col xl:flex-row gap-5 items-start">
        {/* Table */}
        <div className="flex-1 w-full bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-[11px] uppercase font-bold tracking-wider border-b border-stone-200">
                  <th className="py-2.5 px-3.5">Mã đơn & Giờ</th>
                  <th className="py-2.5 px-3.5">Hình thức</th>
                  <th className="py-2.5 px-3.5">Khách hàng</th>
                  <th className="py-2.5 px-3.5">Món</th>
                  <th className="py-2.5 px-3.5 text-right">Thành tiền</th>
                  <th className="py-2.5 px-3.5 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400 text-xs">Không có đơn phù hợp.</td>
                  </tr>
                )}
                {filteredOrders.map(o => {
                  const pay = paymentOf(db, o.id);
                  return (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedId(o.id)}
                      className={`cursor-pointer transition-colors ${selected?.id === o.id ? 'bg-primary/5' : 'hover:bg-stone-50'}`}
                    >
                      <td className="py-3 px-3.5">
                        <span className="font-bold text-primary font-mono block">{o.order_code}</span>
                        <span className="text-[11px] text-stone-400 font-mono">{fmtTime(o.created_at)}</span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="inline-block px-2 py-0.5 rounded bg-stone-100 font-bold text-[10px] text-stone-700 mb-1">
                          {ORDER_TYPE_LABEL[o.order_type]}
                        </span>
                        {o.table_number && <p className="text-xs font-bold text-stone-800">Bàn {o.table_number}</p>}
                      </td>
                      <td className="py-3 px-3.5">
                        <p className="font-bold text-stone-900">{orderCustomerName(db, o)}</p>
                        {o.customer_id && (
                          <p className="text-[11px] text-amber-800">{db.users.find(u => u.id === o.customer_id)?.total_points} điểm</p>
                        )}
                      </td>
                      <td className="py-3 px-3.5 max-w-xs">
                        {orderItemsOf(db, o.id).map(it => (
                          <div key={it.id} className="truncate text-xs text-stone-700">
                            <strong className="text-primary">{it.quantity}x</strong> {it.product_name_at_time}
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <span className="font-bold font-mono text-stone-900 text-sm">{fmtMoney(o.final_amount)}</span>
                        {pay && (
                          <span className="block text-[10px] text-stone-400">
                            {PAYMENT_METHOD_LABEL[pay.payment_method]} • {PAYMENT_STATUS_LABEL[pay.status]}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${ORDER_STATUS_STYLE[o.status]}`}>
                          {ORDER_STATUS_LABEL[o.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail drawer */}
        {selected && (
          <div className="w-full xl:w-[420px] bg-white rounded-2xl border border-stone-200 shadow-md overflow-hidden flex flex-col shrink-0 xl:sticky xl:top-24">
            <div className="p-4 bg-stone-50 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900 font-mono">{selected.order_code}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ORDER_STATUS_STYLE[selected.status]}`}>
                  {ORDER_STATUS_LABEL[selected.status]}
                </span>
              </div>
              <span className="text-[11px] text-stone-500">
                {fmtDateTime(selected.created_at)} • Thu ngân: {userName(db, selected.cashier_id, 'Đặt online')}
              </span>
            </div>

            <div className="p-3.5 bg-stone-100/60 border-b border-stone-200 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-stone-900">{orderCustomerName(db, selected)}</p>
                <p className="text-[11px] text-stone-500">{ORDER_TYPE_LABEL[selected.order_type]}</p>
              </div>
              {selected.table_number && (
                <span className="px-2 py-0.5 rounded bg-white font-bold text-xs text-primary border border-stone-200">Bàn {selected.table_number}</span>
              )}
            </div>

            <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
              {orderItemsOf(db, selected.id).map(it => (
                <div key={it.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200/60 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono font-bold text-primary">{it.quantity}x</span>
                      <span className="font-bold text-xs sm:text-sm text-stone-900">{it.product_name_at_time}</span>
                    </div>
                    <span className={`text-[10px] font-bold ${it.is_prepared ? 'text-emerald-700' : 'text-stone-400'}`}>
                      {it.is_prepared ? 'Đã pha' : 'Chưa pha'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {customizationTags(it.customization).map((t, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-white text-[10px] text-stone-600 border border-stone-200">{t}</span>
                    ))}
                  </div>
                  {it.customization?.note && <p className="text-[11px] text-amber-900 italic">Ghi chú: {it.customization.note}</p>}
                </div>
              ))}
              {selected.order_note && <p className="text-[11px] text-stone-600">Ghi chú đơn: {selected.order_note}</p>}
              {selected.cancel_reason && <p className="text-[11px] text-rose-700">Lý do hủy: {selected.cancel_reason}</p>}
            </div>

            {(() => {
              const pay = paymentOf(db, selected.id);
              return (
                <div className="p-4 border-t border-stone-200 bg-white space-y-2 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Tổng tiền món / Giảm giá:</span>
                    <span className="font-mono">
                      {fmtMoney(selected.total_amount)} / -{fmtMoney(selected.discount_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Thành tiền:</span>
                    <span className="font-bold text-base text-primary font-mono">{fmtMoney(selected.final_amount)}</span>
                  </div>
                  {pay && (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-stone-500">{PAYMENT_METHOD_LABEL[pay.payment_method]}</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${PAYMENT_STATUS_STYLE[pay.status]}`}>{PAYMENT_STATUS_LABEL[pay.status]}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="p-4 bg-stone-100 border-t border-stone-200 grid grid-cols-2 gap-2 text-xs">
              {canEdit && ['PENDING', 'CONFIRMED', 'PREPARING'].includes(selected.status) && paymentOf(db, selected.id)?.status === 'PENDING' && !orderItemsOf(db, selected.id).some(item => item.is_prepared) && (
                <button onClick={() => setEditingId(selected.id)} className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2.5 font-bold text-primary hover:bg-stone-50">
                  <span className="material-symbols-outlined text-[18px]">edit</span>Sửa đơn
                </button>
              )}
              {canEdit && paymentOf(db, selected.id)?.status === 'PENDING' && isOpen(selected) && (
                <button
                  onClick={() => handleCollectPayment(selected)}
                  className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center gap-1.5 col-span-2"
                >
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  Thu tiền
                </button>
              )}
              {canEdit && selected.status === 'READY' && (
                <button
                  onClick={() => handleComplete(selected)}
                  className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 col-span-2"
                >
                  <span className="material-symbols-outlined text-[18px]">done_all</span>
                  Trả đồ cho khách
                </button>
              )}
              {canEdit && <button
                onClick={() => onOpenBill?.(selected.id)}
                className="py-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 font-bold flex items-center justify-center gap-1.5 border border-stone-200"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Hóa đơn
              </button>}
              {canEdit && (isOpen(selected) ? (
                <button
                  onClick={() => handleCancel(selected)}
                  className="py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium flex items-center justify-center gap-1 border border-rose-200"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  Hủy đơn
                </button>
              ) : (
                <span className="py-2.5 text-center text-stone-400">Đơn đã đóng</span>
              ))}
              {!canEdit && <button onClick={() => onNavigate('kds-terminal')} className="col-span-2 rounded-xl bg-primary py-2.5 font-bold text-white">Mở màn hình pha chế</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
