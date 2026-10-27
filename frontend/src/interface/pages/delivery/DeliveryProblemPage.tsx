import React, { useState } from 'react';
import type { PageRoute } from '../../types';
import { DeliverySidebar } from './DeliverySidebar';
import { useDb } from '../../data/DbContext';
import { ORDER_STATUS_LABEL, fmtDateTime, fmtMoney, getSetting, orderItemsOf, paymentOf, userName } from '../../data/dbUtils';

interface DeliveryProblemPageProps {
  onNavigate: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
}

const REASONS = [
  { id: 'Khách không nghe máy', desc: 'Đã gọi nhiều lần tại điểm giao' },
  { id: 'Khách từ chối nhận', desc: 'Khách đổi ý hoặc không muốn nhận hàng' },
  { id: 'Sai địa chỉ / không tìm thấy', desc: 'Địa chỉ không đúng hoặc ngoài khu vực giao' },
  { id: 'Hư hỏng / đổ vỡ', desc: 'Đồ uống bị đổ vỡ trong lúc giao' },
  { id: 'Xe hỏng / thời tiết xấu', desc: 'Không thể tiếp tục chuyến giao' }
];

const PROBLEM_TAG = '[Sự cố giao]';

export const DeliveryProblemPage: React.FC<DeliveryProblemPageProps> = ({ onNavigate, onShowToast }) => {
  const { db, session, saveDeliveryOrder, cancelOrder, busy } = useDb();
  const me = session.shipperId;
  const myOrders = db.orders.filter(o => o.shipper_id === me && (o.status === 'READY' || o.status === 'DELIVERING'));

  const [orderId, setOrderId] = useState<number | ''>(myOrders[0]?.id ?? '');
  const [reason, setReason] = useState(REASONS[0].id);
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState<'cancel' | 'return'>('return');

  const order = db.orders.find(o => o.id === orderId);
  const pay = order ? paymentOf(db, order.id) : undefined;

  // Lịch sử: đơn mình giao bị hủy do giao thất bại, hoặc đơn có ghi chú sự cố của mình
  const myName = userName(db, me);
  const history = db.orders
    .filter(
      o =>
        (o.shipper_id === me && o.status === 'CANCELLED') ||
        (o.order_note ?? '').includes(`${PROBLEM_TAG} ${myName}`)
    )
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) {
      onShowToast?.('Bạn không có đơn nào đang giao để báo sự cố.');
      return;
    }
    if (note.trim().length > 300) {
      onShowToast?.('Ghi chú sự cố không được quá 300 ký tự.');
      return;
    }
    const detail = `${reason}${note.trim() ? ` - ${note.trim()}` : ''}`;
    let saved = false;
    if (outcome === 'cancel') {
      saved = await cancelOrder(order.id, `Giao thất bại: ${detail}`);
      if (saved) onShowToast?.(`Đã báo giao thất bại và hủy đơn ${order.order_code}.`);
    } else {
      const orderNote = [order.order_note, `${PROBLEM_TAG} ${myName}: ${detail}`].filter(Boolean).join(' | ').slice(-500);
      saved = await saveDeliveryOrder(order.id, { status: 'READY', shipperId: null, orderNote });
      if (saved) onShowToast?.(`Đã trả đơn ${order.order_code} về quán để giao lại.`);
    }
    if (saved) { setNote(''); setOrderId(''); }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col lg:flex-row pb-12">
      <DeliverySidebar currentRoute="delivery-report" onNavigate={onNavigate} onShowToast={onShowToast} />

      <main className="flex-1 p-4 sm:p-6 space-y-4 max-w-7xl">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-xs text-primary font-bold">Báo cáo sự cố</span>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight mt-1">Sự cố giao hàng</h1>
            <p className="text-xs text-stone-500">Kết quả được ghi vào đơn hàng (cancel_reason hoặc order_note).</p>
          </div>
          <button
            onClick={() => onNavigate('delivery-orders')}
            className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1.5 border border-stone-200"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Quay lại đơn được giao
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-5 text-xs">
            <div>
              <label className="block font-bold text-sm text-stone-900 mb-1.5">1. Đơn hàng gặp sự cố</label>
              <select
                value={orderId}
                onChange={e => setOrderId(Number(e.target.value))}
                className="w-full h-11 px-3.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 focus:outline-none focus:border-primary"
              >
                {myOrders.length === 0 && <option value="">Không có đơn đang giao</option>}
                {myOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.order_code} - {o.recipient_name} - {o.delivery_address}
                  </option>
                ))}
              </select>
              {order && (
                <div className="mt-2.5 p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-stone-400 block text-[10px]">Món:</span>
                    <strong className="text-stone-800">
                      {orderItemsOf(db, order.id).map(i => `${i.quantity}x ${i.product_name_at_time}`).join(', ')}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-stone-400 block text-[10px]">Thanh toán:</span>
                    <strong className="text-primary font-mono">
                      {fmtMoney(order.final_amount)} {pay?.status === 'PENDING' ? '(COD chưa thu)' : ''}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block font-bold text-sm text-stone-900 mb-2">2. Nguyên nhân</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REASONS.map(r => (
                  <label
                    key={r.id}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                      reason === r.id ? 'bg-primary/5 border-primary text-primary font-bold' : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
                    }`}
                  >
                    <input type="radio" name="reason" checked={reason === r.id} onChange={() => setReason(r.id)} className="accent-primary w-4 h-4 mt-0.5" />
                    <div>
                      <span className="block leading-tight">{r.id}</span>
                      <span className="text-[10px] text-stone-500 font-normal block mt-0.5">{r.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-sm text-stone-900 mb-1.5">3. Mô tả thêm</label>
              <textarea
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="VD: Đã gọi 3 cuộc lúc 10:10, 10:15, 10:20 không ai nghe máy..."
                className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div>
              <label className="block font-bold text-sm text-stone-900 mb-2">4. Hướng xử lý</label>
              <div className="space-y-2">
                <label className="flex items-start gap-2 p-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer">
                  <input type="radio" checked={outcome === 'return'} onChange={() => setOutcome('return')} className="accent-primary w-4 h-4 mt-0.5" />
                  <span>
                    <strong className="block">Trả đơn về quán để giao lại</strong>
                    <span className="text-stone-500">Đơn về trạng thái "{ORDER_STATUS_LABEL.READY}", bỏ gán shipper, ghi chú sự cố vào order_note.</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 p-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer">
                  <input type="radio" checked={outcome === 'cancel'} onChange={() => setOutcome('cancel')} className="accent-primary w-4 h-4 mt-0.5" />
                  <span>
                    <strong className="block">Giao thất bại - hủy đơn</strong>
                    <span className="text-stone-500">Đơn chuyển "{ORDER_STATUS_LABEL.CANCELLED}", lý do lưu vào cancel_reason.</span>
                  </span>
                </label>
              </div>
            </div>

            <button disabled={busy}
              type="submit"
              className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-container text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              GỬI BÁO CÁO SỰ CỐ
            </button>
          </form>

          <div className="lg:col-span-5 space-y-4 text-xs">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
              <span className="font-bold text-sm text-stone-900 block pb-2 border-b border-stone-100">Lịch sử sự cố ({history.length})</span>
              {history.length === 0 && <p className="text-stone-400">Chưa có sự cố nào.</p>}
              {history.map(o => (
                <div key={o.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                  <div className="flex justify-between font-mono font-bold text-stone-900">
                    <span>{o.order_code}</span>
                    <span className="font-sans text-[10px] text-stone-500">{ORDER_STATUS_LABEL[o.status]}</span>
                  </div>
                  <p className="text-stone-600">{o.cancel_reason ?? o.order_note}</p>
                  <span className="text-[10px] text-stone-400">{fmtDateTime(o.created_at)}</span>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-br from-primary to-primary-container text-white p-5 rounded-2xl shadow-md flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-200 uppercase font-bold tracking-wider block">Hotline cửa hàng</span>
                <span className="font-mono font-bold text-base text-amber-300">{getSetting(db, 'store_hotline')}</span>
              </div>
              <a href={`tel:${getSetting(db, 'store_hotline').replace(/\s/g, '')}`} className="px-3 py-1.5 rounded-lg bg-white text-primary font-bold text-xs">
                GỌI NGAY
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
