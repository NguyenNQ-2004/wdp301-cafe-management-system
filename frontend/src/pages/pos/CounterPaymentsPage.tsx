import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatVnd, shopApi } from '../../lib/shopApi';
import useAuthStore from '../../store/authStore';
import type { PaymentRecord } from '../../types/shop';

interface CounterPayment extends Omit<PaymentRecord, 'order'> {
  order: {
    _id: string;
    orderCode: string;
    orderType: 'ONLINE' | 'TAKEAWAY' | 'DINE_IN';
    status: string;
    finalAmount: number;
    recipientName?: string;
    tableNumber?: string;
    customer?: { fullName: string; phone: string };
  } | null;
}

type CounterMethod = 'CASH' | 'BANK_TRANSFER' | 'MOMO' | 'VNPAY';
const methodLabels: Record<CounterMethod, string> = { CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản', MOMO: 'MoMo', VNPAY: 'VNPay' };

export default function CounterPaymentsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const highlightedOrderId = params.get('orderId');
  const requestedMethod = params.get('method');
  const user = useAuthStore((state) => state.user);
  const [payments, setPayments] = useState<CounterPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [method, setMethod] = useState<Record<string, CounterMethod>>({});
  const [reference, setReference] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await shopApi<CounterPayment[]>('/api/payments', { token: user.token });
      setPayments(result.filter((payment) => payment.order && ['TAKEAWAY', 'DINE_IN'].includes(payment.order.orderType)));
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const selected = payments.find((payment) => payment.order?._id === highlightedOrderId && payment.status === 'PENDING');
    if (selected && ['CASH', 'BANK_TRANSFER', 'MOMO', 'VNPAY'].includes(requestedMethod || '')) {
      setMethod((current) => ({ ...current, [selected._id]: requestedMethod as CounterMethod }));
    }
  }, [payments, highlightedOrderId, requestedMethod]);

  const confirm = async (payment: CounterPayment) => {
    if (!user || busyId) return;
    const selected = method[payment._id] || 'CASH';
    const code = (reference[payment._id] || '').trim();
    if (selected !== 'CASH' && !code) { setError('Nhập mã giao dịch đã đối chiếu trước khi xác nhận.'); return; }
    setBusyId(payment._id);
    setError('');
    setNotice('');
    try {
      const result = await shopApi<{ payment: PaymentRecord }>(`/api/payments/${payment._id}/counter-confirm`, {
        method: 'POST', token: user.token, body: { paymentMethod: selected, transactionCode: selected !== 'CASH' ? code : undefined }
      });
      setPayments((current) => current.map((item) => item._id === payment._id ? { ...item, ...result.payment, order: item.order } : item));
      setNotice(`Đã ghi nhận thanh toán đơn #${payment.order?.orderCode}.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const pending = payments.filter((payment) => payment.status === 'PENDING' && payment.order?.status !== 'CANCELLED').sort((a, b) => Number(b.order?._id === highlightedOrderId) - Number(a.order?._id === highlightedOrderId));
  const completed = payments.filter((payment) => payment.status === 'SUCCESS');

  return <div className="min-h-[calc(100vh-5rem)] bg-[#fafafa] px-5 py-10">
    <div className="mx-auto max-w-5xl">
      <button onClick={() => navigate('/cashier')} className="text-sm font-semibold text-primary">← Về trang thu ngân</button>
      <h1 className="mt-4 text-3xl font-bold text-slate-950">Thanh toán tại quầy</h1>
      <p className="mt-2 text-slate-600">Chỉ xác nhận sau khi đã nhận tiền mặt hoặc kiểm tra giao dịch trong tài khoản/ứng dụng nhận tiền. Chuyển khoản, MoMo và VNPay tại đây do thu ngân đối soát thủ công.</p>
      {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-lg bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
      <button onClick={() => void refresh()} disabled={loading} className="mt-5 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50">Làm mới danh sách</button>
      {loading ? <p className="mt-8 text-slate-600">Đang tải giao dịch...</p> : <>
        <h2 className="mt-8 text-xl font-bold">Chờ thu tiền ({pending.length})</h2>
        {pending.length === 0 && <p className="mt-4 rounded-xl border border-blue-100 bg-white p-5 text-slate-600">Không có đơn tại quầy đang chờ thanh toán.</p>}
        <div className="mt-4 space-y-4">{pending.map((payment) => <article key={payment._id} className={`rounded-xl border bg-white p-5 shadow-sm ${payment.order?._id === highlightedOrderId ? 'border-primary ring-2 ring-primary/20' : 'border-blue-100'}`}>
          <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold">#{payment.order?.orderCode}</h3><p className="mt-1 text-sm text-slate-600">{payment.order?.orderType === 'DINE_IN' ? `Tại bàn ${payment.order.tableNumber || '—'}` : 'Khách đến lấy'} · {payment.order?.recipientName || payment.order?.customer?.fullName || 'Khách tại quầy'}</p></div><strong className="text-xl text-primary">{formatVnd(payment.amount)}</strong></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-sm font-semibold">Hình thức đã nhận<select value={method[payment._id] || 'CASH'} onChange={(event) => setMethod((current) => ({ ...current, [payment._id]: event.target.value as CounterMethod }))} className="mt-1 block w-full rounded-lg border border-blue-100 p-2.5"><option value="CASH">Tiền mặt</option><option value="BANK_TRANSFER">Chuyển khoản</option><option value="MOMO">MoMo</option><option value="VNPAY">VNPay</option></select></label>
            {method[payment._id] !== undefined && method[payment._id] !== 'CASH' ? <label className="text-sm font-semibold">Mã giao dịch đã đối chiếu<input value={reference[payment._id] || ''} onChange={(event) => setReference((current) => ({ ...current, [payment._id]: event.target.value }))} maxLength={100} className="mt-1 block w-full rounded-lg border border-blue-100 p-2.5" /></label> : <div />}
            <button onClick={() => void confirm(payment)} disabled={!!busyId} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busyId === payment._id ? 'Đang xác nhận...' : 'Đã nhận đủ tiền'}</button>
          </div>
        </article>)}</div>
        <h2 className="mt-10 text-xl font-bold">Đã thanh toán ({completed.length})</h2>
        <div className="mt-4 space-y-2">{completed.map((payment) => <div key={payment._id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-blue-100 bg-white p-4"><span>#{payment.order?.orderCode} · {methodLabels[payment.paymentMethod as CounterMethod] || payment.paymentMethod}{payment.transactionCode ? ` · ${payment.transactionCode}` : ''}</span><strong>{formatVnd(payment.amount)}</strong></div>)}</div>
      </>}
    </div>
  </div>;
}
