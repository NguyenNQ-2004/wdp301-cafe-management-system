import React from 'react';
import type { PageRoute } from '../../types';
import { AdminSidebar } from './AdminSidebar';

export { AdminSidebar } from './AdminSidebar';

export const inputCls =
  'w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] transition-all';

export interface AdminLayoutProps {
  route?: string;
  activePath?: string;
  onNavigate?: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
  table?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  beforeStats?: React.ReactNode;
  stats?: React.ReactNode;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  route,
  activePath,
  onNavigate,
  table,
  title,
  subtitle,
  actions,
  beforeStats,
  stats,
  children
}) => {
  return (
    <div className="flex bg-[#f8f9fa] min-h-screen w-full">
      {/* Sidebar */}
      <AdminSidebar currentRoute={route} activePath={activePath} onNavigate={onNavigate} />

      {/* Main content */}
      <main className="flex-1 min-h-screen p-4 sm:p-6 md:p-8 space-y-5 overflow-y-auto bg-[#f8f9fa] min-w-0">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs">
          <div>
            {table && (
              <div className="text-[11px] font-mono text-stone-400 mb-0.5">
                bảng: {table}
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-stone-500 text-xs mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap text-xs">{actions}</div>}
        </div>

        {beforeStats}

        {/* Stats Grid */}
        {stats && <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{stats}</div>}

        {/* Main Body */}
        <div>{children}</div>
      </main>
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
};

export const Field: React.FC<{
  label: string;
  column?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, column, children, className = '' }) => {
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between items-center text-stone-700 font-medium text-xs">
        <span className="font-bold">{label}</span>
        {column && <span className="font-mono text-[10px] text-stone-400 font-normal">{column}</span>}
      </div>
      {children}
    </div>
  );
};

export const PrimaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon?: string;
  }
> = ({ icon, onClick, children, className = '', type = 'button', disabled = false, ...rest }) => {
  return (
    <button
      {...rest}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 bg-[#800020] hover:bg-[#68001a] text-white font-bold rounded-xl text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${className}`}
    >
      {icon && <span className="material-symbols-outlined text-[16px]">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

export const GhostButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon?: string;
  }
> = ({ icon, children, className = '', type = 'button', disabled = false, ...rest }) => (
  <button
    {...rest}
    type={type}
    disabled={disabled}
    className={`px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl border border-stone-200 flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer text-xs ${className}`}
  >
    {icon && <span className="material-symbols-outlined text-[16px]">{icon}</span>}
    <span>{children}</span>
  </button>
);

export const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
    <div
      className={`bg-white rounded-2xl shadow-2xl w-full ${
        wide ? 'max-w-3xl' : 'max-w-lg'
      } overflow-hidden flex flex-col max-h-[90vh]`}
    >
      <div className="flex justify-between items-center p-4 border-b border-stone-100 bg-stone-50">
        <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">{title}</h3>
        <button
          type="button"
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

export const FormActions: React.FC<{
  onCancel: () => void;
  submitLabel?: string;
  loading?: boolean;
}> = ({ onCancel, submitLabel = 'Lưu thay đổi', loading = false }) => (
  <div className="pt-4 flex justify-end items-center gap-3 border-t border-stone-100">
    <button
      type="button"
      onClick={onCancel}
      disabled={loading}
      className="px-4 py-2.5 bg-stone-100 text-stone-700 font-bold rounded-xl text-xs hover:bg-stone-200 transition-colors cursor-pointer disabled:opacity-50"
    >
      Hủy bỏ
    </button>
    <button
      type="submit"
      disabled={loading}
      className="px-4 py-2.5 bg-[#800020] hover:bg-[#68001a] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
    >
      {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
      <span>{loading ? 'Đang xử lý...' : submitLabel}</span>
    </button>
  </div>
);

export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'success' | 'danger' | 'warning' | 'primary' | 'default';
}> = ({ label, value, hint, tone = 'default' }) => {
  const toneCls =
    tone === 'success'
      ? 'text-[#0f5132] bg-[#eefbf4] border-[#d1f2e1]'
      : tone === 'danger'
      ? 'text-[#991b1b] bg-[#fdf2f2] border-[#fde2e2]'
      : tone === 'warning'
      ? 'text-amber-800 bg-amber-50 border-amber-200'
      : tone === 'primary'
      ? 'text-[#800020] bg-[#fff5f6] border-[#efc4cc]'
      : 'text-stone-900 bg-white border-stone-200';

  return (
    <div className={`p-4 rounded-2xl border shadow-2xs space-y-1 ${toneCls} transition-all`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</div>
      <div className="text-2xl font-bold font-mono">{value}</div>
      {hint && <div className="text-[11px] font-normal text-stone-500">{hint}</div>}
    </div>
  );
};
