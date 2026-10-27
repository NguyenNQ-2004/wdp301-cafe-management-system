import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { formatVnd, shopApi } from '../lib/shopApi';
import useAuthStore from '../store/authStore';
import type { OrderRecord, PaymentRecord } from '../types/shop';

interface PaymentDetails {
  order: Pick<OrderRecord, '_id' | 'orderCode' | 'finalAmount' | 'orderType' | 'status' | 'paymentMethod'>;
  payment: PaymentRecord;
  demoEnabled: boolean;
}

export default function PaymentPage({ onRequestAuth }: { onRequestAuth: () => void }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const user = useAuthStore((state) => state.user);
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [qrImage, setQrImage] = useState('');

  useEffect(() => {
    if (!user || !orderId) { setDetails(null); return; }
    let active = true;
    setDetails(null);
    setLoading(true);
    setError('');
    shopApi<PaymentDetails>(`/api/payments/order/${encodeURIComponent(orderId)}`, { token: user.token })
      .then((result) => { if (active) { setDetails(result); setError(''); } })
      .catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, orderId]);

  useEffect(() => {
    if (details?.payment.paymentMethod !== 'DEMO_ONLINE') { setQrImage(''); return; }
    let active = true;
    const url = new URL('/payment', window.location.origin);
    url.searchParams.set('orderId', details.order._id);
    QRCode.toDataURL(url.toString(), { width: 192, margin: 2, errorCorrectionLevel: 'M' })
      .then((image) => { if (active) setQrImage(image); })
      .catch(() => { if (active) setQrImage(''); });
    return () => { active = false; };
  }, [details?.order._id, details?.payment.paymentMethod]);

  const confirmDemo = async () => {
    if (!user || !details || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await shopApi<{ payment: PaymentRecord }>(`/api/payments/${details.payment._id}/demo-confirm`, { method: 'POST', token: user.token });
      setDetails((current) => current ? { ...current, payment: result.payment } : current);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="min-h-[calc(100vh-5rem)] bg-[#fafafa] px-5 py-10">
    <div className="mx-auto max-w-xl rounded-xl border border-blue-100 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-950">Thanh toán đơn hàng</h1>
      {!user ? <div className="mt-5"><p className="text-slate-600">Đăng nhập để xem giao dịch của bạn.</p><button onClick={onRequestAuth} className="mt-4 rounded-lg bg-primary px-4 py-2 text-white font-semibold">Đăng nhập</button></div>
        : !orderId ? <p className="mt-5 text-slate-600">Chưa chọn đơn hàng. Bạn có thể mở đơn từ trang đơn hàng của tôi.</p>
          : loading || (!details && !error) ? <p className="mt-5 text-slate-600">Đang tải giao dịch...</p>
            : details && <>
              <p className="mt-2 text-sm text-slate-600">Mã đơn <strong>#{details.order.orderCode}</strong></p>
              <div className="mt-6 rounded-lg bg-blue-50 p-4"><span className="text-sm text-slate-600">Số tiền đơn hàng</span><strong className="mt-1 block text-3xl text-primary">{formatVnd(details.order.finalAmount)}</strong></div>
              <div className="mt-5 flex items-center justify-between gap-4 text-sm"><span>Trạng thái giao dịch</span><strong className={details.payment.status === 'SUCCESS' ? 'text-emerald-700' : 'text-amber-700'}>{details.payment.status === 'SUCCESS' ? 'Đã xác nhận mô phỏng' : details.payment.status === 'PENDING' ? 'Chờ thanh toán' : 'Thất bại'}</strong></div>
              {details.payment.paymentMethod === 'DEMO_ONLINE' && <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm"><p>Kênh thử nghiệm: <strong>{details.payment.demoProvider === 'MOMO' ? 'MoMo' : details.payment.demoProvider === 'VNPAY' ? 'VNPay' : details.payment.demoProvider === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Thanh toán online'}</strong></p><p className="mt-2">Mã thanh toán: <strong className="font-mono">{details.order.orderCode}</strong></p></div>}
              {details.payment.paymentMethod === 'DEMO_ONLINE' && details.payment.status === 'PENDING' && details.demoEnabled && details.order.status !== 'CANCELLED' && qrImage && <div className="mt-5 text-center"><img src={qrImage} alt="QR mở trang xác nhận thanh toán mô phỏng" width={192} height={192} className="mx-auto rounded-lg border border-blue-100" /><p className="mt-2 text-xs text-slate-600">QR mở trang xác nhận thử nghiệm của Aura Café; không phải mã QR của ngân hàng hay ví điện tử.</p></div>}
              {details.payment.transactionCode && <p className="mt-2 text-xs text-slate-500">Mã giao dịch: {details.payment.transactionCode}</p>}
              {details.payment.paymentMethod === 'DEMO_ONLINE' && <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><strong>Chế độ bài tập:</strong> Thao tác dưới đây chỉ cập nhật trạng thái thử nghiệm. Không kết nối ngân hàng và không thu tiền thật.</p>}
              {details.payment.paymentMethod === 'DEMO_ONLINE' && details.payment.status === 'PENDING' && details.demoEnabled && details.order.status !== 'CANCELLED' && <button disabled={submitting} onClick={confirmDemo} className="mt-5 w-full rounded-lg bg-primary px-5 py-3 font-bold text-white disabled:opacity-50">{submitting ? 'Đang xác nhận...' : 'Xác nhận thanh toán mô phỏng'}</button>}
              {details.payment.paymentMethod === 'DEMO_ONLINE' && !details.demoEnabled && details.payment.status === 'PENDING' && <p className="mt-4 text-sm text-amber-700">Chế độ thanh toán mô phỏng hiện đã tắt.</p>}
            </>}
      {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button onClick={() => navigate('/orders')} className="mt-6 w-full rounded-lg border border-blue-100 px-5 py-3 font-semibold text-primary">Xem đơn hàng của tôi</button>
    </div>
  </div>;
}
