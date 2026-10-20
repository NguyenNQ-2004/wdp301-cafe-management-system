import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatVnd, shopApi } from '../lib/shopApi';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import useLoyalty from '../hooks/useLoyalty';
import type { CatalogProduct } from '../types/shop';

const FREESHIP_THRESHOLD = 150000;

export default function CartPage() {
  const navigate = useNavigate();
  const items = useCartStore((state) => state.items);
  const user = useAuthStore((state) => state.user);
  const cartReady = useCartStore((state) => state.ready);
  const cartOwnerId = useCartStore((state) => state.ownerId);
  const syncError = useCartStore((state) => state.syncError);
  const rewardId = useCartStore((state) => state.rewardId);
  const setRewardId = useCartStore((state) => state.setRewardId);
  const { summary: loyalty, loading: loyaltyLoading, error: loyaltyError } = useLoyalty(user?.token);
  const addProduct = useCartStore((state) => state.addProduct);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const removeSelected = useCartStore((state) => state.removeSelected);
  const toggleItem = useCartStore((state) => state.toggleItem);
  const toggleAll = useCartStore((state) => state.toggleAll);
  const [suggestions, setSuggestions] = useState<CatalogProduct[]>([]);
  const selected = items.filter((item) => item.checked);
  const subtotal = selected.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const reward = loyalty?.rewards.find((offer) => offer._id === rewardId);
  const cartUsable = !user || (cartReady && cartOwnerId === user._id);
  const rewardEligible = !!reward && !!loyalty?.canRedeem && cartUsable && subtotal >= reward.minOrderValue && loyalty.totalPoints >= reward.pointsCost;
  const discount = rewardEligible && reward ? Math.min(reward.discountValue, subtotal) : 0;
  const percent = Math.min(100, Math.round(subtotal / FREESHIP_THRESHOLD * 100));
  const allChecked = items.length > 0 && selected.length === items.length;

  useEffect(() => {
    let active = true;
    shopApi<CatalogProduct[]>('/api/products').then((products) => {
      if (active) setSuggestions(products.filter((product) => product.isAvailable !== false));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (rewardId && (!user || (cartReady && loyalty && !rewardEligible))) setRewardId(null);
  }, [rewardId, user, cartReady, loyalty, rewardEligible, setRewardId]);

  const suggested = suggestions.filter((product) => !items.some((item) => item.productId === product._id)).slice(0, 2);

  return <div className="bg-[#fafafa] min-h-[calc(100vh-5rem)]">
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
        <div>
          <nav className="text-sm text-slate-500 flex items-center gap-1 mb-2">
            <button onClick={() => navigate('/')} className="hover:text-primary">Trang chủ</button>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="font-semibold text-slate-900">Giỏ hàng của bạn</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-950">Giỏ hàng của bạn</h1>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-primary">{items.length} món</span>
          </div>
        </div>
        <div className="w-full md:w-96 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="flex justify-between text-xs md:text-sm font-semibold text-primary">
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-lg">local_shipping</span>{percent === 100 ? 'Đơn hàng đủ điều kiện FREESHIP!' : `Thêm ${formatVnd(FREESHIP_THRESHOLD - subtotal)} để nhận FREESHIP`}</span>
            <span>{percent}%</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} /></div>
          <p className="text-xs text-slate-600 mt-2">Miễn phí giao hàng cho đơn từ {formatVnd(FREESHIP_THRESHOLD)}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-5">
          {items.length > 0 && <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm flex flex-wrap justify-between gap-3">
            <label className="flex items-center gap-2 font-semibold text-sm cursor-pointer">
              <input type="checkbox" checked={allChecked} onChange={(event) => toggleAll(event.target.checked)} className="accent-primary h-4 w-4" />
              Chọn tất cả ({items.length} món)
            </label>
            <button type="button" onClick={removeSelected} disabled={!selected.length} className="text-sm text-slate-600 hover:text-primary disabled:opacity-40 flex items-center gap-1">
              <span className="material-symbols-outlined text-lg">delete_sweep</span>Xóa các món đã chọn
            </button>
          </div>}

          {items.length === 0 && <div className="rounded-xl border border-blue-100 bg-white px-6 py-14 shadow-sm text-center">
            <span className="material-symbols-outlined text-5xl text-slate-400">shopping_cart_off</span>
            <h2 className="text-xl font-bold mt-2">Giỏ hàng của bạn đang trống</h2>
            <p className="text-slate-600 mt-2">Hãy chọn món yêu thích từ thực đơn Aura Café.</p>
            <button onClick={() => navigate('/menu')} className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-white font-semibold">Xem thực đơn</button>
          </div>}

          {items.map((item) => <article key={item.cartId} className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
            <div className="flex gap-3 md:gap-4">
              <input aria-label={`Chọn ${item.name}`} type="checkbox" checked={item.checked} onChange={() => toggleItem(item.cartId)} className="accent-primary h-4 w-4 mt-2 shrink-0" />
              <div className="h-20 w-20 md:h-28 md:w-28 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center text-3xl">☕</div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">{item.categoryTitle}</p>
                    <h2 className="font-semibold text-slate-950 md:text-lg">{item.name}</h2>
                  </div>
                  <button type="button" onClick={() => removeItem(item.cartId)} aria-label={`Xóa ${item.name}`} className="text-slate-500 hover:text-primary self-start"><span className="material-symbols-outlined">close</span></button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-slate-700">Size {item.size}</span></div>
                {item.customization && <p className="mt-1 text-xs text-slate-500">{[item.customization.sugar && `Đường ${item.customization.sugar}`, item.customization.ice, item.customization.note].filter(Boolean).join(' · ')}</p>}
                <div className="mt-4 rounded-lg border border-blue-100 bg-slate-50 p-2 flex flex-wrap justify-between items-end gap-3">
                  <div className="text-xs text-slate-600">Đơn giá <strong className="block text-slate-900">{formatVnd(item.unitPrice)}</strong></div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center rounded-lg bg-blue-50">
                      <button aria-label={`Giảm số lượng ${item.name}`} onClick={() => updateQuantity(item.cartId, -1)} className="h-8 w-8 hover:bg-blue-100 rounded-lg"><span className="material-symbols-outlined text-lg">remove</span></button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button aria-label={`Tăng số lượng ${item.name}`} onClick={() => updateQuantity(item.cartId, 1)} className="h-8 w-8 hover:bg-blue-100 rounded-lg"><span className="material-symbols-outlined text-lg">add</span></button>
                    </div>
                    <strong className="text-primary">{formatVnd(item.unitPrice * item.quantity)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </article>)}

          <button onClick={() => navigate('/menu')} className="flex items-center gap-2 font-semibold text-primary hover:underline"><span className="material-symbols-outlined">arrow_back</span>Tiếp tục chọn món thêm</button>

          {suggested.length > 0 && <section className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex items-center justify-between gap-3 mb-4"><h2 className="text-lg font-bold flex items-center gap-2"><span className="material-symbols-outlined text-primary">recommend</span>Thường được mua cùng</h2><span className="text-xs uppercase text-slate-500 hidden sm:block">Gợi ý dành riêng cho bạn</span></div>
            <div className="grid gap-3 sm:grid-cols-2">{suggested.map((product) => <div key={product._id} className="rounded-lg border border-blue-100 bg-white p-3 flex gap-3 items-center">
              <div className="h-16 w-16 shrink-0 rounded-md overflow-hidden bg-slate-100">{product.imageUrl && <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />}</div>
              <div className="min-w-0 flex-1"><p className="font-semibold truncate">{product.name}</p><p className="text-xs text-slate-500 truncate">{product.category?.name}</p><p className="text-sm text-primary font-bold">{formatVnd(product.basePrice)}</p></div>
              <button onClick={() => addProduct(product)} className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-white">+ Thêm</button>
            </div>)}</div>
          </section>}
        </div>

        <aside className="lg:col-span-4 lg:sticky lg:top-24 rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Tóm tắt đơn hàng</h2>
          {user && syncError && <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{syncError}</p>}
          <div className="mt-5 flex justify-between text-sm text-slate-600"><span>Tổng tiền hàng ({selected.length} món)</span><strong className="text-slate-950">{formatVnd(subtotal)}</strong></div>
          <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm">
            <h3 className="font-bold flex items-center gap-2"><span className="material-symbols-outlined text-primary">stars</span>Dùng điểm tích lũy</h3>
            {!user && <p className="mt-2 text-slate-600">Bạn có thể chọn món ngay. Đăng nhập ở bước đặt hàng để dùng điểm.</p>}
            {user && loyaltyLoading && <p className="mt-2 text-slate-600">Đang tải điểm tích lũy...</p>}
            {user && loyaltyError && <p role="alert" className="mt-2 text-red-700">{loyaltyError}</p>}
            {loyalty && !loyalty.canRedeem && <p className="mt-2 text-slate-600">Ưu đãi điểm dành cho tài khoản khách hàng.</p>}
            {loyalty?.canRedeem && <>
              <p className="mt-2 text-slate-700">Bạn có <strong>{loyalty.totalPoints} điểm</strong>. Điểm chỉ bị trừ khi đặt hàng thành công.</p>
              <div className="mt-3 space-y-2">
                <label className="flex gap-2 items-center cursor-pointer"><input type="radio" name="loyalty-reward" checked={!rewardId} onChange={() => setRewardId(null)} className="accent-primary" />Không dùng điểm</label>
                {loyalty.rewards.map((offer) => {
                  const enoughPoints = loyalty.totalPoints >= offer.pointsCost;
                  const enoughOrder = subtotal >= offer.minOrderValue;
                  return <label key={offer._id} className={`flex gap-2 items-start rounded-lg bg-white p-2 ${enoughPoints && enoughOrder ? 'cursor-pointer' : 'opacity-55'}`}>
                    <input type="radio" name="loyalty-reward" checked={rewardId === offer._id} disabled={!enoughPoints || !enoughOrder || !cartUsable} onChange={() => setRewardId(offer._id)} className="accent-primary mt-1" />
                    <span><strong>Giảm {formatVnd(offer.discountValue)}</strong><span className="block text-xs text-slate-600">{offer.pointsCost} điểm · Đơn từ {formatVnd(offer.minOrderValue)}</span></span>
                  </label>;
                })}
                {loyalty.rewards.length === 0 && <p className="text-slate-600">Hiện chưa có ưu đãi điểm khả dụng.</p>}
              </div>
            </>}
          </div>
          {discount > 0 && <div className="mt-4 flex justify-between text-sm text-emerald-700"><span>Giảm bằng điểm</span><strong>−{formatVnd(discount)}</strong></div>}
          <p className="mt-3 text-xs text-slate-500">Phí giao hàng được tính ở bước xác nhận đơn. Đơn từ {formatVnd(FREESHIP_THRESHOLD)} được miễn phí giao.</p>
          <div className="mt-5 border-t border-blue-100 pt-5 flex items-end justify-between gap-2"><strong>Tổng tiền món sau giảm</strong><strong className="text-2xl md:text-3xl text-primary">{formatVnd(subtotal - discount)}</strong></div>
          <button disabled={!selected.length || !cartUsable} onClick={() => navigate('/checkout')} className="mt-6 w-full rounded-lg bg-primary py-3 text-white font-bold disabled:bg-slate-300 flex justify-center items-center gap-2">{user && !cartUsable ? 'Đang đồng bộ giỏ hàng...' : `Tiến hành đặt hàng (${selected.length} món)`}<span className="material-symbols-outlined">arrow_forward</span></button>
          <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4 text-xs text-slate-600 space-y-3">
            <p className="flex gap-2"><span className="material-symbols-outlined text-primary text-lg">verified_user</span>Đơn hàng được xác nhận trước khi pha chế.</p>
            <p className="flex gap-2"><span className="material-symbols-outlined text-primary text-lg">thermostat</span>Đồ uống được đóng gói phù hợp khi giao hàng.</p>
          </div>
        </aside>
      </div>
    </div>
  </div>;
}
