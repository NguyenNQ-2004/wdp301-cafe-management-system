import React from 'react';
import type { PageRoute } from '../../types';
import { AdminSidebar } from './AdminSidebar';

export const inputCls =
  'w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] transition-all';

export interface AdminLayoutProps {
  route: string;
  onNavigate?: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
  table?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  route,
  onNavigate,
  table,
  title,
  subtitle,
  actions,
  stats,
  children
}) => {
  return (
    <div className="flex bg-[#f8f9fa] min-h-screen w-full">
      {/* Sidebar */}
      <AdminSidebar currentRoute={route} onNavigate={onNavigate} />

      {/* Main content */}
      <main className="flex-1 min-h-screen p-6 md:p-8 space-y-5 overflow-y-auto bg-[#f8f9fa]">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs">
          <div>
            {table && (
              <div className="text-[11px] font-mono text-stone-400 mb-0.5">
                bảng: {table}
              </div>
            )}
            <h1 className="text-xl font-bold text-stone-900">{title}</h1>
            {subtitle && <p className="text-stone-500 text-xs mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>

        {/* Stats Grid */}
        {stats && <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{stats}</div>}

        {/* Main Body */}
        <div>{children}</div>
      </main>
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
};

export const Field: React.FC<{ label: string; column?: string; children: React.ReactNode }> = ({
  label,
  column,
  children
}) => {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-stone-700 font-medium">
        <span>{label}</span>
        {column && <span className="font-mono text-[10px] text-stone-400">{column}</span>}
      </div>
      {children}
    </div>
  );
};

export const PrimaryButton: React.FC<{
  icon?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit';
}> = ({ icon, onClick, children, className = '', type = 'button' }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2.5 bg-[#800020] hover:bg-[#68001a] text-white font-bold rounded-xl text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${className}`}
    >
      {icon && <span className="material-symbols-outlined text-[16px]">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

export const StatCard: React.FC<{
  label: string;
  value: string | number;
  tone?: 'success' | 'danger' | 'warning' | 'default';
}> = ({ label, value, tone = 'default' }) => {
  const toneCls =
    tone === 'success'
      ? 'text-[#0f5132] bg-[#eefbf4] border-[#d1f2e1]'
      : tone === 'danger'
      ? 'text-[#991b1b] bg-[#fdf2f2] border-[#fde2e2]'
      : tone === 'warning'
      ? 'text-amber-800 bg-amber-50 border-amber-200'
      : 'text-stone-900 bg-white border-stone-200';

  return (
    <div className={`p-4 rounded-2xl border shadow-2xs space-y-1 ${toneCls}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</div>
      <div className="text-2xl font-bold font-mono">{value}</div>
    </div>
  );
};
