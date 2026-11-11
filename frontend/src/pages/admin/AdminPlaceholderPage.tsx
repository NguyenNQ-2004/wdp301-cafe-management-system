import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from './AdminUi';


interface AdminPlaceholderPageProps {
  route?: string;
  title?: string;
  subtitle?: string;
  table?: string;
  branch?: string;
}

export const AdminPlaceholderPage: React.FC<AdminPlaceholderPageProps> = ({
  route = 'admin',
  title = 'Tính năng đang được phát triển',
  subtitle = 'Phân hệ này đang trong lộ trình phát triển của hệ thống Aura Café ERP.',
  table = 'pending',
  branch
}) => {
  const navigate = useNavigate();

  return (
    <AdminLayout
      route={route}
      table={table}
      title={title}
      subtitle={subtitle}
    >
      <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center shadow-2xs space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
          <span className="material-symbols-outlined text-[32px]">construction</span>
        </div>

        <div className="space-y-1.5 max-w-md mx-auto">
          <h2 className="text-lg font-bold text-stone-900">{title}</h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            {subtitle} Hiện tại hệ thống đang hoàn thiện nhánh <code className="px-2 py-0.5 rounded bg-stone-100 font-mono text-[#800020] font-semibold">feature/category-management</code> (Quản lý Danh mục).
          </p>
          {branch && (
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-600 font-mono text-[11px]">
                <span className="material-symbols-outlined text-[14px]">fork_right</span>
                Nhánh dự kiến: <strong>{branch}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate('/admin/categories')}
            className="px-4 py-2.5 rounded-xl bg-[#800020] hover:bg-[#68001a] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">category</span>
            <span>Về Màn hình Danh mục</span>
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-medium text-xs transition-colors cursor-pointer"
          >
            Về Dashboard Tổng
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPlaceholderPage;
