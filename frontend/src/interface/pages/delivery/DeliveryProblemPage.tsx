import { useState } from 'react';
import type { FormEvent } from 'react';
import type { PageRoute } from '../../types';
import { DeliverySidebar } from './DeliverySidebar';
import { useDb } from '../../data/DbContext';
import { fmtMoney, paymentOf } from '../../data/dbUtils';

const REASONS = [
  ['UNREACHABLE', 'Không liên lạc được khách'], ['BAD_ADDRESS', 'Sai hoặc không tìm thấy địa chỉ'],
  ['REFUSED', 'Khách từ chối nhận'], ['DAMAGED', 'Hàng bị đổ vỡ hoặc hư hỏng'],
  ['DELAY', 'Kẹt xe, thời tiết hoặc giao trễ'], ['OTHER', 'Khác']
];
const OUTCOMES = { REPORT: 'Ghi nhận sự cố, giữ nguyên đơn', RETURN: 'Trả về quán để giao lại', CANCEL: 'Giao thất bại, hủy đơn chưa thanh toán' };

export function DeliveryProblemPage({ onNavigate, onShowToast }: { onNavigate: (route: PageRoute) => void; onShowToast?: (message: string) => void }) {
  const { db, session, reportDeliveryIssue, deliveryIssues = [], busy } = useDb();
  const myOrders = db.orders.filter(o => o.shipper_id === session.shipperId && !['COMPLETED', 'CANCELLED'].includes(o.status));
  const [orderId, setOrderId] = useState<number | ''>(myOrders[0]?.id ?? '');
  const [issueType, setIssueType] = useState('UNREACHABLE');
  const [description, setDescription] = useState('');
  const [outcome, setOutcome] = useState<'REPORT' | 'RETURN' | 'CANCEL'>('REPORT');
  const order = myOrders.find(o => o.id === orderId);
  const paid = order && paymentOf(db, order.id)?.status === 'SUCCESS';
  const canReturn = order && ['READY', 'DELIVERING'].includes(order.status);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!order || busy) return;
    if (await reportDeliveryIssue(order.id, { issueType, description: description.trim(), outcome })) {
      onShowToast?.(`Đã lưu sự cố của đơn ${order.order_code}.`);
      setDescription(''); setOutcome('REPORT');
    }
  };
  const input = 'mt-2 w-full rounded-xl border border-stone-300 bg-white p-3 text-sm';
  return <div className="min-h-screen bg-stone-50 flex flex-col lg:flex-row">
    <DeliverySidebar currentRoute="delivery-report" onNavigate={onNavigate} onShowToast={onShowToast} />
    <main className="flex-1 p-4 sm:p-6 space-y-5 max-w-7xl">
      <h1 className="text-2xl font-bold text-stone-900">Sự cố giao hàng</h1>
      <p className="text-sm text-stone-600">Mỗi báo cáo lưu loại sự cố, mô tả, người báo và thời điểm. Ghi chú của khách được giữ nguyên.</p>
      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={submit} className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4">
          <label className="block font-semibold">Đơn hàng gặp sự cố
            <select required value={orderId} onChange={e => { setOrderId(Number(e.target.value)); setOutcome('REPORT'); }} className={input}>
              <option value="">Chọn đơn được phân công</option>
              {myOrders.map(o => <option key={o.id} value={o.id}>{o.order_code} · {o.recipient_name}</option>)}
            </select>
          </label>
          {order && <p className="text-sm text-stone-600">{order.delivery_address} · {fmtMoney(order.final_amount)} · {paid ? 'Đã thanh toán' : 'Chưa thu tiền'}</p>}
          <label className="block font-semibold">Loại sự cố
            <select value={issueType} onChange={e => setIssueType(e.target.value)} className={input}>{REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </label>
          <label className="block font-semibold">Mô tả sự cố
            <textarea required maxLength={500} rows={4} value={description} onChange={e => setDescription(e.target.value)} className={input} placeholder="Mô tả tình trạng và các bước đã xử lý..." />
          </label>
          <label className="block font-semibold">Hướng xử lý
            <select value={outcome} onChange={e => setOutcome(e.target.value as typeof outcome)} className={input}>
              {Object.entries(OUTCOMES).map(([value, label]) => <option key={value} value={value} disabled={(value === 'CANCEL' && !!paid) || (value === 'RETURN' && !canReturn)}>{label}</option>)}
            </select>
            {paid && <span className="mt-2 block text-sm font-normal text-stone-600">Đơn đã thanh toán: lưu báo cáo để quản lý xác nhận hoàn tiền trước khi hủy.</span>}
          </label>
          <button disabled={!order || busy || !description.trim()} className="rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:opacity-50">Lưu báo cáo sự cố</button>
        </form>
        <section className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
          <h2 className="font-bold text-lg">Lịch sử sự cố ({deliveryIssues.length})</h2>
          {deliveryIssues.length === 0 && <p className="text-sm text-stone-500">Chưa có sự cố nào.</p>}
          {deliveryIssues.map(issue => <article key={issue._id} className="rounded-xl border border-stone-200 p-3 space-y-1 text-sm">
            <p className="font-bold">{issue.order?.orderCode || 'Đơn không còn tồn tại'} · {REASONS.find(([code]) => code === issue.issueType)?.[1] || issue.issueType}</p>
            <p className="whitespace-pre-wrap">{issue.description}</p>
            <p className="text-stone-500">{OUTCOMES[issue.outcome as keyof typeof OUTCOMES]} · {new Date(issue.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
          </article>)}
        </section>
      </div>
    </main>
  </div>;
}
