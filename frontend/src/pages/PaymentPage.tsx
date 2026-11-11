import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { formatVnd, shopApi } from '../lib/shopApi';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import type { OrderRecord, PaymentRecord } from '../types/shop';
import PaymentChoices, { type PaymentChoice } from './PaymentChoices';
import '../interface/storefront.css';
interface Details { order: OrderRecord; payment: PaymentRecord; demoEnabled: boolean; gateway?: { bankName: string; accountNo: string; accountName: string; qrUrl: string } | null }
export default function PaymentPage({ onRequestAuth }: { onRequestAuth: () => void }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const user = useAuthStore(state => state.user);
  const [details, setDetails] = useState<Details | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gatewayError, setGatewayError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentChoice | null>(null);
  const [revision, setRevision] = useState(0);
  const [copied, setCopied] = useState('');
  const requestBusy = useRef(false);
  useEffect(() => { setSelectedMethod(null); }, [orderId]);
  useEffect(() => {
    if (!user || !orderId) { setLoading(false); return; }
    let active = true;
    setLoading(true); setError('');
    shopApi<Details>(`/api/payments/order/${encodeURIComponent(orderId)}`, { token: user.token }).then(value => { if (active) setDetails(value); }).catch(failure => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.token, orderId, revision]);
  useEffect(() => {
    if (!user || !orderId || details?.demoEnabled || details?.order.paymentMethod !== 'BANK_TRANSFER' || details.payment.status !== 'PENDING' || details.order.status !== 'PENDING') return;
    let active = true; setGatewayError('');
    shopApi<NonNullable<Details['gateway']>>(`/api/payments/order/${encodeURIComponent(orderId)}/gateway`, { method: 'POST', token: user.token }).then(gateway => { if (active) setDetails(current => current ? { ...current, gateway } : current); }).catch(failure => { if (active) setGatewayError(failure.message); });
    return () => { active = false; };
  }, [user?.token, orderId, details?.order.paymentMethod, details?.payment.status, revision]);
  useEffect(() => {
    if (!user || !orderId || !details || details.payment.status !== 'PENDING' || details.order.status === 'CANCELLED') return;
    let active = true;
    const timer = window.setInterval(() => { shopApi<Details>(`/api/payments/order/${encodeURIComponent(orderId)}`, { token: user.token }).then(value => { if (active) setDetails(value); }).catch(() => {}); }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [user?.token, orderId, details?.payment.status, details?.order.status]);
  useEffect(() => {
    if (!details || !orderId) return;
    if (details.payment.status === 'SUCCESS' || (details.order.paymentMethod === 'COD' && details.order.status !== 'PENDING' && details.order.status !== 'CANCELLED')) {
      useCartStore.getState().setPointsToUse(0); useCartStore.getState().requestRefresh(); navigate('/bill?orderId=' + encodeURIComponent(orderId), { replace: true });
    }
  }, [details?.payment.status, details?.order.paymentMethod, details?.order.status, orderId, navigate]);
  const chooseCod = async () => {
    if (!user || !orderId || requestBusy.current) return;
    requestBusy.current = true; setBusy(true); setError('');
    try { await shopApi(`/api/payments/order/${encodeURIComponent(orderId)}/cod`, { method: 'POST', token: user.token }); useCartStore.getState().setPointsToUse(0); useCartStore.getState().requestRefresh(); navigate('/bill?orderId=' + encodeURIComponent(orderId)); }
    catch (failure) { setError((failure as Error).message); }
    finally { requestBusy.current = false; setBusy(false); }
  };
  const demo = async (provider: 'MOMO' | 'VNPAY' | 'BANK_TRANSFER') => {
    if (!user || !details || requestBusy.current) return;
    requestBusy.current = true; setBusy(true); setError('');
    try { await shopApi(`/api/payments/${details.payment._id}/demo-confirm`, { method: 'POST', token: user.token, body: { demoProvider: provider } }); setRevision(value => value + 1); }
    catch (failure) { setError((failure as Error).message); }
    finally { requestBusy.current = false; setBusy(false); }
  };
  const confirmSelected = () => {
    if (selectedMethod === 'COD') void chooseCod();
    else if (selectedMethod && details?.demoEnabled) void demo(selectedMethod);
    else if (selectedMethod === 'BANK_TRANSFER') setRevision(value => value + 1);
  };
  const copy = async (value: string, key: string) => { try { await navigator.clipboard.writeText(value); setCopied(key); } catch { setCopied('Không sao chép được. Hãy chọn và sao chép nội dung trực tiếp.'); } };
  const order = details?.order;
  return <div className="bg-[#f8fafc] px-3 py-6"><div className="mx-auto max-w-[1140px]">
    <div className="mx-auto mb-6 grid max-w-2xl grid-cols-3 text-center text-xs font-semibold text-primary">{['1. Giỏ hàng', '2. Xác nhận đơn & Giao hàng', '3. Thanh toán'].map((label, index) => <div key={label}><span className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-primary text-white">{index < 2 ? '✓' : '3'}</span>{label}</div>)}</div>
    {!user ? <div className="swp-store-empty"><p>Đăng nhập để xem giao dịch của bạn.</p><button onClick={onRequestAuth}>Đăng nhập</button></div> : !orderId ? <p className="swp-store-empty">Chưa chọn đơn hàng. <Link to="/orders">Xem đơn hàng của tôi</Link></p> : loading ? <p role="status" className="swp-store-empty">Đang tải giao dịch...</p> : order && <>
      <section className="swp-checkout-card"><h1 className="text-2xl font-bold">Chọn cách thanh toán cho đơn #{order.orderCode}</h1><p className="mt-2 text-sm text-stone-500">{order.status === 'CANCELLED' ? 'Đơn hàng đã hủy.' : 'Đơn đã được tạo và đang chờ bạn chọn: trả trước hoặc trả khi nhận hàng.'}</p></section>
      <div className="swp-checkout-grid items-start"><section className="swp-checkout-card"><h2>Phương thức thanh toán</h2>{!details.demoEnabled && <><div className="rounded-xl border border-red-200 bg-[#fffafa] p-4"><h3 className="font-bold">Quét mã VietQR / Chuyển khoản ngân hàng</h3><p className="mt-1 text-xs text-stone-500">Dùng được với mọi ứng dụng ngân hàng hỗ trợ VietQR.</p>{details.gateway ? <div className="mt-5 grid items-start gap-4 sm:grid-cols-[2fr_3fr]"><div><img src={details.gateway.qrUrl} alt={`Mã VietQR thanh toán đơn ${order.orderCode}`} className="w-full rounded-xl bg-white" /><p className="mt-2 text-center text-xs text-stone-500">Mở app ngân hàng để quét</p></div><div className="space-y-3">{[['Ngân hàng thụ hưởng', details.gateway.bankName], ['Số tài khoản', details.gateway.accountNo], ['Chủ tài khoản', details.gateway.accountName], ['Số tiền chính xác', String(order.finalAmount)], ['Nội dung chuyển khoản (bắt buộc)', order.orderCode]].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-2 rounded-lg border bg-white p-3"><div><p className="text-xs text-stone-500">{label}</p><strong className="break-all text-sm text-primary">{label === 'Số tiền chính xác' ? formatVnd(Number(value)) : value}</strong></div><button type="button" className="text-xs text-primary" onClick={() => void copy(value, label)}>{copied === label ? 'Đã chép' : 'Sao chép'}</button></div>)}</div></div> : <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Chuyển khoản QR chưa được cấu hình cho môi trường này. Bạn có thể chọn thanh toán khi nhận hàng bên dưới.</p>}</div>
        {gatewayError && details.gateway && <p role="alert" className="mt-4 text-sm text-red-700">{gatewayError}</p>}
        <h3 className="mb-2 mt-6 text-sm font-bold">Hướng dẫn thanh toán</h3><ol className="list-decimal space-y-2 pl-5 text-sm text-stone-500"><li>Mở ứng dụng ngân hàng và quét mã QR.</li><li>Kiểm tra đúng số tiền và nội dung chuyển khoản là mã đơn.</li><li>Hệ thống chỉ xác nhận khi nhận callback hợp lệ từ cổng thanh toán.</li></ol><button type="button" className="mt-5 text-sm font-semibold text-primary" onClick={() => setRevision(value => value + 1)}>Kiểm tra lại trạng thái</button>
        </>}
        <PaymentChoices
          demoEnabled={details.demoEnabled}
          canPay={details.payment.status === 'PENDING' && order.status === 'PENDING'}
          busy={busy}
          selected={selectedMethod}
          onSelect={setSelectedMethod}
        />
      </section><aside><section className="swp-checkout-card"><div className="mb-4 flex justify-between border-b pb-4"><div><strong className="text-primary">Aura Café</strong><p className="text-xs text-stone-500">TÓM TẮT ĐƠN HÀNG</p></div><strong className="text-xs text-primary">#{order.orderCode}</strong></div><dl className="mb-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-stone-400">Thời gian đặt</dt><dd className="mt-1 font-semibold">{new Date(order.createdAt).toLocaleString('vi-VN')}</dd></div><div><dt className="text-stone-400">Hình thức nhận</dt><dd className="mt-1 font-semibold">Giao tận nơi</dd></div><div><dt className="text-stone-400">Khách hàng</dt><dd className="mt-1 font-semibold">{order.recipientName}</dd></div><div><dt className="text-stone-400">Số điện thoại</dt><dd className="mt-1 font-semibold">{order.recipientPhone}</dd></div><div className="col-span-2"><dt className="text-stone-400">Địa chỉ giao hàng</dt><dd className="mt-1 font-semibold">{order.deliveryAddress}</dd></div></dl><div className="border-y py-3">{order.items.map((item, index) => <p className="flex justify-between gap-4 py-1 text-sm" key={index}><span>{item.quantity} × {item.productNameAtTime}</span><strong>{formatVnd(item.subtotal)}</strong></p>)}</div><div className="space-y-2 py-4 text-sm"><p className="flex justify-between"><span>Tiền món</span><strong>{formatVnd(order.totalAmount)}</strong></p><p className="flex justify-between"><span>Phí giao hàng</span><strong>{formatVnd(order.deliveryFee)}</strong></p>{order.discountAmount > 0 && <p className="flex justify-between text-primary"><span>Dùng {order.pointsRedeemed} điểm Aura</span><strong>−{formatVnd(order.discountAmount)}</strong></p>}</div><p className="flex items-end justify-between border-t pt-4"><strong>Tổng thanh toán</strong><strong className="text-3xl text-primary">{formatVnd(order.finalAmount)}</strong></p>
        {details.payment.status === 'PENDING' && order.status === 'PENDING' && <>
          <p className="mt-4 text-sm font-semibold text-stone-700">
            {selectedMethod === 'COD' ? 'Đã chọn: COD — trả tiền khi nhận hàng' : selectedMethod === 'BANK_TRANSFER' && !details.demoEnabled ? 'Đã chọn: chuyển khoản VietQR — chờ hệ thống xác nhận' : selectedMethod ? `Đã chọn: trả trước qua ${selectedMethod === 'MOMO' ? 'MoMo' : selectedMethod === 'VNPAY' ? 'VNPay' : 'chuyển khoản'} (mô phỏng)` : 'Chọn một phương thức bên trái để tiếp tục.'}
          </p>
          <button type="button" disabled={!selectedMethod || busy} onClick={confirmSelected} className="swp-primary-button mt-3 w-full disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? 'Đang xác nhận...' : selectedMethod === 'COD' ? 'Xác nhận COD — trả khi nhận hàng' : selectedMethod === 'BANK_TRANSFER' && !details.demoEnabled ? 'Kiểm tra trạng thái chuyển khoản' : selectedMethod ? 'Xác nhận thanh toán trước' : 'Chọn phương thức thanh toán'}
          </button>
        </>}
        <Link to="/orders" className="mt-5 block text-center text-sm font-semibold text-primary">Theo dõi đơn hàng →</Link>
      </section></aside></div>
    </>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}{copied.startsWith('Không') && <p role="status" className="mt-3 text-sm">{copied}</p>}
  </div></div>;
}
