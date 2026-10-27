import React from 'react';
import type { PageRoute } from '../../types';
import { useDb } from '../../data/DbContext';
import useAuthStore from '../../../store/authStore';

interface AdminSidebarProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
}

const SECTIONS: { title: string; items: { route: PageRoute; label: string; icon: string; table: string }[] }[] = [
  {
    title: 'Báo cáo',
    items: [{ route: 'admin-overview', label: 'Tổng quan', icon: 'dashboard', table: 'orders, payments' }]
  },
  {
    title: 'Bán hàng',
    items: [
      { route: 'admin-orders', label: 'Đơn hàng', icon: 'list_alt', table: 'orders' },
      { route: 'admin-categories', label: 'Danh mục', icon: 'category', table: 'categories' },
      { route: 'admin-products', label: 'Sản phẩm', icon: 'local_cafe', table: 'products' },
      { route: 'admin-recipes', label: 'Công thức (BOM)', icon: 'menu_book', table: 'product_ingredients' }
    ]
  },
  {
    title: 'Kho & Nhập hàng',
    items: [
      { route: 'admin-ingredients', label: 'Nguyên liệu', icon: 'shelves', table: 'ingredients' },
      { route: 'admin-stock', label: 'Tồn kho & Xuất nhập', icon: 'inventory_2', table: 'inventory_transactions' },
      { route: 'admin-restock', label: 'Đề xuất nhập hàng', icon: 'add_alert', table: 'purchase_orders (DRAFT)' },
      { route: 'admin-suppliers', label: 'Nhà cung cấp', icon: 'local_shipping', table: 'suppliers' },
      { route: 'admin-purchases', label: 'Phiếu nhập hàng', icon: 'receipt_long', table: 'purchase_orders' }
    ]
  },
  {
    title: 'Nhân sự & Ca làm',
    items: [
      { route: 'admin-users', label: 'Nhân viên', icon: 'group', table: 'users' },
      { route: 'admin-shifts', label: 'Khung giờ ca', icon: 'schedule', table: 'shop_settings' },
      { route: 'admin-schedules', label: 'Lịch phân ca', icon: 'calendar_month', table: 'work_schedules' },
      { route: 'admin-attendance', label: 'Chấm công', icon: 'badge', table: 'work_schedules' }
    ]
  },
  {
    title: 'Khách hàng',
    items: [
      { route: 'admin-customers', label: 'Khách hàng', icon: 'contact_page', table: 'users' },
      { route: 'admin-memberships', label: 'Tích điểm', icon: 'loyalty', table: 'loyalty_transactions' },
      { route: 'admin-complaints', label: 'Đánh giá & Khiếu nại', icon: 'feedback', table: 'customer_reviews' }
    ]
  },
  {
    title: 'Hệ thống',
    items: [{ route: 'admin-settings', label: 'Cài đặt cửa hàng', icon: 'settings', table: 'shop_settings' }]
  }
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentRoute, onNavigate }) => {
  const { db, session } = useDb();
  const admin = db.users.find(u => u.id === session.adminId);

  return (
    <aside className="w-full lg:w-72 bg-white border-r border-stone-200 shrink-0 p-4 space-y-4 flex flex-col justify-between">
      <div className="space-y-4">
        <div className="px-2 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
            <span className="material-symbols-outlined text-[20px]">local_cafe</span>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-tight text-primary">AURA CAFÉ</span>
            <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold">Quản trị hệ thống</span>
          </div>
        </div>

        <nav className="space-y-4 text-xs font-semibold">
          {SECTIONS.map(section => (
            <div key={section.title} className="space-y-1">
              <p className="px-2 text-[10px] text-stone-400 uppercase tracking-wider font-bold">{section.title}</p>
              {section.items.map(item => (
                <button
                  key={item.route}
                  onClick={() => onNavigate(item.route)}
                  title={item.label}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
                    currentRoute === item.route ? 'bg-primary text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-500 space-y-1">
        <span className="font-bold text-stone-700 block">{admin?.full_name ?? 'Quản trị viên'}</span>
        <span className="block">{admin?.email}</span>
        <button onClick={() => { useAuthStore.getState().logout(); onNavigate('home'); }} className="pt-2 font-semibold text-red-700">Đăng xuất</button>
      </div>
    </aside>
  );
};
