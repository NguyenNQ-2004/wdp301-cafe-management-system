import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatVnd, shopApi } from '../lib/shopApi';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import type { CatalogProduct, OrderRecord } from '../types/shop';

interface OrdersPageProps { onRequestAuth: () => void }
type OrderTab = 'all' | 'processing' | 'shipping' | 'completed' | 'canceled';

const groupFor = (status: OrderRecord['status']): OrderTab => {
  if (status === 'COMPLETED') return 'completed';
  if (status === 'CANCELLED') return 'canceled';
  if (status === 'DELIVERING') return 'shipping';
  return 'processing';
};

const statusLabel: Record<OrderRecord['status'], string> = {
  PENDING: 'Đã tiếp nhận', CONFIRMED: 'Đã xác nhận', PREPARING: 'Đang chuẩn bị món',
  READY: 'Sẵn sàng nhận', DELIVERING: 'Đang giao hàng', COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy'
};

const dateText = (value: string) => new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

export default function OrdersPage({ onRequestAuth }: OrdersPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const addProduct = useCartStore((state) => state.addProduct);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(!!user);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [tab, setTab] = useState<OrderTab>('all');
  const [search, setSearch] = useState('');
  const [days, setDays] = useState('90');
  const [showAll, setShowAll] = useState(false);
  const newOrderCode = (location.state as { newOrderCode?: string } | null)?.newOrderCode;

  useEffect(() => {
    if (!user) { setOrders([]); setLoading(false); return; }
    let active = true;
    setLoading(true);
    shopApi<OrderRecord[]>('/api/orders', { token: user.token })
      .then((data) => { if (active) setOrders(data); })
      .catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  const counts = useMemo(() => ({
    all: orders.length,
    processing: orders.filter((order) => groupFor(order.status) === 'processing').length,
    shipping: orders.filter((order) => groupFor(order.status) === 'shipping').length,
    completed: orders.filter((order) => groupFor(order.status) === 'completed').length,
    canceled: orders.filter((order) => groupFor(order.status) === 'canceled').length
  }), [orders]);

  const visible = useMemo(() => orders.filter((order) => {
    const age = (Date.now() - new Date(order.createdAt).getTime()) / 86400000;
    const matchDays = days === 'all' || age <= Number(days);
    const matchSearch = !search.trim() || `${order.orderCode} ${order.items.map((item) => item.productNameAtTime).join(' ')}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'));
    return matchDays && matchSearch && (tab === 'all' || groupFor(order.status) === tab);
  }), [orders, days, search, tab]);

  const active = visible.find((order) => ['processing', 'shipping'].includes(groupFor(order.status)));
  const history = visible.filter((order) => order._id !== active?._id);
  const displayed = showAll ? history : history.slice(0, 3);

  const reorder = async (order: OrderRecord) => {
    setActionError('');
    try {
      const products = await shopApi<CatalogProduct[]>('/api/products');
      const byId = new Map(products.map((product) => [product._id, product]));
      let added = 0;
      order.items.forEach((line) => {
        const id = typeof line.product === 'string' ? line.product : line.product?._id;
        const product = byId.get(id);
        if (!product || product.isAvailable === false) return;
        for (let count = 0; count < line.quantity; count++) addProduct(product, line.customization?.size || 'M');
        added += line.quantity;
      });
      if (!added) { setActionError('Các món trong đơn này hiện không còn được bán.'); return; }
      navigate('/cart');
    } catch (err) { setActionError((err as Error).message); }
  };

  const tabs: { key: OrderTab; title: string }[] = [
    { key: 'all', title: 'Tất cả đơn' }, { key: 'processing', title: 'Đang xử lý' },
    { key: 'shipping', title: 'Đang giao hàng' }, { key: 'completed', title: 'Đã hoàn thành' },
    { key: 'canceled', title: 'Đã hủy' }
  ];

  return <div className="bg-[#fafafa] min-h-[calc(100vh-5rem)]">
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-9">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">Theo dõi & đối soát đơn</p>
      <h1 className="mt-1 text-3xl md:text-4xl font-bold text-slate-950">Đơn hàng của tôi</h1>
      <p className="mt-2 text-slate-600">Kiểm tra tiến trình chuẩn bị và giao nhận các món yêu thích của bạn.</p>
      {newOrderCode && <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">Đặt hàng thành công! Mã đơn: <strong>#{newOrderCode}</strong>.</div>}
      {actionError && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{actionError}</div>}

      {!user ? <div className="mt-8 rounded-xl border border-blue-100 bg-white p-10 text-center shadow-sm"><span className="material-symbols-outlined text-5xl text-primary">receipt_long</span><h2 className="mt-2 text-xl font-bold">Đăng nhập để xem đơn hàng</h2><p className="mt-2 text-slate-600">Đơn hàng được lưu theo tài khoản của bạn.</p><button onClick={onRequestAuth} className="mt-5 rounded-lg bg-primary px-6 py-2.5 text-white font-semibold">Đăng nhập</button></div> : <>
        <div className="mt-7 flex flex-col sm:flex-row gap-3">
          <label className="relative flex-1"><span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-slate-500">receipt_long</span><input aria-label="Tìm đơn hàng" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo mã đơn #AURA- hoặc tên món..." className="w-full rounded-lg border border-blue-100 bg-white py-2.5 pl-11 pr-4 outline-none focus:border-primary" /></label>
          <select aria-label="Lọc ngày" value={days} onChange={(event) => setDays(event.target.value)} className="rounded-lg border border-blue-100 bg-white px-4 py-2.5 outline-none focus:border-primary"><option value="90">90 ngày gần nhất</option><option value="30">30 ngày gần nhất</option><option value="7">7 ngày gần nhất</option><option value="all">Tất cả thời gian</option></select>
        </div>
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">{tabs.map(({ key, title }) => <button key={key} onClick={() => { setTab(key); setShowAll(false); }} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm ${tab === key ? 'bg-primary text-white' : 'bg-white text-slate-700 border border-blue-100 hover:bg-blue-50'}`}>{title} <span className="ml-1 rounded-full bg-black/10 px-1.5 py-0.5 text-xs">{counts[key]}</span></button>)}</div>
        {loading && <p className="mt-8 text-slate-600">Đang tải đơn hàng...</p>}
        {error && <p role="alert" className="mt-8 rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
        {!loading && !error && visible.length === 0 && <div className="mt-8 rounded-xl border border-blue-100 bg-white p-10 text-center shadow-sm"><span className="material-symbols-outlined text-5xl text-slate-400">inventory_2</span><h2 className="mt-2 text-xl font-bold">Chưa có đơn hàng phù hợp</h2><button onClick={() => navigate('/menu')} className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-white font-semibold">Khám phá thực đơn</button></div>}

        {active && <article className="mt-8 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
          <div className="bg-primary p-5 text-white"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-lg font-bold">Đơn hàng #{active.orderCode}</p><p className="text-sm text-white/80">Đặt lúc {dateText(active.createdAt)}</p></div><span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase">{statusLabel[active.status]}</span></div></div>
          <div className="p-5">
            <div className="rounded-xl bg-blue-50 p-5"><div className="flex justify-between gap-2 text-sm"><strong>Tiến trình đơn hàng</strong><span className="text-primary font-bold">{active.status === 'DELIVERING' ? 'Bước 3 / 4' : active.status === 'PREPARING' || active.status === 'READY' ? 'Bước 2 / 4' : 'Bước 1 / 4'}</span></div><div className="mt-5 grid grid-cols-4 gap-2 text-center text-xs sm:text-sm">{[['check', 'Đã đặt đơn'], ['local_cafe', 'Pha chế'], ['two_wheeler', 'Giao hàng'], ['flag', 'Hoàn tất']].map(([icon, label], index) => <div key={label} className={index <= (active.status === 'DELIVERING' ? 2 : ['PREPARING', 'READY'].includes(active.status) ? 1 : 0) ? 'text-primary' : 'text-slate-400'}><span className="material-symbols-outlined text-2xl">{icon}</span><p>{label}</p></div>)}</div></div>
            <h2 className="mt-6 mb-3 font-bold">Danh sách món trong đơn</h2>
            <OrderLines order={active} />
            <div className="mt-5 border-t border-blue-100 pt-4 flex justify-between"><span>Tổng thanh toán</span><strong className="text-xl text-primary">{formatVnd(active.finalAmount)}</strong></div>
          </div>
        </article>}

        {history.length > 0 && <section className="mt-10"><div className="flex flex-wrap items-end justify-between gap-2 mb-4"><h2 className="text-2xl font-bold">Lịch sử đơn hàng</h2><span className="text-sm text-slate-500">{history.length} đơn</span></div><div className="space-y-4">{displayed.map((order) => <article key={order._id} className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><strong>#{order.orderCode}</strong><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${order.status === 'CANCELLED' ? 'bg-red-50 text-red-700' : order.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-primary'}`}>{statusLabel[order.status]}</span></div><p className="text-sm text-slate-500 mt-1">{dateText(order.createdAt)}</p><p className="mt-3 text-sm text-slate-700">{order.items.map((item) => `${item.quantity}x ${item.productNameAtTime}`).join(', ')}</p><p className="mt-1 text-xs text-slate-500">{order.orderType === 'ONLINE' ? `Giao đến: ${order.deliveryAddress}` : 'Nhận tại quầy'}</p></div><strong className="text-xl text-primary">{formatVnd(order.finalAmount)}</strong></div><div className="mt-4 border-t border-blue-100 pt-4 flex justify-end"><button onClick={() => reorder(order)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white flex items-center gap-1"><span className="material-symbols-outlined text-lg">replay</span>Đặt lại đơn này</button></div></article>)}</div>{history.length > 3 && <button onClick={() => setShowAll((current) => !current)} className="mt-6 rounded-lg border border-blue-100 bg-white px-5 py-2.5 text-sm font-semibold shadow-sm">{showAll ? 'Thu gọn' : 'Xem các đơn cũ hơn'}</button>}</section>}
      </>}
    </div>
  </div>;
}

function OrderLines({ order }: { order: OrderRecord }) {
  return <div className="space-y-2">{order.items.map((item, index) => {
    const product = typeof item.product === 'string' ? null : item.product;
    return <div key={`${item.productNameAtTime}-${index}`} className="rounded-lg border border-blue-100 bg-slate-50 p-2 flex items-center gap-3">
      <div className="h-12 w-12 rounded-md bg-slate-100 overflow-hidden shrink-0">{product?.imageUrl && <img src={product.imageUrl} alt={item.productNameAtTime} className="h-full w-full object-cover" />}</div>
      <div className="min-w-0 flex-1"><p className="font-semibold truncate">{item.productNameAtTime}</p><p className="text-xs text-slate-500">SL: {item.quantity} · Size {item.customization?.size || 'M'}</p></div>
      <strong className="text-sm">{formatVnd(item.subtotal)}</strong>
    </div>;
  })}</div>;
}
