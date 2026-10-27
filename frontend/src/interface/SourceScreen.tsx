import { useEffect, useRef, useState } from 'react';
import { startOrderSync } from '../lib/orderSync';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import { hasDifferentOptions } from '../lib/cartOptions';
import type { CatalogProduct } from '../types/shop';
import type { CartItem, PageRoute, Product } from './types';
import { useDb } from './LiveProvider';
import { HomePage } from './pages/HomePage';
import { MenuPage } from './pages/MenuPage';
import { CustomizePage } from './pages/CustomizePage';
import { ProfilePage } from './pages/ProfilePage';
import { OrdersPage } from './pages/OrdersPage';
import { BillPage } from './pages/BillPage';
import { PosCreateOrderPage } from './pages/pos/PosCreateOrderPage';
import { PosOrdersPage } from './pages/pos/PosOrdersPage';
import { KdsTerminalPage } from './pages/kds/KdsTerminalPage';
import { DeliveryOrdersPage } from './pages/delivery/DeliveryOrdersPage';
import { DeliveryProblemPage } from './pages/delivery/DeliveryProblemPage';
import { DeliveryCodPage } from './pages/delivery/DeliveryCodPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';

const PATHS: Partial<Record<PageRoute, string>> = {
  home: '/', menu: '/menu', profile: '/profile', cart: '/cart', checkout: '/checkout', payment: '/payment', bill: '/bill', orders: '/orders', feedback: '/feedback',
  'pos-create': '/cashier', 'pos-orders': '/cashier/orders', 'pos-shift': '/cashier/shift', 'pos-handover': '/cashier/handover', 'kds-terminal': '/barista',
  'delivery-orders': '/delivery', 'delivery-report': '/delivery/problems', 'delivery-cod': '/delivery/cod',
  'admin-overview': '/admin/reports', 'admin-stock': '/admin/inventory', 'admin-users': '/admin/employees', 'admin-memberships': '/admin/memberships',
};

const DATA_LABELS: Record<string, string> = {
  '/api/categories': 'danh mục sản phẩm', '/api/products': 'danh sách sản phẩm',
  '/api/shop-settings': 'thông tin cửa hàng', '/api/auth/me': 'thông tin tài khoản',
  '/api/loyalty-transactions': 'lịch sử điểm thành viên', '/api/orders': 'đơn hàng',
  '/api/payments': 'thông tin thanh toán', '/api/users': 'danh sách khách hàng',
  '/api/users/customers': 'danh sách khách hàng',
};

