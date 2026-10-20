import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartPayload, formatVnd, shopApi } from '../lib/shopApi';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import useLoyalty from '../hooks/useLoyalty';
import type { OrderRecord } from '../types/shop';

interface CheckoutPageProps { onRequestAuth: () => void }

export default function CheckoutPage({ onRequestAuth }: CheckoutPageProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const cartItems = useCartStore((state) => state.items);
  const cartReady = useCartStore((state) => state.ready);
  const cartOwnerId = useCartStore((state) => state.ownerId);
  const syncError = useCartStore((state) => state.syncError);
  const rewardId = useCartStore((state) => state.rewardId);
  const setRewardId = useCartStore((state) => state.setRewardId);
  const { summary: loyalty, loading: loyaltyLoading, error: loyaltyError } = useLoyalty(user?.token);
  const items = cartItems.filter((item) => item.checked);
  const removeSelected = useCartStore((state) => state.removeSelected);
  const [mode, setMode] = useState<'ONLINE' | 'TAKEAWAY'>('ONLINE');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'DEMO_ONLINE'>('COD');
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [name, setName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState('');
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const reward = loyalty?.rewards.find((offer) => offer._id === rewardId);
  const rewardValid = !!reward && !!loyalty?.canRedeem && loyalty.totalPoints >= reward.pointsCost && subtotal >= reward.minOrderValue;
  const discount = rewardValid && reward ? Math.min(reward.discountValue, subtotal) : 0;
  const fee = mode === 'ONLINE' && subtotal < 150000 ? 18000 : 0;

  useEffect(() => {
    if (user) {
      setName((current) => current || user.fullName);
      setPhone((current) => current || user.phone);
      setAddress((current) => current || user.address || '');
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    shopApi<{ demoEnabled: boolean }>('/api/payments/config')
      .then((config) => { if (active) setDemoEnabled(config.demoEnabled); })
      .catch(() => { if (active) setDemoEnabled(false); });
    return () => { active = false; };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!items.length) { navigate('/cart'); return; }
    if (!user) { onRequestAuth(); return; }
    if (user.role !== 'CUSTOMER') { setError('Vui lòng dùng tài khoản khách hàng để đặt món online.'); return; }
    if (!cartReady || cartOwnerId !== user._id) return;
    if (rewardId && !rewardValid) return;
    if (mode === 'ONLINE' && paymentMethod === 'DEMO_ONLINE' && !demoEnabled) { setError('Thanh toán mô phỏng hiện không khả dụng.'); return; }
    if (submittingRef.current) return;
    const recipientName = name.trim();
    const recipientPhone = phone.trim();
    const deliveryAddress = address.trim();
    const digits = (recipientPhone.match(/\d/g) || []).length;
    if (!recipientName || recipientName.length > 100) { setError('Tên người nhận phải từ 1 đến 100 ký tự.'); return; }
    if (recipientPhone.length > 30 || !/^\+?[0-9 .()-]+$/.test(recipientPhone) || digits < 9 || digits > 15) { setError('Số điện thoại nhận hàng phải có từ 9 đến 15 chữ số.'); return; }
    if (mode === 'ONLINE' && (deliveryAddress.length < 5 || deliveryAddress.length > 300)) { setError('Địa chỉ giao hàng phải từ 5 đến 300 ký tự.'); return; }
    setError('');
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const order = await shopApi<OrderRecord>('/api/orders', {
        method: 'POST', token: user.token,
        body: { items: cartPayload(items), orderType: mode, recipientName, recipientPhone, deliveryAddress: mode === 'ONLINE' ? deliveryAddress : undefined, orderNote: [note.trim(), ...items.filter(item => item.customization).map(item => `${item.name} (${item.size}): ${[item.customization?.sugar && `đường ${item.customization.sugar}`, item.customization?.ice, item.customization?.note].filter(Boolean).join(', ')}`)].filter(Boolean).join('; '), rewardId: rewardValid ? rewardId : undefined, paymentMethod: mode === 'ONLINE' ? paymentMethod : undefined, expectedTotal: subtotal - discount + fee }
      });
      setRewardId(null);
      removeSelected();
      navigate(mode === 'ONLINE' && paymentMethod === 'DEMO_ONLINE' ? `/payment?orderId=${order._id}` : '/orders', { state: { newOrderCode: order.orderCode } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return <div className="bg-[#fafafa] min-h-[calc(100vh-5rem)]">
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-10">
      <div className="max-w-2xl mx-auto grid grid-cols-3 gap-2 text-center text-xs md:text-sm font-semibold mb-8">
        {[['check', '1. Giỏ hàng'], ['local_shipping', '2. Xác nhận đơn'], ['done_all', '3. Hoàn tất']].map(([icon, label], index) => <div key={label} className={`flex flex-col items-center gap-2 ${index === 2 ? 'text-slate-400' : 'text-primary'}`}>
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${index === 2 ? 'bg-slate-200' : 'bg-primary text-white'}`}><span className="material-symbols-outlined">{icon}</span></div>
          <span>{label}</span>
        </div>)}
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-5">
          <section className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5"><h1 className="font-bold text-lg flex items-center gap-2"><span className="material-symbols-outlined text-primary">swap_horiz</span>Phương thức nhận hàng</h1><span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-primary">Bước 2 / 3</span></div>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-blue-50 p-1">
              <button type="button" onClick={() => setMode('ONLINE')} className={`rounded-md px-3 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${mode === 'ONLINE' ? 'bg-white text-primary shadow-sm' : 'text-slate-600'}`}><span className="material-symbols-outlined">moped</span>Giao tận nơi</button>
              <button type="button" onClick={() => setMode('TAKEAWAY')} className={`rounded-md px-3 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${mode === 'TAKEAWAY' ? 'bg-white text-primary shadow-sm' : 'text-slate-600'}`}><span className="material-symbols-outlined">storefront</span>Đến lấy tại quầy</button>
            </div>
          </section>

          <section className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-lg flex items-center gap-2"><span className="material-symbols-outlined text-primary">person_pin_circle</span>Thông tin nhận hàng</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm font-semibold text-slate-700">Tên người nhận<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} autoComplete="name" className="mt-1 block w-full rounded-lg border border-blue-100 bg-slate-50 px-3 py-2.5 outline-none focus:border-primary" /></label>
              <label className="text-sm font-semibold text-slate-700">Số điện thoại<input value={phone} onChange={(event) => setPhone(event.target.value)} required type="tel" maxLength={30} autoComplete="tel" inputMode="tel" aria-describedby="recipient-phone-hint" className="mt-1 block w-full rounded-lg border border-blue-100 bg-slate-50 px-3 py-2.5 outline-none focus:border-primary" /><span id="recipient-phone-hint" className="mt-1 block text-xs font-normal text-slate-500">Từ 9 đến 15 chữ số.</span></label>
            </div>
            {mode === 'ONLINE' ? <label className="block text-sm font-semibold text-slate-700">Địa chỉ giao hàng<textarea value={address} onChange={(event) => setAddress(event.target.value)} required maxLength={300} rows={3} autoComplete="street-address" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" className="mt-1 block w-full rounded-lg border border-blue-100 bg-slate-50 px-3 py-2.5 outline-none focus:border-primary" /></label>
              : <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm"><strong className="block text-slate-900">Nhận tại quầy Aura Café</strong><span className="text-slate-600">Chi nhánh 01: 28 Phố Tràng Tiền, Hoàn Kiếm, Hà Nội</span></div>}
          </section>

          <section className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-lg flex items-center gap-2"><span className="material-symbols-outlined text-primary">schedule</span>Thời gian nhận hàng</h2>
            <div className="mt-4 rounded-lg border border-primary/30 bg-blue-50 p-4 text-sm"><strong>{mode === 'ONLINE' ? 'Giao sớm nhất có thể' : 'Chuẩn bị sớm nhất có thể'}</strong><p className="text-slate-600 mt-1">Chúng tôi sẽ thông báo khi đơn chuyển sang bước tiếp theo.</p></div>
          </section>

          <section className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-lg flex items-center gap-2"><span className="material-symbols-outlined text-primary">payments</span>Phương thức thanh toán</h2>
            {mode === 'TAKEAWAY' ? <p className="mt-3 text-sm text-slate-700">Thanh toán tại quầy khi đến nhận món.</p> : <div className="mt-4 space-y-3 text-sm">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-blue-100 p-3"><input type="radio" name="payment-method" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} className="mt-1 accent-primary" /><span><strong>Thanh toán khi nhận hàng (COD)</strong><span className="block text-slate-600">Trả tiền cho nhân viên giao hàng.</span></span></label>
              {demoEnabled && <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-blue-100 p-3"><input type="radio" name="payment-method" checked={paymentMethod === 'DEMO_ONLINE'} onChange={() => setPaymentMethod('DEMO_ONLINE')} className="mt-1 accent-primary" /><span><strong>Thanh toán online mô phỏng</strong><span className="block text-slate-600">Dành cho bài tập: xác nhận trên trang mô phỏng, không thu tiền thật.</span></span></label>}
            </div>}
          </section>

          <section className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
            <label htmlFor="order-note" className="font-bold text-lg flex items-center gap-2"><span className="material-symbols-outlined text-primary">edit_note</span>Ghi chú đơn hàng</label>
            <textarea id="order-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} placeholder="Ví dụ: ít đá, gọi trước khi giao..." className="mt-4 block w-full rounded-lg border border-blue-100 bg-slate-50 px-3 py-2.5 outline-none focus:border-primary" />
          </section>
        </div>

        <aside className="lg:col-span-5 lg:sticky lg:top-24 rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex justify-between gap-3 border-b border-blue-100 pb-4"><h2 className="font-bold text-lg flex items-center gap-2"><span className="material-symbols-outlined text-primary">receipt_long</span>Kiểm tra đơn hàng ({items.length} món)</h2><button type="button" onClick={() => navigate('/cart')} className="text-sm font-semibold text-primary hover:underline">Sửa giỏ</button></div>
          {items.length === 0 && <div className="py-8 text-center text-slate-600">Chưa có món nào được chọn. <button type="button" onClick={() => navigate('/cart')} className="text-primary font-semibold">Quay lại giỏ</button></div>}
          <div className="divide-y divide-blue-100">{items.map((item) => <div key={item.cartId} className="py-4 flex gap-3 items-center">
            <div className="h-14 w-14 rounded-lg overflow-hidden bg-slate-100 shrink-0">{item.image && <img src={item.image} alt={item.name} className="h-full w-full object-cover" />}</div>
            <div className="min-w-0 flex-1"><p className="font-semibold truncate">{item.name}</p><p className="text-xs text-slate-500">{item.quantity}x · Size {item.size}</p></div>
            <strong className="text-sm">{formatVnd(item.unitPrice * item.quantity)}</strong>
          </div>)}</div>
          <div className="border-t border-blue-100 pt-4 space-y-2 text-sm"><div className="flex justify-between"><span>Tổng tiền món</span><strong>{formatVnd(subtotal)}</strong></div>{discount > 0 && <div className="flex justify-between text-emerald-700"><span>Giảm bằng {reward?.pointsCost} điểm</span><strong>−{formatVnd(discount)}</strong></div>}<div className="flex justify-between"><span>Phí giao hàng</span><strong>{fee ? formatVnd(fee) : 'Miễn phí'}</strong></div></div>
          <div className="mt-4 border-t border-blue-100 pt-4 flex justify-between items-end gap-3"><div><strong className="text-lg">Tổng thanh toán</strong><p className="text-xs text-slate-500">{mode === 'ONLINE' ? paymentMethod === 'DEMO_ONLINE' ? 'Thanh toán mô phỏng sau khi đặt đơn' : 'Thanh toán khi nhận hàng' : 'Thanh toán tại quầy'}</p></div><strong className="text-2xl md:text-3xl text-primary">{formatVnd(subtotal - discount + fee)}</strong></div>
          {rewardId && !rewardValid && <div role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{loyaltyLoading ? 'Đang kiểm tra điểm tích lũy...' : loyaltyError || 'Ưu đãi điểm không còn phù hợp với đơn hàng.'} <button type="button" onClick={() => setRewardId(null)} className="font-bold underline">Bỏ ưu đãi</button></div>}
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {user && syncError && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{syncError}</p>}
          {!user && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Đăng nhập để lưu và theo dõi đơn hàng của bạn.</p>}
          <button disabled={submitting || !items.length || (!!user && (!cartReady || cartOwnerId !== user._id)) || (!!rewardId && !rewardValid)} type={user ? 'submit' : 'button'} onClick={user ? undefined : onRequestAuth} className="mt-6 w-full rounded-lg bg-primary py-3 text-white font-bold disabled:bg-slate-300 flex justify-center items-center gap-2">{submitting ? 'Đang tạo đơn...' : user && (!cartReady || cartOwnerId !== user._id) ? 'Đang tải giỏ hàng...' : user ? 'Xác nhận & Đặt hàng' : 'Đăng nhập để đặt hàng'}<span className="material-symbols-outlined">arrow_forward</span></button>
          <button type="button" onClick={() => navigate('/cart')} className="mt-2 w-full rounded-lg bg-slate-50 py-3 text-slate-600 font-semibold flex justify-center items-center gap-2"><span className="material-symbols-outlined">arrow_back</span>Quay lại giỏ hàng</button>
        </aside>
      </form>
    </div>
  </div>;
}
