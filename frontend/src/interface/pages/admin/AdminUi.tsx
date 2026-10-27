import React from 'react';
import type { PageRoute } from '../../types';
import { AdminSidebar } from './AdminSidebar';

// Khối giao diện dùng chung cho các trang quản trị

export const AdminLayout: React.FC<{
  route: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
  title: string;
  subtitle?: string;
  table?: string; // tên bảng database mà trang thao tác
  actions?: React.ReactNode;
  stats?: React.ReactNode;
  children: React.ReactNode;
}> = ({ route, onNavigate, onShowToast, title, subtitle, actions, stats, children }) => (
  <div className="min-h-screen bg-stone-50 flex flex-col lg:flex-row pb-12">
    <AdminSidebar currentRoute={route} onNavigate={onNavigate} onShowToast={onShowToast} />
    <main className="flex-1 p-4 sm:p-6 space-y-4 max-w-7xl min-w-0">
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
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

export const StatCard: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'default' | 'danger' | 'success' | 'primary' }> = ({
  label,
  value,
  hint,
  tone = 'default'
}) => {
  const tones = {
    default: 'bg-stone-50 border-stone-200 text-stone-900',
    danger: 'bg-rose-50 border-rose-200 text-rose-700',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    primary: 'bg-primary/5 border-primary/20 text-primary'
  };
  return (
    <div className={`p-3 rounded-xl border ${tones[tone]}`}>
      <span className="text-[10px] uppercase font-bold block opacity-70">{label}</span>
      <span className="text-xl font-black font-mono mt-0.5 block">{value}</span>
      {hint && <span className="text-[11px] opacity-80">{hint}</span>}
    </div>
  );
};

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: string }> = ({ icon, children, className = '', ...rest }) => (
  <button
    {...rest}
    className={`px-3.5 py-2 bg-primary hover:bg-primary-container text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50 ${className}`}
  >
    {icon && <span className="material-symbols-outlined text-[16px]">{icon}</span>}
    {children}
  </button>
);

export const GhostButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: string }> = ({ icon, children, className = '', ...rest }) => (
  <button
    {...rest}
    className={`px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl border border-stone-200 flex items-center gap-1.5 disabled:opacity-50 ${className}`}
  >
    {icon && <span className="material-symbols-outlined text-[16px]">{icon}</span>}
    {children}
  </button>
);

export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
    <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} overflow-hidden flex flex-col max-h-[90vh]`}>
      <div className="flex justify-between items-center p-4 border-b border-stone-100 bg-stone-50">
        <h3 className="font-bold text-stone-900 text-sm">{title}</h3>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      <div className="p-5 overflow-y-auto">{children}</div>
    </div>
  </div>
);

// Ô nhập có nhãn; `column` là tên cột database tương ứng để dễ đối chiếu
export const Field: React.FC<{ label: string; column?: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
  <label className={`block space-y-1 ${className}`}>
    <span className="text-xs font-bold text-stone-600 flex items-center justify-between gap-2">
      <span>{label}</span>
    </span>
    {children}
  </label>
);

export const inputCls =
  'w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-primary text-sm';

export const FormActions: React.FC<{ onCancel: () => void; submitLabel: string }> = ({ onCancel, submitLabel }) => (
  <div className="pt-4 flex gap-3">
    <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 bg-stone-100 text-stone-700 font-bold rounded-xl text-xs hover:bg-stone-200">
      Hủy bỏ
    </button>
    <button type="submit" className="flex-1 px-4 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-container">
      {submitLabel}
    </button>
  </div>
);

export const Badge: React.FC<{ className: string; children: React.ReactNode }> = ({ className, children }) => (
  <span className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${className}`}>{children}</span>
);

export const TableShell: React.FC<{ head: React.ReactNode; children: React.ReactNode; empty?: boolean; emptyText?: string }> = ({
  head,
  children,
  empty,
  emptyText = 'Không có dữ liệu.'
}) => (
  <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-bold border-b border-stone-200">{head}</thead>
        <tbody className="divide-y divide-stone-100">
          {children}
          {empty && (
            <tr>
              <td colSpan={20} className="p-6 text-center text-stone-400">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);