export default function SourceScreen({ screen }: { screen: PageRoute }) {
  const store = useDb();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [query] = useSearchParams();
  const { db, rawId, idFor, notify } = store;
  const account = useAuthStore(state => state.user);
  const refresh = store.refresh;
  const [syncError, setSyncError] = useState('');
  const pauseSync = useRef(false);
  pauseSync.current = store.busy || store.loading;
  const refreshOrders = store.refreshOrders;
  useEffect(() => {
    if (!account?.token || !['pos-orders', 'kds-terminal'].includes(screen)) return;
    setSyncError('');
    return startOrderSync(signal => refreshOrders(screen === 'pos-orders' ? 'counter' : 'all', signal), setSyncError, {
      paused: () => pauseSync.current || document.visibilityState === 'hidden' || !!document.querySelector('[role="dialog"]'),
      schedule: (callback, delay) => setTimeout(callback, delay), cancel: clearTimeout,
      listen: callback => {
        document.addEventListener('visibilitychange', callback); window.addEventListener('focus', callback);
        return () => { document.removeEventListener('visibilitychange', callback); window.removeEventListener('focus', callback); };
      },
    });
  }, [screen, account?.token, refreshOrders]);
  useEffect(() => {
    // Checkout uses the existing API pages; reload their changes when returning.
    if (['orders', 'bill', 'pos-orders', 'kds-terminal', 'delivery-orders', 'delivery-report', 'delivery-cod'].includes(screen)) void refresh();
  }, [screen, location.key, refresh]);
  const onNavigate = (route: PageRoute) => navigate(PATHS[route] || (route.startsWith('admin-') ? '/admin/' + route.slice(6) : '/' + route));
  const selectProduct = (id: number) => {
    const product = db.products.find(product => product.id === id);
    if (product) navigate('/products/' + rawId(product.id));
  };
  const add = (product: Product, size?: string, quantity = 1, customization?: CartItem['customization']) => {
    if (!product.is_available) { notify('Sản phẩm này đã ngừng bán.'); return false; }
    const selectedSize = size || Object.keys(product.variants_config?.sizes || { M: 0 })[0] || 'M';
    const cart = useCartStore.getState();
    const existing = cart.items.find(line => line.productId === rawId(product.id) && line.size === selectedSize);
    if (existing && hasDifferentOptions(existing, customization)) {
      notify('Món và size này đã có trong giỏ với tùy chọn khác. Hãy xóa món cũ trong giỏ trước khi đổi đường, đá hoặc ghi chú.');
      return false;
    }
    if ((existing?.quantity || 0) + quantity > 99) { notify('Mỗi món và size chỉ được đặt tối đa 99 ly.'); return false; }
    const catalog: CatalogProduct = { _id: rawId(product.id), name: product.name, basePrice: product.base_price, imageUrl: product.image_url || '', description: product.description || '', isAvailable: product.is_available, variantsConfig: { sizes: product.variants_config?.sizes }, category: { _id: rawId(product.category_id), name: db.categories.find(category => category.id === product.category_id)?.name || '' } };
    for (let i = 0; i < quantity; i++) useCartStore.getState().addProduct(catalog, selectedSize);
    if (customization) {
      const current = useCartStore.getState();
      current.replace(current.items.map(line => line.productId === catalog._id && line.size === selectedSize ? { ...line, customization } : line), current.ownerId);
    }
    notify(`Đã thêm ${product.name} vào giỏ hàng.`);
    return true;
  };
  const addCustom = (item: CartItem, goToCart = true) => {
    const product = db.products.find(product => product.id === item.product_id);
    if (!product) return;
    if (item.customization.topping?.length) { notify('Đặt thêm topping hiện chưa khả dụng. Vui lòng bỏ topping để tiếp tục.'); return; }
    if (!add(product, item.customization.size, item.quantity, item.customization)) return;
    if (goToCart) navigate('/cart');
  };
  const openBill = (id: number) => navigate('/bill?orderId=' + rawId(id));
  const openPayment = (id: number) => navigate('/payment?orderId=' + rawId(id));
  const orderId = query.get('orderId');
  const requestedProduct = params.id || query.get('productId');
  const productId = requestedProduct ? idFor('products', requestedProduct) : db.products[0]?.id;
  const props = { onNavigate, onShowToast: notify };
  const needed: Partial<Record<PageRoute, string[]>> = {
    home: ['/api/products', '/api/categories', '/api/shop-settings'],
    menu: ['/api/products', '/api/categories'], customize: ['/api/products', '/api/categories'],
    profile: ['/api/auth/me', '/api/loyalty-transactions'],
    'admin-products': ['/api/products', '/api/categories'],
    'pos-create': ['/api/products', '/api/categories', '/api/users', '/api/users/customers'],
    'pos-orders': account?.position === 'BARISTA' ? ['/api/orders'] : ['/api/orders', '/api/payments'], 'kds-terminal': ['/api/orders'],
    'delivery-orders': ['/api/orders'], 'delivery-report': ['/api/orders'],
    'delivery-cod': ['/api/orders', '/api/payments'], orders: ['/api/orders'],
    bill: ['/api/orders', '/api/payments', '/api/shop-settings'],
  };
  const missing = (needed[screen] || []).filter(path => store.unavailable.includes(path));
  if (store.loading) return <div className="grid min-h-[60vh] place-items-center"><p className="animate-pulse text-sm text-stone-500">Đang tải dữ liệu cửa hàng…</p></div>;

  return <div>
    {syncError && ['pos-orders', 'kds-terminal'].includes(screen) && <p role="alert" className="mx-4 my-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Chưa cập nhật được đơn mới: {syncError}. Hệ thống sẽ tự thử lại; danh sách hiện tại có thể đã cũ.</p>}
    {account?.position === 'BARISTA' && ['pos-orders', 'kds-terminal'].includes(screen) && <nav aria-label="Màn hình Barista" className="flex gap-4 border-b border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-primary"><Link to="/cashier/orders">Danh sách đơn tại quầy</Link><Link to="/barista">Pha chế</Link></nav>}
    {['pos-create', 'pos-orders', 'kds-terminal', 'delivery-orders', 'delivery-report', 'delivery-cod'].includes(screen) && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-2 text-xs text-stone-600"><Link to="/" className="font-semibold text-primary">← Trang chủ Aura Café</Link><div className="flex items-center gap-4">{(account?.role === 'ADMIN' || ['CASHIER', 'MANAGER'].includes(account?.position || '')) && <Link to="/cashier/payments" className="font-semibold">Thanh toán tại quầy</Link>}{account?.role === 'STAFF' && <Link to="/my-schedule">Lịch làm của tôi</Link>}<span>{account?.fullName}</span><button onClick={() => { useAuthStore.getState().logout(); navigate('/'); }} className="font-semibold text-red-700">Đăng xuất</button></div></div>}
    {missing.length > 0 && <div role="alert" className="mx-4 my-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><span>Chưa tải được: {[...new Set(missing.map(path => DATA_LABELS[path] || 'dữ liệu cửa hàng'))].join(', ')}. Vui lòng thử lại.</span><button onClick={() => void store.refresh()} className="font-bold underline">Thử lại</button></div>}
    {store.error && <p role="alert" className="mx-4 my-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{store.error}</p>}
    {store.notice && !store.error && <p role="status" className="mx-4 my-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{store.notice}</p>}
    <div key={`${location.pathname}:${store.revision}`} aria-busy={store.busy} className={store.busy ? 'pointer-events-none opacity-70' : ''}>
      {screen === 'home' && <HomePage onNavigate={onNavigate} onSelectProduct={selectProduct} onQuickAdd={product => add(product)} />}
      {screen === 'menu' && <MenuPage onSelectProduct={selectProduct} searchFilter={query.get('search') || ''} />}
      {screen === 'customize' && (db.products.some(product => product.id === productId) ? <CustomizePage key={productId} productId={productId!} onNavigate={onNavigate} onAddToCart={addCustom} /> : <div className="p-12 text-center text-stone-500">Không tìm thấy sản phẩm. <button onClick={() => navigate('/menu')} className="text-primary underline">Về thực đơn</button></div>)}
      {screen === 'profile' && <ProfilePage {...props} />}
      {screen === 'orders' && <OrdersPage {...props} onOpenBill={openBill} onOpenPayment={openPayment} onReorder={id => { for (const line of db.order_items.filter(line => line.order_id === id)) { const product = db.products.find(product => product.id === line.product_id && product.is_available); if (product) add(product, line.customization?.size, line.quantity); } navigate('/cart'); }} />}
      {screen === 'bill' && <BillPage {...props} orderId={orderId ? idFor('orders', orderId) : null} onSelectOrder={openBill} />}
      {screen === 'pos-create' && <PosCreateOrderPage {...props} />}
      {screen === 'pos-orders' && <PosOrdersPage {...props} onOpenBill={openBill} />}
      {screen === 'kds-terminal' && <KdsTerminalPage {...props} />}
      {screen === 'delivery-orders' && <DeliveryOrdersPage {...props} />}
      {screen === 'delivery-report' && <DeliveryProblemPage {...props} />}
      {screen === 'delivery-cod' && <DeliveryCodPage {...props} />}
      {screen === 'admin-products' && <AdminProductsPage {...props} />}
    </div>
    {store.busy && <div role="status" className="fixed bottom-5 left-1/2 z-[150] -translate-x-1/2 rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">Đang lưu dữ liệu…</div>}
  </div>;
}
