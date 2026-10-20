import React, { useState } from 'react';
import type { PageRoute } from '../../types';
import { DeliverySidebar } from './DeliverySidebar';
import { useDb } from '../../data/DbContext';
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  SCHEDULE_STATUS_LABEL,
  SHIFT_LABEL,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  paymentOf
} from '../../data/dbUtils';

interface DeliveryCodPageProps {
  onNavigate: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
}

const DENOMS = [500000, 200000, 100000, 50000, 20000, 10000];

export const DeliveryCodPage: React.FC<DeliveryCodPageProps> = ({ onNavigate, onShowToast }) => {
  const { db, session, remitCod, busy } = useDb();
  const me = session.shipperId;
  const schedules = db.work_schedules.filter(s => s.user_id === me).sort((a, b) => (a.work_date < b.work_date ? 1 : -1));
  const [scheduleId, setScheduleId] = useState<number | null>(
    schedules.find(s => s.status !== 'COMPLETED')?.id ?? schedules[0]?.id ?? null
  );
  const [denoms, setDenoms] = useState<Record<number, number>>({});
  const [note, setNote] = useState('');
  const schedule = schedules.find(s => s.id === scheduleId);

  // Đơn online mình giao trong ngày của ca
  const myOrders = db.orders
    .filter(o => o.order_type === 'ONLINE' && o.shipper_id === me && (!schedule || o.created_at.startsWith(schedule.work_date)))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const rows = myOrders.map(o => ({ o, pay: paymentOf(db, o.id) }));
  const codCollected = rows
    .filter(r => r.o.status === 'COMPLETED' && r.pay?.payment_method === 'CASH' && r.pay.status === 'SUCCESS')
    .reduce((s, r) => s + (r.pay?.amount ?? 0), 0);
  const prepaid = rows
    .filter(r => r.o.status === 'COMPLETED' && r.pay && r.pay.payment_method !== 'CASH' && r.pay.status === 'SUCCESS')
    .reduce((s, r) => s + (r.pay?.amount ?? 0), 0);
  const counted = DENOMS.reduce((s, d) => s + d * (denoms[d] ?? 0), 0);
  const isClosed = schedule?.status === 'COMPLETED';

  const handleRemit = async () => {
    if (!schedule) {
      onShowToast?.('Bạn chưa có lịch ca để ghi nhận nộp tiền.');
      return;
    }
    if (isClosed || busy) return;
    if (!Number.isSafeInteger(counted) || counted < 0 || note.trim().length > 300) {
      onShowToast?.('Số tiền hoặc ghi chú nộp COD không hợp lệ.');
      return;
    }
    if (!confirm(`Xác nhận nộp ${fmtMoney(counted)} và chốt ca giao hàng?`)) return;
    if (await remitCod(schedule.id, counted, note)) onShowToast?.(`Đã ghi nhận nộp ${fmtMoney(counted)} tiền COD và đóng ca giao hàng.`);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col lg:flex-row pb-12">
      <DeliverySidebar currentRoute="delivery-cod" onNavigate={onNavigate} onShowToast={onShowToast} />

      <main className="flex-1 p-4 sm:p-6 space-y-4 max-w-7xl">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Chốt ca giao hàng</span>
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight mt-1">Đối soát tiền thu hộ COD</h1>
              <p className="text-xs text-stone-500">Đối chiếu tiền mặt đã thu với payments, sau đó nộp và chốt ca (work_schedules).</p>
            </div>
            <select
              value={scheduleId ?? ''}
              onChange={e => setScheduleId(Number(e.target.value) || null)}
              className="h-10 px-3 rounded-xl border border-stone-300 text-xs bg-white"
            >
              {schedules.length === 0 && <option value="">Chưa có lịch ca</option>}
              {schedules.map(s => (
                <option key={s.id} value={s.id}>
                  {SHIFT_LABEL[s.shift_name]} {fmtDate(s.work_date)} - {SCHEDULE_STATUS_LABEL[s.status]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-3 border-t border-stone-100">
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Tiền COD đã thu</span>
              <span className="text-2xl font-black text-stone-900 font-mono mt-0.5 block">{fmtMoney(codCollected)}</span>
            </div>
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Khách đã trả online</span>
              <span className="text-2xl font-black text-stone-600 font-mono mt-0.5 block">{fmtMoney(prepaid)}</span>
            </div>
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Đơn đã giao</span>
              <span className="text-2xl font-black text-stone-900 font-mono mt-0.5 block">{rows.filter(r => r.o.status === 'COMPLETED').length}</span>
            </div>
            <div className="p-3.5 bg-primary text-white rounded-xl shadow-xs">
              <span className="text-[10px] uppercase font-bold text-white/80 block">Phải nộp về quán</span>
              <span className="text-2xl font-black text-white font-mono mt-0.5 block">{fmtMoney(codCollected)}</span>
              <span className="text-[11px] text-amber-200 font-semibold mt-1 block">
                {isClosed ? `✓ Đã nộp ${fmtMoney(schedule?.ending_cash_actual)}` : 'Chưa nộp'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
            <h3 className="font-bold text-sm text-stone-900">Đơn trong ca</h3>
            <div className="overflow-x-auto rounded-xl border border-stone-200 text-xs">
              <table className="w-full text-left">
                <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-bold border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-3">Mã đơn</th>
                    <th className="py-2.5 px-3">Người nhận</th>
                    <th className="py-2.5 px-3">Địa chỉ</th>
                    <th className="py-2.5 px-3">Thanh toán</th>
                    <th className="py-2.5 px-3 text-right">Số tiền</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái TT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-stone-400">Không có đơn trong ngày của ca này.</td>
                    </tr>
                  )}
                  {rows.map(({ o, pay }) => (
                    <tr key={o.id} className="hover:bg-stone-50">
                      <td className="py-2.5 px-3 font-bold text-primary font-mono">{o.order_code}</td>
                      <td className="py-2.5 px-3 font-semibold">{o.recipient_name}</td>
                      <td className="py-2.5 px-3 text-stone-500">{o.delivery_address}</td>
                      <td className="py-2.5 px-3">{pay ? PAYMENT_METHOD_LABEL[pay.payment_method] : '—'}</td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono">{fmtMoney(pay?.amount)}</td>
                      <td className="py-2.5 px-3 text-center text-[10px] font-bold">
                        {pay ? PAYMENT_STATUS_LABEL[pay.status] : '—'}
                        {pay?.paid_at && <span className="block text-stone-400 font-normal">{fmtDateTime(pay.paid_at)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4 text-xs">
            <h3 className="font-bold text-sm text-stone-900 pb-2 border-b border-stone-100">Kiểm đếm & nộp tiền</h3>
            <div className="space-y-1.5 font-mono">
              {DENOMS.map(d => (
                <div key={d} className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-200/60">
                  <span className="font-bold text-stone-900">{fmtMoney(d)}</span>
                  <input
                    type="number"
                    min={0}
                    value={denoms[d] ?? 0}
                    step={1}
                    max={100000}
                    disabled={isClosed || busy}
                    onChange={e => setDenoms({ ...denoms, [d]: Math.min(100000, Math.max(0, parseInt(e.target.value, 10) || 0)) })}
                    className="w-16 h-8 text-center rounded-lg bg-white border border-stone-300 font-bold"
                  />
                </div>
              ))}
            </div>
            <div className="p-3 bg-stone-100 rounded-xl flex justify-between items-center font-mono">
              <span className="font-sans font-bold text-stone-700">Tiền thực nộp:</span>
              <span className="text-lg font-black text-primary">{fmtMoney(counted)}</span>
            </div>
            {counted !== codCollected && (
              <p className="text-rose-700 font-semibold">Chênh lệch {fmtMoney(counted - codCollected)} so với tiền COD đã thu.</p>
            )}
            <textarea
              rows={2}
              value={note}
              maxLength={300}
              disabled={isClosed || busy}
              onChange={e => setNote(e.target.value)}
              placeholder="Ghi chú nộp tiền..."
              className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:border-primary resize-none"
            />
            <button
              type="button"
              onClick={handleRemit}
              disabled={isClosed || busy}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-container text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {isClosed ? 'Ca đã chốt' : 'NỘP TIỀN & CHỐT CA GIAO HÀNG'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
