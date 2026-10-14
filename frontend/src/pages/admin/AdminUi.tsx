import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

// ==========================================
// ADMIN SIDEBAR NAVIGATION
// ==========================================

export interface NavSection {
  title: string;
  items: {
    path: string;
    label: string;
    icon: string;
    table: string;
  }[];
}

export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: 'Báo cáo',
    items: [
      { path: '/admin', label: 'Tổng quan', icon: 'dashboard', table: 'orders, payments' }
    ]
  },
  {
    title: 'Bán hàng',
    items: [
      { path: '/cashier', label: 'POS Bán hàng', icon: 'point_of_sale', table: 'orders' },
      { path: '/barista', label: 'KDS Pha chế', icon: 'soup_kitchen', table: 'order_items' },
      { path: '/menu', label: 'Thực đơn đồ uống', icon: 'restaurant_menu', table: 'products' }
    ]
  },
  {
    title: 'Khách hàng & Hội viên (Cụm 4)',
    items: [
      { path: '/admin/customers', label: 'Khách hàng (CRM)', icon: 'contact_page', table: 'users (role=CUSTOMER)' },
      { path: '/admin/memberships', label: 'Tích điểm & Hạng thẻ', icon: 'loyalty', table: 'loyalty_transactions' },
      { path: '/admin/complaints', label: 'Đánh giá & Khiếu nại', icon: 'feedback', table: 'customer_reviews' }
    ]
  }
];

export const AdminSidebar: React.FC<{ activePath?: string }> = ({ activePath }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const currentPath = activePath || location.pathname;

  return (
    <aside className="w-full lg:w-72 bg-white border-r border-stone-200 shrink-0 p-4 space-y-5 flex flex-col justify-between shadow-2xs">
      <div className="space-y-5">
        <div className="px-2 flex items-center justify-between">
          <div 
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-red-700 group-hover:bg-red-800 flex items-center justify-center text-white shadow-sm transition-colors">
              <span className="material-symbols-outlined text-[22px]">local_cafe</span>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm tracking-tight text-red-800">AURA CAFÉ</span>
              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Quản trị hệ thống</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            title="Về trang chủ khách hàng"
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
          </button>
        </div>

        <nav className="space-y-4 text-xs font-semibold">
          {ADMIN_NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-2 text-[10px] text-stone-400 uppercase tracking-wider font-bold">
                {section.title}
              </p>
              {section.items.map((item) => {
                const isActive = currentPath === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    title={`Thao tác với bảng: ${item.table}`}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-red-700 text-white shadow-xs font-bold'
                        : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-100 text-red-800 font-bold flex items-center justify-center text-xs">
            {user?.fullName?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-stone-800 block truncate">{user?.fullName || 'Quản trị viên'}</span>
            <span className="text-[10px] text-stone-400 block font-mono truncate">{user?.phone}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-stone-200 text-[10px]">
          <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold font-mono">
            {user?.role} {user?.position && `(${user.position})`}
          </span>
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="text-stone-500 hover:text-red-600 font-bold flex items-center gap-0.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[12px]">logout</span>
            Thoát
          </button>
        </div>
      </div>
    </aside>
  );
};

// ==========================================
// ADMIN LAYOUT
// ==========================================

export const AdminLayout: React.FC<{
  title: string;
  subtitle?: string;
  table?: string;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
  children: React.ReactNode;
  activePath?: string;
}> = ({ title, subtitle, table, actions, stats, children, activePath }) => (
  <div className="min-h-screen bg-stone-50 flex flex-col lg:flex-row pb-12 w-full">
    <AdminSidebar activePath={activePath} />
    <main className="flex-1 p-4 sm:p-6 space-y-4 max-w-7xl min-w-0">
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            {table && (
              <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-500 font-mono text-[10px] font-bold">
                Bảng: {table}
              </span>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight mt-1">{title}</h1>
            {subtitle && <p className="text-xs text-stone-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap text-xs">{actions}</div>}
        </div>
        {stats && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-stone-100 text-xs">{stats}</div>}
      </div>
      {children}
    </main>
  </div>
);

// ==========================================
// UI ATOMS: StatCard, PrimaryButton, Modal, etc.
// ==========================================

export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'danger' | 'success' | 'primary';
}> = ({ label, value, hint, tone = 'default' }) => {
  const tones = {
    default: 'bg-stone-50 border-stone-200 text-stone-900',
    danger: 'bg-rose-50 border-rose-200 text-rose-700',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    primary: 'bg-red-50/60 border-red-200 text-red-800'
  };
  return (
    <div className={`p-3.5 rounded-xl border ${tones[tone]} transition-all`}>
      <span className="text-[10px] uppercase font-bold block opacity-70 tracking-wider">{label}</span>
      <span className="text-xl font-black font-mono mt-0.5 block">{value}</span>
      {hint && <span className="text-[11px] opacity-80 block mt-0.5">{hint}</span>}
    </div>
  );
};

export const PrimaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: string }
> = ({ icon, children, className = '', ...rest }) => (
  <button
    {...rest}
    className={`px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer text-xs ${className}`}
  >
    {icon && <span className="material-symbols-outlined text-[16px]">{icon}</span>}
    {children}
  </button>
);

export const GhostButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: string }
> = ({ icon, children, className = '', ...rest }) => (
  <button
    {...rest}
    className={`px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl border border-stone-200 flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer text-xs ${className}`}
  >
    {icon && <span className="material-symbols-outlined text-[16px]">{icon}</span>}
    {children}
  </button>
);

export const Badge: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = 'bg-stone-100 text-stone-700',
  children
}) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${className}`}>
    {children}
  </span>
);

export const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-fade-in">
    <div
      className={`bg-white rounded-2xl shadow-2xl w-full ${
        wide ? 'max-w-3xl' : 'max-w-lg'
      } overflow-hidden flex flex-col max-h-[90vh]`}
    >
      <div className="flex justify-between items-center p-4 border-b border-stone-100 bg-stone-50">
        <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">{title}</h3>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-200/50 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      <div className="p-5 overflow-y-auto">{children}</div>
    </div>
  </div>
);

export const Field: React.FC<{
  label: string;
  column?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, column, children, className = '' }) => (
  <label className={`block space-y-1 ${className}`}>
    <span className="text-xs font-bold text-stone-700 flex items-center justify-between gap-2">
      <span>{label}</span>
      {column && <span className="font-mono text-[10px] font-normal text-stone-400">{column}</span>}
    </span>
    {children}
  </label>
);

export const FormActions: React.FC<{
  onCancel: () => void;
  submitLabel?: string;
  loading?: boolean;
}> = ({ onCancel, submitLabel = 'Lưu thay đổi', loading = false }) => (
  <div className="flex justify-end items-center gap-2 pt-4 border-t border-stone-100">
    <GhostButton type="button" onClick={onCancel} disabled={loading}>
      Hủy bỏ
    </GhostButton>
    <PrimaryButton type="submit" disabled={loading}>
      {loading ? 'Đang xử lý...' : submitLabel}
    </PrimaryButton>
  </div>
);

export const inputCls =
  'w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none focus:border-red-600 focus:bg-white transition-all text-stone-900';
