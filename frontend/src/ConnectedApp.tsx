import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useAuthStore from './store/authStore';
import useCartStore from './store/cartStore';
import useCartSync from './hooks/useCartSync';
import { shopApi, ShopApiError } from './lib/shopApi';
import AdminDashboard from './pages/admin/AdminDashboardPage';
import AdminShiftsPage from './pages/admin/AdminShiftsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminSchedulesPage from './pages/admin/AdminSchedulesPage';
import AdminAttendancePage from './pages/admin/AdminAttendancePage';
import AdminHandoversPage from './pages/admin/AdminHandoversPage';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminStockPage from './pages/admin/AdminStockPage';
import AdminRestockPage from './pages/admin/AdminRestockPage';
import AdminRestockRequestsPage from './pages/admin/AdminRestockRequestsPage';
import AdminSuppliersPage from './pages/admin/AdminSuppliersPage';
import AdminPurchasesPage from './pages/admin/AdminPurchasesPage';
import AdminRecipesPage from './pages/admin/AdminRecipesPage';
import AdminIngredientsPage from './pages/admin/AdminIngredientsPage';
import AdminPlaceholderPage from './pages/admin/AdminPlaceholderPage';
import AdminCustomersPage from './pages/admin/AdminCustomersPage';
import AdminMembershipsPage from './pages/admin/AdminMembershipsPage';
import AdminComplaintsPage from './pages/admin/AdminComplaintsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminDeliveryAreasPage from './pages/admin/AdminDeliveryAreasPage';
import CounterPaymentsPage from './pages/pos/CounterPaymentsPage';
import PosHandoverPage from './pages/pos/PosHandoverPage';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentPage from './pages/PaymentPage';
import FeedbackPage from './pages/FeedbackPage';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { DbContextProvider } from './data/DbContext';
import type { PageRoute } from './types';
import SourceScreen from './interface/SourceScreen';
import { isSafeLocalPath } from './lib/RedirectUtil';
import { DbProvider as InterfaceProvider } from './interface/LiveProvider';

/** Trả về đường dẫn phù hợp sau khi đăng nhập */
const getRoleRedirectPath = (user: { role: string; position?: string } | null, currentPath: string = '/'): string => {
  if (!user) return '/';
  if (user.role === 'ADMIN') return '/admin';
  if (user.role === 'STAFF') {
    if (user.position === 'CASHIER' || user.position === 'MANAGER') return '/cashier';
    if (user.position === 'BARISTA') return '/barista';
    if (user.position === 'SHIPPER') return '/delivery';
  }
  // CUSTOMER: Không chuyển sang trang profile đơn độc, ở lại trang hiện tại hoặc về Trang chủ để tiếp tục mua hàng
  return currentPath && isSafeLocalPath(currentPath) && !['/login', '/register'].includes(currentPath) ? currentPath : '/';
};

