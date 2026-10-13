
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useAuthStore from './store/authStore';
import AdminDashboard from './pages/admin/AdminDashboardPage';
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

// Wrapper component to provide Header and AuthModal context to all routes
const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login } = useAuthStore();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const getRouteFromPath = (path: string): PageRoute => {
    const cleanPath = path.replace('/', '') || 'home';
    return cleanPath as PageRoute;
  };

  const handleNavigate = (route: PageRoute) => {
    if (route === 'home') navigate('/');
    else navigate(`/${route}`);
  };

  // Redirect unauthenticated users if they try to access protected roles directly
  useEffect(() => {
    const path = location.pathname;
    if (!user) {
      // If not logged in and trying to access dashboards, redirect to home and open auth
      if (['/admin', '/cashier', '/barista', '/profile'].includes(path)) {
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
        cartCount={0}
        onOpenAuth={() => {
          if (user) {
            // Navigate to respective dashboard if already logged in
            if (user.role === 'ADMIN') navigate('/admin');
            else if (user.position === 'CASHIER') navigate('/cashier');
            else if (user.position === 'BARISTA') navigate('/barista');
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
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/profile" element={user ? <CustomerDashboard /> : <Navigate to="/" />} />

          {/* Role Dashboards */}
          <Route path="/admin" element={user?.role === 'ADMIN' ? <AdminDashboard /> : <Navigate to="/" />} />
          <Route path="/cashier" element={user?.position === 'CASHIER' || user?.role === 'ADMIN' ? <CashierDashboard /> : <Navigate to="/" />} />
          <Route path="/barista" element={user?.position === 'BARISTA' || user?.role === 'ADMIN' ? <BaristaDashboard /> : <Navigate to="/" />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer onNavigate={handleNavigate} />
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onLoginSuccess={(userData) => {
          // Commit to global store
          login({
            _id: userData._id,
            fullName: userData.fullName,
            phone: userData.phone,
            role: userData.role,
            position: userData.position,
            token: userData.token
          });
          
          setIsAuthOpen(false);
          
          // Role-based navigation
          if (userData.role === 'ADMIN') navigate('/admin');
          else if (userData.role === 'CASHIER' || userData.position === 'CASHIER') navigate('/cashier');
          else if (userData.role === 'BARISTA' || userData.position === 'BARISTA') navigate('/barista');
          else navigate('/profile');
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
