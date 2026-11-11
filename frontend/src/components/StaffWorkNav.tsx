import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

interface StaffWorkNavProps {
  showCounterPayments?: boolean;
}

export default function StaffWorkNav({ showCounterPayments = false }: StaffWorkNavProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const workPath = user?.position === 'BARISTA'
    ? '/barista'
    : user?.position === 'SHIPPER'
      ? '/delivery'
      : '/cashier';
  const onWorkHome = user?.position === 'SHIPPER'
    ? location.pathname === workPath || location.pathname.startsWith(`${workPath}/`)
    : location.pathname === workPath;
  const onCounterPayments = location.pathname === '/cashier/payments';
  const onSchedule = location.pathname === '/my-schedule';
  const onAttendance = ['/my-attendance', '/staff/attendance', '/cashier/shift'].includes(location.pathname);
  const navLinkClass = (active: boolean) => active ? 'rounded bg-red-50 px-1.5 font-semibold text-red-700' : 'text-stone-600 hover:text-stone-900';

  return (
    <nav aria-label="Điều hướng nhân viên" className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-2 text-xs text-stone-600">
      <div className="ml-auto flex items-center gap-4">
        {showCounterPayments && <Link to="/cashier/payments" aria-current={onCounterPayments ? 'page' : undefined} className={navLinkClass(onCounterPayments)}>Thanh toán tại quầy</Link>}
        <Link to={workPath} aria-current={onWorkHome ? 'page' : undefined} className={navLinkClass(onWorkHome)}>
          Bảng công việc
        </Link>
        <Link to="/my-schedule" aria-current={onSchedule ? 'page' : undefined} className={navLinkClass(onSchedule)}>
          Lịch làm của tôi
        </Link>
        <Link to="/my-attendance" aria-current={onAttendance ? 'page' : undefined} className={navLinkClass(onAttendance)}>
          Chấm công của tôi
        </Link>
        <span>{user?.fullName || 'Nhân viên'}</span>
        <button type="button" onClick={() => { logout(); navigate('/', { replace: true }); }} className="font-semibold text-red-700 hover:text-red-800">
          Đăng xuất
        </button>
      </div>
    </nav>
  );
}