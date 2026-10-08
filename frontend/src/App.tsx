
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import CashierDashboard from './pages/CashierDashboard';
import BaristaDashboard from './pages/BaristaDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import Dashboard from './pages/Dashboard'; // Keep as fallback

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/cashier" element={<CashierDashboard />} />
        <Route path="/barista" element={<BaristaDashboard />} />
        <Route path="/customer" element={<CustomerDashboard />} />

        {/* Fallback */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
