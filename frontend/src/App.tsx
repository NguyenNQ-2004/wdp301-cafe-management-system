
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useAuthStore from './store/authStore';
import useCartStore from './store/cartStore';
import useCartSync from './hooks/useCartSync';
import { shopApi, ShopApiError } from './lib/shopApi';
import AdminDashboard from './pages/admin/AdminDashboardPage';
import AdminCustomersPage from './pages/admin/AdminCustomersPage';
import CashierDashboard from './pages/pos/PosDashboardPage';
import BaristaDashboard from './pages/kds/KdsTerminalPage';
import CustomerDashboard from './pages/ProfilePage';
import HomeContainer from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentPage from './pages/PaymentPage';
import FeedbackPage from './pages/FeedbackPage';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import type { PageRoute } from './types';

/** Trả về đường dẫn phù hợp sau khi đăng nhập */
const getRoleRedirectPath = (user: { role: string; position?: string } | null, currentPath: string = '/'): string => {
  if (!user) return '/';
  if (user.role === 'ADMIN') return '/admin';
  if (user.role === 'STAFF') {
    if (user.position === 'CASHIER' || user.position === 'MANAGER') return '/cashier';
    if (user.position === 'BARISTA') return '/barista';
  }
  // CUSTOMER: Không chuyển sang trang profile đơn độc, ở lại trang hiện tại hoặc về Trang chủ để tiếp tục mua hàng
  return currentPath && currentPath !== '/login' ? currentPath : '/';
};

// Wrapper component to provide Header and AuthModal context to all routes
const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login, logout } = useAuthStore();
  const cartCount = useCartStore((state) => state.items.reduce((count, item) => count + item.quantity, 0));
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  useCartSync(user);

  useEffect(() => {
    if (!user?.token) return;
    const token = user.token;
    let active = true;
    shopApi<{ _id: string; fullName: string; phone: string; role: string; position?: string }>('/api/auth/me', { token })
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
    else navigate(`/${route}`);
  };

  // Chặn truy cập trực tiếp vào các route bảo vệ khi chưa đăng nhập
  useEffect(() => {
    const path = location.pathname;
    if (!user) {
      if (path.startsWith('/admin') || ['/cashier', '/barista', '/delivery', '/profile'].includes(path)) {
        navigate('/');
        setIsAuthOpen(true);
      }
    }
  }, [user, location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Header
        currentRoute={getRouteFromPath(location.pathname)}
        onNavigate={handleNavigate}
        cartCount={cartCount}
        onSearch={(query) => navigate(query ? `/menu?search=${encodeURIComponent(query)}` : '/menu')}
        onOpenAuth={() => {
          if (user) {
            // Nếu đã đăng nhập thì mở profile hoặc dashboard tương ứng
            if (user.role === 'ADMIN') navigate('/admin');
            else if (user.role === 'STAFF' && user.position === 'CASHIER') navigate('/cashier');
            else if (user.role === 'STAFF' && user.position === 'BARISTA') navigate('/barista');
            else navigate('/profile');
          } else {
            setIsAuthOpen(true);
          }
        }}
      />
      <main className="flex-1 pt-20">
        <Routes>
          <Route path="/" element={<HomeContainer />} />
          <Route path="/home" element={<HomeContainer />} />
          
          {/* Main User Routes */}
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/orders" element={<OrdersPage onRequestAuth={() => setIsAuthOpen(true)} />} />
          <Route path="/checkout" element={<CheckoutPage onRequestAuth={() => setIsAuthOpen(true)} />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/profile" element={user ? <CustomerDashboard /> : <Navigate to="/" />} />

          {/* Role Dashboards - phân quyền frontend */}
          <Route
            path="/admin"
            element={user?.role === 'ADMIN' ? <AdminDashboard /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/customers"
            element={
              user?.role === 'ADMIN' || (user?.role === 'STAFF' && ['CASHIER', 'MANAGER'].includes(user?.position || ''))
                ? <AdminCustomersPage />
                : <Navigate to="/" />
            }
          />
          <Route
            path="/cashier"
            element={
              user?.role === 'ADMIN' || user?.position === 'CASHIER' || user?.position === 'MANAGER'
                ? <CashierDashboard />
                : <Navigate to="/" />
            }
          />
          <Route
            path="/barista"
            element={
              user?.role === 'ADMIN' || user?.position === 'BARISTA'
                ? <BaristaDashboard />
                : <Navigate to="/" />
            }
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer onNavigate={handleNavigate} />
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onLoginSuccess={(userData) => {
          // Lưu vào global store
          const userPayload = {
            _id: userData._id,
            fullName: userData.fullName,
            phone: userData.phone,
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
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
