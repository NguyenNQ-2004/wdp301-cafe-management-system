import React from 'react';
import type { PageRoute } from '../types';
import { useDb } from '../data/DbContext';
import {
  ORDER_STATUS_LABEL,
  ORDER_TYPE_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  describeCustomization,
  fmtDateTime,
  fmtMoney,
  getSetting,
  orderCustomerName,
  orderItemsOf,
  paymentOf,
  userName
} from '../data/dbUtils';

interface BillPageProps {
  orderId: number | null;
  onSelectOrder: (orderId: number) => void;
  onNavigate: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
}

export const BillPage: React.FC<BillPageProps> = ({ orderId, onSelectOrder, onNavigate, onShowToast }) => {
  const { db } = useDb();
  const orders = [...db.orders].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const order = orderId === null ? orders[0] : db.orders.find(o => o.id === orderId);

  if (!order) {
    return <div role="status" className="p-10 text-center text-stone-500">{orderId === null ? 'Chưa có đơn hàng nào.' : 'Không tìm thấy đơn hàng hoặc bạn không có quyền xem hóa đơn này.'}</div>;
  }

  const items = orderItemsOf(db, order.id);
  const payment = paymentOf(db, order.id);
  const customer = order.customer_id ? db.users.find(u => u.id === order.customer_id) : null;

  return (
    <div className="min-h-screen bg-stone-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Top Control Bar */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('orders')}
              className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
              title="Quay lại danh sách đơn"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Screen 10 • Hóa đơn</span>
              <h1 className="text-lg font-black text-stone-900">Chi Tiết Hóa Đơn</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={order.id}
              onChange={e => onSelectOrder(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-semibold bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-primary"
            >
              {orders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.order_code} - {ORDER_TYPE_LABEL[o.order_type]} - {ORDER_STATUS_LABEL[o.status]}
                </option>
              ))}
            </select>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-primary text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-primary-container transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              In hóa đơn
            </button>
            <button
              onClick={() => {
                if (!navigator.clipboard?.writeText) {
                  onShowToast?.(`Mã đơn: ${order.order_code}`);
                  return;
                }
                navigator.clipboard.writeText(order.order_code)
                  .then(() => onShowToast?.(`Đã sao chép mã đơn ${order.order_code}`))
                  .catch(() => onShowToast?.(`Mã đơn: ${order.order_code}`));
              }}
              className="px-3.5 py-1.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-stone-200 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
              Mã đơn
            </button>
          </div>
        </div>

        {/* Printable Receipt */}
        <div id="bill-print" className="bg-white rounded-3xl border border-stone-300 shadow-lg p-6 sm:p-10 max-w-xl mx-auto font-sans relative overflow-hidden">
          <div className="text-center space-y-1.5 pb-6 border-b-2 border-dashed border-stone-200">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-primary text-white flex items-center justify-center font-black shadow-xs mb-2">
              <span className="material-symbols-outlined text-2xl">local_cafe</span>
            </div>
            <h2 className="text-2xl font-black text-stone-900 tracking-tight uppercase">{getSetting(db, 'store_name')}</h2>
            <p className="text-xs text-stone-500 font-medium">{getSetting(db, 'store_address')}</p>
            <p className="text-xs text-stone-500 font-mono">Hotline: {getSetting(db, 'store_hotline')}</p>
            <div className="inline-block mt-2 px-3 py-1 bg-stone-100 rounded-full text-xs font-bold text-stone-700 uppercase tracking-widest">
              Hóa đơn thanh toán
            </div>
          </div>

          {/* orders */}
          <div className="grid grid-cols-2 gap-2 text-xs py-5 border-b border-stone-100 text-stone-600">
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Mã đơn:</span>
              <strong className="text-stone-900 font-mono text-sm">{order.order_code}</strong>
            </div>
            <div className="text-right">
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Thời gian:</span>
              <strong className="text-stone-800 font-mono">{fmtDateTime(order.created_at)}</strong>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Khách hàng:</span>
              <span className="text-stone-800 font-semibold">{orderCustomerName(db, order)}</span>
              {(customer?.phone || order.recipient_phone) && (
                <span className="block font-mono text-[11px] text-stone-500">{customer?.phone ?? order.recipient_phone}</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Hình thức:</span>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                {ORDER_TYPE_LABEL[order.order_type]}
              </span>
              <span className="block text-[10px] text-stone-500 mt-0.5">{ORDER_STATUS_LABEL[order.status]}</span>
            </div>
            {order.table_number && (
              <div className="col-span-2 pt-1">
                <span className="text-stone-400 text-[10px] uppercase font-bold mr-2">Số bàn:</span>
                <strong className="text-primary font-bold text-xs">{order.table_number}</strong>
              </div>
            )}
            {order.delivery_address && (
              <div className="col-span-2 pt-1 text-[11px]">
                <span className="text-stone-400 text-[10px] uppercase font-bold block">Địa chỉ nhận hàng:</span>
                <span className="text-stone-700">
                  {order.recipient_name} • {order.recipient_phone} • {order.delivery_address}
                </span>
              </div>
            )}
            {order.order_note && (
              <div className="col-span-2 pt-1 text-[11px]">
                <span className="text-stone-400 text-[10px] uppercase font-bold mr-2">Ghi chú:</span>
                <span className="text-stone-700">{order.order_note}</span>
              </div>
            )}
            {order.cancel_reason && (
              <div className="col-span-2 pt-1 text-[11px] text-rose-700">
                <span className="text-[10px] uppercase font-bold mr-2">Lý do hủy:</span>
                <span>{order.cancel_reason}</span>
              </div>
            )}
            <div className="col-span-2 pt-2 border-t border-stone-50 flex justify-between text-[11px] text-stone-500">
              <span>
                Thu ngân: <strong>{userName(db, order.cashier_id, 'Đặt online')}</strong>
              </span>
              {order.shipper_id && (
                <span>
                  Shipper: <strong>{userName(db, order.shipper_id)}</strong>
                </span>
              )}
            </div>
          </div>

          {/* order_items */}
          <div className="py-4 border-b-2 border-dashed border-stone-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-stone-400 text-[10px] uppercase font-bold border-b border-stone-100">
                  <th className="text-left pb-2">Món / Tuỳ chọn</th>
                  <th className="text-center pb-2 w-10">SL</th>
                  <th className="text-right pb-2 w-20">Đơn giá</th>
                  <th className="text-right pb-2 w-24">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="py-2 pr-2">
                      <strong className="text-stone-900 block">{item.product_name_at_time}</strong>
                      <span className="text-[10px] text-stone-400">
                        {describeCustomization(item.customization)}
                        {item.customization?.note ? ` • ${item.customization.note}` : ''}
                      </span>
                    </td>
                    <td className="py-2 text-center font-mono font-bold text-stone-800">{item.quantity}</td>
                    <td className="py-2 text-right font-mono text-stone-600">{fmtMoney(item.unit_price)}</td>
                    <td className="py-2 text-right font-mono font-bold text-stone-900">{fmtMoney(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* total_amount / discount_amount / delivery_fee / final_amount */}
          <div className="py-4 border-b-2 border-dashed border-stone-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Tổng tiền món:</span>
              <span className="font-mono">{fmtMoney(order.total_amount)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Giảm giá:</span>
                <span className="font-mono">-{fmtMoney(order.discount_amount)}</span>
              </div>
            )}
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Phí giao hàng:</span>
                <span className="font-mono">+{fmtMoney(order.delivery_fee)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-stone-100 text-stone-900">
              <strong className="text-sm">TỔNG THANH TOÁN:</strong>
              <strong className="text-xl font-mono text-primary font-black">{fmtMoney(order.final_amount)}</strong>
            </div>
          </div>

          {/* payments */}
          <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
            <div className="space-y-1 text-center sm:text-left">
              {payment ? (
                <>
                  <p>
                    Phương thức: <strong className="text-stone-800">{PAYMENT_METHOD_LABEL[payment.payment_method]}</strong>
                  </p>
                  <p>
                    Trạng thái:{' '}
                    <strong className={payment.status === 'SUCCESS' ? 'text-emerald-700' : 'text-amber-700'}>
                      {PAYMENT_STATUS_LABEL[payment.status]}
                    </strong>
                    {payment.paid_at && <span> lúc {fmtDateTime(payment.paid_at)}</span>}
                  </p>
                  {payment.transaction_code && <p className="font-mono text-[11px]">Mã GD: {payment.transaction_code}</p>}
                </>
              ) : (
                <p>Chưa có thông tin thanh toán</p>
              )}
              <p className="text-[10px] text-stone-400 pt-1">Cảm ơn Quý khách!</p>
            </div>
            <div className="flex flex-col items-center shrink-0">
              <div className="w-20 h-20 bg-stone-50 border border-stone-200 rounded-xl p-1 flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${order.order_code}`}
                  alt="Bill QR"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[9px] font-mono text-stone-400 mt-1">{order.order_code}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
