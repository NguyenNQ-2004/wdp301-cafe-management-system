import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartPayload, formatVnd, shopApi } from '../lib/shopApi';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import type { OrderRecord } from '../types/shop';

interface CheckoutPageProps { onRequestAuth: () => void }

export default function CheckoutPage({ onRequestAuth }: CheckoutPageProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const cartItems = useCartStore((state) => state.items);
  const cartReady = useCartStore((state) => state.ready);
  const items = cartItems.filter((item) => item.checked);
  const removeSelected = useCartStore((state) => state.removeSelected);
  const [mode, setMode] = useState<'ONLINE' | 'TAKEAWAY'>('ONLINE');
  const [name, setName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const fee = mode === 'ONLINE' && subtotal < 150000 ? 18000 : 0;

  useEffect(() => {
    if (user) { setName((current) => current || user.fullName); setPhone((current) => current || user.phone); }
  }, [user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!items.length) { navigate('/cart'); return; }
    if (!user) { onRequestAuth(); return; }
    if (!cartReady) return;
    setError('');
    setSubmitting(true);
    try {
      const order = await shopApi<OrderRecord>('/api/orders', {
        method: 'POST', token: user.token,
        body: { items: cartPayload(items), orderType: mode, recipientName: name, recipientPhone: phone, deliveryAddress: address, orderNote: note, expectedTotal: subtotal + fee }
      });
      removeSelected();
      navigate('/orders', { state: { newOrderCode: order.orderCode } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
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
              <label className="text-sm font-semibold text-slate-700">Tên người nhận<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} className="mt-1 block w-full rounded-lg border border-blue-100 bg-slate-50 px-3 py-2.5 outline-none focus:border-primary" /></label>
              <label className="text-sm font-semibold text-slate-700">Số điện thoại<input value={phone} onChange={(event) => setPhone(event.target.value)} required inputMode="tel" className="mt-1 block w-full rounded-lg border border-blue-100 bg-slate-50 px-3 py-2.5 outline-none focus:border-primary" /></label>
            </div>
            {mode === 'ONLINE' ? <label className="block text-sm font-semibold text-slate-700">Địa chỉ giao hàng<textarea value={address} onChange={(event) => setAddress(event.target.value)} required maxLength={300} rows={3} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" className="mt-1 block w-full rounded-lg border border-blue-100 bg-slate-50 px-3 py-2.5 outline-none focus:border-primary" /></label>
              : <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm"><strong className="block text-slate-900">Nhận tại quầy Aura Café</strong><span className="text-slate-600">Chi nhánh 01: 28 Phố Tràng Tiền, Hoàn Kiếm, Hà Nội</span></div>}
          </section>

          <section className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-lg flex items-center gap-2"><span className="material-symbols-outlined text-primary">schedule</span>Thời gian nhận hàng</h2>
            <div className="mt-4 rounded-lg border border-primary/30 bg-blue-50 p-4 text-sm"><strong>{mode === 'ONLINE' ? 'Giao sớm nhất có thể' : 'Chuẩn bị sớm nhất có thể'}</strong><p className="text-slate-600 mt-1">Chúng tôi sẽ thông báo khi đơn chuyển sang bước tiếp theo.</p></div>
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
          <div className="border-t border-blue-100 pt-4 space-y-2 text-sm"><div className="flex justify-between"><span>Tổng tiền món</span><strong>{formatVnd(subtotal)}</strong></div><div className="flex justify-between"><span>Phí giao hàng</span><strong>{fee ? formatVnd(fee) : 'Miễn phí'}</strong></div></div>
          <div className="mt-4 border-t border-blue-100 pt-4 flex justify-between items-end gap-3"><div><strong className="text-lg">Tổng thanh toán</strong><p className="text-xs text-slate-500">{mode === 'ONLINE' ? 'Thanh toán khi nhận hàng' : 'Thanh toán tại quầy'}</p></div><strong className="text-2xl md:text-3xl text-primary">{formatVnd(subtotal + fee)}</strong></div>
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {!user && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Đăng nhập để lưu và theo dõi đơn hàng của bạn.</p>}
          <button disabled={submitting || !items.length || (!!user && !cartReady)} type={user ? 'submit' : 'button'} onClick={user ? undefined : onRequestAuth} className="mt-6 w-full rounded-lg bg-primary py-3 text-white font-bold disabled:bg-slate-300 flex justify-center items-center gap-2">{submitting ? 'Đang tạo đơn...' : user && !cartReady ? 'Đang tải giỏ hàng...' : user ? 'Xác nhận & Đặt hàng' : 'Đăng nhập để đặt hàng'}<span className="material-symbols-outlined">arrow_forward</span></button>
          <button type="button" onClick={() => navigate('/cart')} className="mt-2 w-full rounded-lg bg-slate-50 py-3 text-slate-600 font-semibold flex justify-center items-center gap-2"><span className="material-symbols-outlined">arrow_back</span>Quay lại giỏ hàng</button>
        </aside>
      </form>
    </div>
  </div>;
}