// Wrapper component to provide Header and AuthModal context to all routes
const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login, logout } = useAuthStore();
  const cartCount = useCartStore((state) => state.items.reduce((count, item) => count + item.quantity, 0));
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const requestedTab = new URLSearchParams(location.search).get('tab');
  const authTab = location.pathname === '/register' || requestedTab === 'register' ? 'register' : location.pathname === '/forgot-password' || requestedTab === 'forgot' ? 'forgot' : 'login';
  const authRoute = ['/login', '/register', '/forgot-password'].includes(location.pathname) || ['login', 'register', 'forgot'].includes(requestedTab || '');
  useCartSync(user?.role === 'CUSTOMER' ? user : null);

  useEffect(() => {
    if (!user?.token) return;
    const token = user.token;
    let active = true;
    shopApi<{ _id: string; fullName: string; phone: string; address?: string; role: string; position?: string }>('/api/auth/me', { token })
      .then((account) => {
        if (active && useAuthStore.getState().user?.token === token) login({ ...account, token });
      })
      .catch((error: unknown) => {
        if (active && error instanceof ShopApiError && [401, 403].includes(error.status) && useAuthStore.getState().user?.token === token) logout();
      });
    return () => { active = false; };
  }, [user?.token, login, logout]);

  const getRouteFromPath = (path: string): PageRoute => {
    const cleanPath = path.replace('/', '') || 'home';
    return cleanPath as PageRoute;
  };

  const handleNavigate = (route: PageRoute) => {
    if (route === 'home') navigate('/');
    else if (route === 'admin-loyalty') navigate('/admin/memberships');
    else if (route.startsWith('admin-')) navigate(`/admin/${route.replace('admin-', '')}`);
    else navigate(`/${route}`);
  };

  // Chặn truy cập trực tiếp vào các route bảo vệ khi chưa đăng nhập
  useEffect(() => {
    const path = location.pathname;
    if (!user) {
      if (['/admin', '/cashier', '/barista', '/delivery', '/profile', '/bill'].some(prefix => path.startsWith(prefix))) {
        navigate('/');
        setIsAuthOpen(true);
      }
    }
  }, [user, location.pathname, navigate]);

  const isDedicatedScreen = ['/admin', '/cashier', '/barista', '/delivery'].some(prefix => location.pathname.startsWith(prefix));

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {!isDedicatedScreen && (
        <Header
          currentRoute={getRouteFromPath(location.pathname)}
          onNavigate={handleNavigate}
          cartCount={cartCount}
          user={user}
          onLogout={() => { logout(); setIsAuthOpen(false); navigate('/', { replace: true }); }}
          onSearch={(query) => navigate(query ? `/menu?search=${encodeURIComponent(query)}` : '/menu')}
          onOpenAuth={() => {
            if (user) {
              // Nếu đã đăng nhập thì mở profile hoặc dashboard tương ứng
              if (user.role === 'ADMIN') navigate('/admin');
              else if (user.role === 'STAFF' && user.position === 'CASHIER') navigate('/cashier');
              else if (user.role === 'STAFF' && user.position === 'BARISTA') navigate('/barista');
              else if (user.role === 'STAFF' && user.position === 'SHIPPER') navigate('/delivery');
              else if (user.role === 'STAFF' && user.position === 'MANAGER') navigate('/cashier');
              else navigate('/profile');
            } else {
              navigate('/login');
            }
          }}
        />
      )}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<SourceScreen screen="home" />} />
          <Route path="/home" element={<SourceScreen screen="home" />} />
          <Route path="/customer" element={<Navigate to="/" replace />} />
          <Route path="/admin/feedback" element={<Navigate to="/admin/complaints" replace />} />
          <Route path="/admin/loyalty" element={<Navigate to="/admin/memberships" replace />} />
          <Route path="/admin/restock-requests" element={user?.role === 'ADMIN' ? <AdminRestockRequestsPage /> : <Navigate to="/" />} />
          <Route path="/counter-orders" element={<Navigate to="/cashier/orders" replace />} />
          <Route path="/counter-order" element={<Navigate to="/cashier" replace />} />
          <Route path="/staff/schedule" element={<Navigate to="/my-schedule" replace />} />
          <Route path="/staff/attendance" element={<Navigate to="/my-attendance" replace />} />

          {/* Main User Routes */}
          <Route path="/menu" element={<SourceScreen screen="menu" />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/orders" element={user ? <SourceScreen screen="orders" /> : <OrdersPage onRequestAuth={() => setIsAuthOpen(true)} />} />
          <Route path="/checkout" element={<CheckoutPage onRequestAuth={() => setIsAuthOpen(true)} />} />
          <Route path="/payment" element={<PaymentPage onRequestAuth={() => setIsAuthOpen(true)} />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/profile" element={user ? <SourceScreen screen="profile" /> : <Navigate to="/" />} />

          {/* Role Dashboards - phân quyền frontend */}
          <Route
            path="/admin"
            element={user?.role === 'ADMIN' ? <AdminDashboard /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/reports"
            element={user?.role === 'ADMIN' ? <AdminReportsPage /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/categories"
            element={user?.role === 'ADMIN' ? <AdminCategoriesPage onNavigate={handleNavigate} /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/products"
            element={
              user?.role === 'ADMIN' ? (
                <SourceScreen screen="admin-products" />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/admin/recipes"
            element={
              user?.role === 'ADMIN' ? (
                <AdminRecipesPage onNavigate={handleNavigate} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/admin/orders"
            element={
              user?.role === 'ADMIN' ? (
                <AdminOrdersPage onNavigate={handleNavigate} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/admin/ingredients"
            element={
              user?.role === 'ADMIN' ? (
                <AdminIngredientsPage onNavigate={handleNavigate} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/admin/inventory"
            element={
              user?.role === 'ADMIN' ? (
                <AdminStockPage />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/admin/restock"
            element={
              user?.role === 'ADMIN' ? (
                <AdminRestockPage />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/admin/suppliers"
            element={
              user?.role === 'ADMIN' ? (
                <AdminSuppliersPage />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/admin/purchases"
            element={
              user?.role === 'ADMIN' ? (
                <AdminPurchasesPage />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/admin/employees"
            element={user?.role === 'ADMIN' ? <AdminUsersPage /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/shifts"
            element={user?.role === 'ADMIN' ? <AdminShiftsPage /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/schedules"
            element={user?.role === 'ADMIN' ? <AdminSchedulesPage /> : <Navigate to="/" />}
          />
          <Route
            path="/my-schedule"
            element={user?.role === 'STAFF' ? <AdminSchedulesPage /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/attendance"
            element={user?.role === 'ADMIN' ? <AdminAttendancePage /> : <Navigate to="/" />}
          />
          <Route
            path="/my-attendance"
            element={user?.role === 'STAFF' ? <AdminAttendancePage /> : <Navigate to="/" />}
          />
          <Route path="/admin/handovers" element={user?.role === 'ADMIN' ? <AdminHandoversPage /> : <Navigate to="/" />} />
          <Route path="/admin/handover" element={<Navigate to="/admin/handovers" replace />} />
          <Route
            path="/admin/customers"
            element={
              user?.role === 'ADMIN' || (user?.role === 'STAFF' && ['CASHIER', 'MANAGER'].includes(user?.position || ''))
                ? <AdminCustomersPage />
                : <Navigate to="/" />
            }
          />
          <Route
            path="/admin/memberships"
            element={
              user?.role === 'ADMIN' || user?.role === 'STAFF'
                ? <AdminMembershipsPage />
                : <Navigate to="/" />
            }
          />
          <Route
            path="/admin/complaints"
            element={user?.role === 'ADMIN' ? <AdminComplaintsPage /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/settings"
            element={user?.role === 'ADMIN' ? <AdminSettingsPage /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/delivery-areas"
            element={user?.role === 'ADMIN' ? <AdminDeliveryAreasPage /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/*"
            element={
              user?.role === 'ADMIN' ? (
                <AdminPlaceholderPage
                  route="admin"
                  title="Tính năng đang được phát triển"
                  subtitle="Phân hệ này đang trong lộ trình phát triển của hệ thống Aura Café ERP."
                  table="system"
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/cashier"
            element={
              user?.role === 'ADMIN' || (user?.role === 'STAFF' && ['CASHIER', 'MANAGER'].includes(user.position || ''))
                ? <SourceScreen screen="pos-create" />
                : <Navigate to="/" />
            }
          />
          <Route
            path="/cashier/payments"
            element={user?.role === 'ADMIN' || (user?.role === 'STAFF' && ['CASHIER', 'MANAGER'].includes(user.position || '')) ? <CounterPaymentsPage /> : <Navigate to="/" />}
          />
          <Route
            path="/cashier/handover"
            element={user?.role === 'ADMIN' || (user?.role === 'STAFF' && ['CASHIER', 'MANAGER'].includes(user.position || '')) ? <PosHandoverPage /> : <Navigate to="/" />}
          />
          <Route
            path="/barista"
            element={
              user?.role === 'ADMIN' || (user?.role === 'STAFF' && user.position === 'BARISTA')
                ? <SourceScreen screen="kds-terminal" />
                : <Navigate to="/" />
            }
          />


          <Route path="/login" element={<SourceScreen screen="home" />} />
          <Route path="/register" element={<SourceScreen screen="home" />} />
          <Route path="/forgot-password" element={<SourceScreen screen="home" />} />
          <Route path="/products/:id" element={<SourceScreen screen="customize" />} />
          <Route path="/product" element={<SourceScreen screen="customize" />} />
          <Route path="/customize" element={<SourceScreen screen="customize" />} />
          <Route path="/bill" element={user ? <SourceScreen screen="bill" /> : <Navigate to="/login" />} />
          <Route path="/cashier/orders" element={user?.role === 'ADMIN' || (user?.role === 'STAFF' && ['CASHIER','MANAGER','BARISTA'].includes(user.position || '')) ? <SourceScreen screen="pos-orders" /> : <Navigate to="/" />} />
          <Route path="/cashier/shift" element={user?.role === 'STAFF' || user?.role === 'ADMIN' ? <AdminAttendancePage /> : <Navigate to="/" />} />
          <Route path="/delivery" element={user?.role === 'ADMIN' || (user?.role === 'STAFF' && user.position === 'SHIPPER') ? <SourceScreen screen="delivery-orders" /> : <Navigate to="/" />} />
          <Route path="/delivery/problems" element={user?.role === 'ADMIN' || (user?.role === 'STAFF' && user.position === 'SHIPPER') ? <SourceScreen screen="delivery-report" /> : <Navigate to="/" />} />
          <Route path="/delivery/cod" element={user?.role === 'ADMIN' || (user?.role === 'STAFF' && user.position === 'SHIPPER') ? <SourceScreen screen="delivery-cod" /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </main>
      {!isDedicatedScreen && <Footer onNavigate={handleNavigate} />}

      <AuthModal
        key={authTab}
        initialTab={authTab}
        isOpen={isAuthOpen || (authRoute && !user)}
        onClose={() => {
          setIsAuthOpen(false);
          if (authRoute && !useAuthStore.getState().user) navigate('/', { replace: true });
        }}
        onLoginSuccess={(userData) => {
          // Lưu vào global store
          const userPayload = {
            _id: userData._id,
            fullName: userData.fullName,
            phone: userData.phone,
            email: userData.email,
            address: userData.address,
            role: userData.role,
            position: userData.position,
            token: userData.token
          };
          login(userPayload);
          setIsAuthOpen(false);
          // Điều hướng mượt mà: Customer giữ nguyên trang hoặc về Trang chủ; Staff/Admin vào dashboard
          navigate(getRoleRedirectPath(userPayload, location.pathname));
        }}
      />
    </div>
  );
};

function App() {
  return (
      <DbContextProvider>
        <InterfaceProvider><AppLayout /></InterfaceProvider>
      </DbContextProvider>
  );
}

export default App;
