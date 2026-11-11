import { NumberInput } from '../../components/NumberInput';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatVnd, shopApi } from '../../lib/shopApi';
import useAuthStore from '../../store/authStore';
import StaffWorkNav from '../../components/StaffWorkNav';
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

type CounterMethod = 'CASH' | 'BANK_TRANSFER';
type GatewayInfo = { bankName: string; accountNo: string; accountName: string; qrUrl: string };
const methodLabels: Record<CounterMethod, string> = { CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản' };

export default function CounterPaymentsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const highlightedOrderId = params.get('orderId');
  const user = useAuthStore((state) => state.user);
  const [payments, setPayments] = useState<CounterPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [gatewayInfo, setGatewayInfo] = useState<Record<string, GatewayInfo>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cashReceived, setCashReceived] = useState<Record<string, string>>({});

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

  const confirm = async (payment: CounterPayment) => {
    if (!user || busyId) return;
    const selected = payment.paymentMethod === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'CASH';
    const receivedAmount = cashReceived[payment._id] === undefined || cashReceived[payment._id] === '' ? payment.amount : Number(cashReceived[payment._id]);
    if (selected === 'CASH' && (!Number.isSafeInteger(receivedAmount) || receivedAmount < payment.amount)) {
      setError('Tiền khách đưa phải là số nguyên và không ít hơn tổng cần thanh toán.');
      return;
    }
    setBusyId(payment._id);
    setError('');
    setNotice('');
    try {
      if (selected === 'BANK_TRANSFER') {
        if (!payment.order || payment.paymentMethod !== 'BANK_TRANSFER') throw new Error('Đơn này chưa được tạo với phương thức chuyển khoản.');
        const info = await shopApi<GatewayInfo>(`/api/payments/order/${payment.order._id}/gateway`, { method: 'POST', token: user.token });
        setGatewayInfo((current) => ({ ...current, [payment._id]: info }));
        setNotice(`Đã tạo mã chuyển khoản cho đơn #${payment.order.orderCode}. Vui lòng chờ cổng thanh toán xác nhận rồi làm mới danh sách.`);
      } else {
        const result = await shopApi<{ payment: PaymentRecord }>(`/api/payments/${payment._id}/counter-confirm`, {
          method: 'POST', token: user.token, body: { paymentMethod: 'CASH', receivedAmount }
        });
        setPayments((current) => current.map((item) => item._id === payment._id ? { ...item, ...result.payment, order: item.order } : item));
        setNotice(`Đã ghi nhận tiền mặt cho đơn #${payment.order?.orderCode}.`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const pending = payments.filter((payment) => payment.status === 'PENDING' && payment.order?.status !== 'CANCELLED').sort((a, b) => Number(b.order?._id === highlightedOrderId) - Number(a.order?._id === highlightedOrderId));
  const completed = payments.filter((payment) => payment.status === 'SUCCESS');
  const refunded = payments.filter((payment) => payment.status === 'REFUNDED');

  return <>
    {user?.role === 'STAFF' && <StaffWorkNav showCounterPayments={['CASHIER', 'MANAGER'].includes(user.position || '')} />}
    <div className="min-h-[calc(100vh-5rem)] bg-[#fafafa] px-5 py-10">
      <div className="mx-auto max-w-5xl">
      {user?.role !== 'STAFF' && <button onClick={() => navigate('/cashier')} className="text-sm font-semibold text-primary">← Về trang thu ngân</button>}
      <h1 className="mt-4 text-3xl font-bold text-slate-950">Thanh toán tại quầy</h1>
      <p className="mt-2 text-slate-600">Tiền mặt do thu ngân xác nhận. Chuyển khoản chỉ hoàn tất khi cổng thanh toán gửi xác nhận có chữ ký; MoMo/VNPay tại quầy chưa được kết nối.</p>
      {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-lg bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
      <button onClick={() => void refresh()} disabled={loading} className="mt-5 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50">Làm mới danh sách</button>
      {loading ? <p className="mt-8 text-slate-600">Đang tải giao dịch...</p> : <>
        <h2 className="mt-8 text-xl font-bold">Chờ thu tiền ({pending.length})</h2>
        {pending.length === 0 && <p className="mt-4 rounded-xl border border-blue-100 bg-white p-5 text-slate-600">Không có đơn tại quầy đang chờ thanh toán.</p>}
        <div className="mt-4 space-y-4">{pending.map((payment) => <article key={payment._id} className={`rounded-xl border bg-white p-5 shadow-sm ${payment.order?._id === highlightedOrderId ? 'border-primary ring-2 ring-primary/20' : 'border-blue-100'}`}>
          <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold">#{payment.order?.orderCode}</h3><p className="mt-1 text-sm text-slate-600">{payment.order?.orderType === 'DINE_IN' ? `Tại bàn ${payment.order.tableNumber || '—'}` : 'Khách đến lấy'} · {payment.order?.recipientName || payment.order?.customer?.fullName || 'Khách tại quầy'}</p></div><strong className="text-xl text-primary">{formatVnd(payment.amount)}</strong></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="text-sm font-semibold">Hình thức thanh toán<div className="mt-1 rounded-lg border border-blue-100 p-2.5">{methodLabels[payment.paymentMethod as CounterMethod] || payment.paymentMethod}</div></label>
            <button onClick={() => void confirm(payment)} disabled={!!busyId} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busyId === payment._id ? 'Đang xử lý...' : payment.paymentMethod === 'BANK_TRANSFER' ? 'Hiện mã QR chuyển khoản' : 'Đã nhận đủ tiền mặt'}</button>
          </div>
          {payment.paymentMethod !== 'BANK_TRANSFER' && <label className="mt-3 block text-sm font-semibold">Tiền khách đưa
            <NumberInput type="number" min={payment.amount} step="1" inputMode="numeric" value={cashReceived[payment._id] ?? String(payment.amount)} onChange={(event) => setCashReceived(current => ({ ...current, [payment._id]: event.target.value }))} className="mt-1 block w-full max-w-xs rounded-lg border border-blue-100 p-2.5" />
            <span className="mt-1 block font-normal text-slate-600">Tiền thối lại: {formatVnd(Math.max(0, (Number(cashReceived[payment._id] ?? payment.amount) || 0) - payment.amount))}</span>
          </label>}
          {gatewayInfo[payment._id] && payment.paymentMethod === 'BANK_TRANSFER' && <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-blue-50 p-4 text-sm"><img src={gatewayInfo[payment._id].qrUrl} alt={`Mã QR thanh toán đơn ${payment.order?.orderCode}`} className="h-40 w-40 bg-white object-contain" /><div><p><strong>Ngân hàng:</strong> {gatewayInfo[payment._id].bankName}</p><p><strong>Tài khoản:</strong> {gatewayInfo[payment._id].accountNo} · {gatewayInfo[payment._id].accountName}</p><p><strong>Nội dung:</strong> {payment.order?.orderCode}</p><p><strong>Mã đối soát:</strong> {payment.transactionCode}</p><p className="mt-2 text-blue-800">Thanh toán vẫn chờ xác nhận từ cổng.</p></div></div>}
        </article>)}</div>
        <h2 className="mt-10 text-xl font-bold">Đã thanh toán ({completed.length})</h2>
        <div className="mt-4 space-y-2">{completed.map((payment) => <div key={payment._id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-blue-100 bg-white p-4"><span>#{payment.order?.orderCode} · {methodLabels[payment.paymentMethod as CounterMethod] || payment.paymentMethod}{payment.transactionCode ? ` · ${payment.transactionCode}` : ''}</span><strong>{formatVnd(payment.amount)}</strong></div>)}</div>
        {refunded.length > 0 && <><h2 className="mt-10 text-xl font-bold">Đã hoàn tiền ({refunded.length})</h2><div className="mt-4 space-y-2">{refunded.map((payment) => <div key={payment._id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-amber-200 bg-white p-4"><span>#{payment.order?.orderCode} · {payment.refundMethod || payment.paymentMethod}{payment.refundReference ? ` · ${payment.refundReference}` : ''}</span><strong>{formatVnd(payment.refundAmount || payment.amount)}</strong></div>)}</div></>}
      </>}
      </div>
    </div>
  </>;
}
