
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import AdminStockPage from './pages/admin/AdminStockPage';
import AdminRestockPage from './pages/admin/AdminRestockPage';
import AdminSuppliersPage from './pages/admin/AdminSuppliersPage';
import AdminPurchasesPage from './pages/admin/AdminPurchasesPage';
import AdminPlaceholderPage from './pages/admin/AdminPlaceholderPage';
import CashierDashboard from './pages/pos/PosDashboardPage';
import CounterPaymentsPage from './pages/pos/CounterPaymentsPage';
import PosHandoverPage from './pages/pos/PosHandoverPage';
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
import { DbContextProvider } from './data/DbContext';
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
    else if (route.startsWith('admin-')) navigate(`/admin/${route.replace('admin-', '')}`);
    else navigate(`/${route}`);
  };

  // Chặn truy cập trực tiếp vào các route bảo vệ khi chưa đăng nhập
  useEffect(() => {
    const path = location.pathname;
    if (!user) {
      if (['/admin', '/admin/categories', '/cashier', '/barista', '/delivery', '/profile'].some(p => path.startsWith(p))) {
        navigate('/');
        setIsAuthOpen(true);
      }
    }
  }, [user, location.pathname, navigate]);

  const isDedicatedScreen = location.pathname.startsWith('/admin') || ['/cashier', '/barista'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {!isDedicatedScreen && (
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
      )}
      <main className={`flex-1 ${!isDedicatedScreen ? 'pt-20' : ''}`}>
        <Routes>
          <Route path="/" element={<HomeContainer />} />
          <Route path="/home" element={<HomeContainer />} />
          
          {/* Main User Routes */}
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/orders" element={<OrdersPage onRequestAuth={() => setIsAuthOpen(true)} />} />
          <Route path="/checkout" element={<CheckoutPage onRequestAuth={() => setIsAuthOpen(true)} />} />
          <Route path="/payment" element={<PaymentPage onRequestAuth={() => setIsAuthOpen(true)} />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/profile" element={user ? <CustomerDashboard /> : <Navigate to="/" />} />

          {/* Role Dashboards - phân quyền frontend */}
          <Route
            path="/admin"
            element={user?.role === 'ADMIN' ? <AdminDashboard /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/categories"
            element={user?.role === 'ADMIN' ? <AdminCategoriesPage onNavigate={handleNavigate} /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/products"
            element={
              user?.role === 'ADMIN' ? (
                <AdminPlaceholderPage
                  route="admin-products"
                  title="16. Quản lý Sản phẩm & Giá bán"
                  subtitle="Màn hình quản lý danh sách sản phẩm, giá bán và cấu hình kích cỡ / topping."
                  table="products"
                  branch="feature/product-management"
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/admin/recipes"
            element={
              user?.role === 'ADMIN' ? (
                <AdminPlaceholderPage
                  route="admin-recipes"
                  title="17. Công thức pha chế (BOM)"
                  subtitle="Màn hình thiết lập định mức nguyên vật liệu tiêu hao cho từng món đồ uống."
                  table="product_ingredients"
                  branch="feature/recipe-management"
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/admin/orders"
            element={
              user?.role === 'ADMIN' ? (
                <AdminPlaceholderPage
                  route="admin-orders"
                  title="32. Quản lý Đơn hàng"
                  subtitle="Màn hình theo dõi toàn bộ hóa đơn và đơn bán hàng từ POS và online."
                  table="orders"
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/admin/ingredients"
            element={
              user?.role === 'ADMIN' ? (
                <AdminPlaceholderPage
                  route="admin-ingredients"
                  title="18. Kho Nguyên liệu"
                  subtitle="Màn hình danh mục nguyên vật liệu dùng trong pha chế và bếp."
                  table="ingredients"
                  branch="feature/ingredient-management"
                />
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
          <Route
            path="/admin/customers"
            element={
              user?.role === 'ADMIN' ? (
                <AdminPlaceholderPage
                  route="admin-customers"
                  title="28. Quản lý Khách hàng"
                  subtitle="Màn hình danh sách khách hàng thân thiết, điểm tích lũy và lịch sử giao dịch."
                  table="users"
                  branch="feature/customer-management"
                />
              ) : (
                <Navigate to="/" />
              )
            }
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
              user?.role === 'ADMIN' || user?.position === 'CASHIER' || user?.position === 'MANAGER'
                ? <CashierDashboard />
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
              user?.role === 'ADMIN' || user?.position === 'BARISTA'
                ? <BaristaDashboard />
                : <Navigate to="/" />
            }
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </main>
      {!isDedicatedScreen && <Footer onNavigate={handleNavigate} />}

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onLoginSuccess={(userData) => {
          // Lưu vào global store
          const userPayload = {
            _id: userData._id,
            fullName: userData.fullName,
            phone: userData.phone,
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
    <BrowserRouter>
      <DbContextProvider>
        <AppLayout />
      </DbContextProvider>
    </BrowserRouter>
  );
}

export default App;

