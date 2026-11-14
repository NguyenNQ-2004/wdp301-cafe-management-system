import { Link, useNavigate } from 'react-router-dom';
import type { PageRoute } from '../interface/types';
import { PosHeader } from '../interface/pages/pos/PosHeader';
import useAuthStore from '../store/authStore';
import StaffWorkNav from './StaffWorkNav';

const paths: Partial<Record<PageRoute, string>> = {
  'pos-create': '/cashier',
  'pos-orders': '/cashier/orders',
  'pos-shift': '/cashier/handover?mode=close',
  'pos-handover': '/cashier/handover?mode=handover',
  'pos-restock': '/cashier/restock-requests'
};

export default function CashierWorkHeader({ currentRoute, onNavigate }: {
  currentRoute: PageRoute;
  onNavigate?: (route: PageRoute) => void;
}) {
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  return <>
    {user?.role === 'STAFF' ? <StaffWorkNav showCounterPayments={['CASHIER', 'MANAGER'].includes(user.position || '')} /> : <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-2 text-xs text-stone-600"><Link to="/" className="font-semibold text-primary">← Trang chủ Aura Café</Link><div className="flex items-center gap-4">{user?.role === 'ADMIN' && <Link to="/cashier/payments">Thanh toán tại quầy</Link>}<span>{user?.fullName}</span><button type="button" onClick={() => { useAuthStore.getState().logout(); navigate('/'); }} className="font-semibold text-red-700">Đăng xuất</button></div></div>}
    <PosHeader currentRoute={currentRoute} onNavigate={onNavigate || (route => navigate(paths[route] || '/cashier'))} />
  </>;
}
