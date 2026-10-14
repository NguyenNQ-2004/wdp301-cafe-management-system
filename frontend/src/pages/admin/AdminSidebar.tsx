import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { PageRoute } from '../../types';
import useAuthStore from '../../store/authStore';

export interface AdminSidebarProps {
  currentRoute?: string;
  activePath?: string;
  onNavigate?: (route: PageRoute) => void;
}

export interface NavItem {
  route: string;
  path: string;
  pageRoute: PageRoute;
  label: string;
  icon: string;
  table?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentRoute, activePath, onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleNav = (pageRoute: PageRoute, path: string) => {
    navigate(path);
    if (onNavigate) {
      onNavigate(pageRoute);
    }
  };

  const navGroups: NavGroup[] = [
    {
      title: 'BÁO CÁO',
      items: [
        { route: 'admin', path: '/admin', pageRoute: 'admin', label: 'Tổng quan', icon: 'dashboard', table: 'orders, payments' },
      ]
    },
    {
      title: 'BÁN HÀNG',
      items: [
        { route: 'admin-orders', path: '/admin/orders', pageRoute: 'admin-orders', label: 'Đơn hàng', icon: 'receipt_long', table: 'orders' },
        { route: 'admin-categories', path: '/admin/categories', pageRoute: 'admin-categories', label: 'Danh mục', icon: 'account_tree', table: 'categories' },
        { route: 'admin-products', path: '/admin/products', pageRoute: 'admin-products', label: 'Sản phẩm', icon: 'local_cafe', table: 'products' },
        { route: 'admin-recipes', path: '/admin/recipes', pageRoute: 'admin-recipes', label: 'Công thức (BOM)', icon: 'menu_book', table: 'product_ingredients' },
      ]
    },
    {
      title: 'KHO & NHẬP HÀNG',
      items: [
        { route: 'admin-ingredients', path: '/admin/ingredients', pageRoute: 'admin-ingredients', label: 'Nguyên liệu', icon: 'inventory_2', table: 'ingredients' },
        { route: 'admin-inventory', path: '/admin/inventory', pageRoute: 'admin-inventory', label: 'Tồn kho & Xuất nhập', icon: 'warehouse', table: 'inventory_transactions' },
        { route: 'admin-restock', path: '/admin/restock', pageRoute: 'admin-restock', label: 'Đề xuất nhập hàng', icon: 'assignment', table: 'purchase_orders' },
        { route: 'admin-suppliers', path: '/admin/suppliers', pageRoute: 'admin-suppliers', label: 'Nhà cung cấp', icon: 'store', table: 'suppliers' },
        { route: 'admin-purchases', path: '/admin/purchases', pageRoute: 'admin-purchases', label: 'Phiếu nhập hàng', icon: 'receipt', table: 'purchase_orders' },
      ]
    },
    {
      title: 'NHÂN SỰ & CA LÀM',
      items: [
        { route: 'admin-employees', path: '/admin/employees', pageRoute: 'admin-employees', label: 'Nhân viên', icon: 'badge', table: 'users (role=STAFF)' },
        { route: 'admin-shifts', path: '/admin/shifts', pageRoute: 'admin-shifts', label: 'Khung giờ ca', icon: 'schedule', table: 'work_shifts' },
        { route: 'admin-schedules', path: '/admin/schedules', pageRoute: 'admin-schedules', label: 'Lịch phân ca', icon: 'calendar_month', table: 'work_schedules' },
        { route: 'admin-attendance', path: '/admin/attendance', pageRoute: 'admin-attendance', label: 'Chấm công', icon: 'how_to_reg', table: 'attendance' },
      ]
    },
    {
      title: 'KHÁCH HÀNG & HỘI VIÊN',
      items: [
        { route: 'admin-customers', path: '/admin/customers', pageRoute: 'admin-customers', label: 'Khách hàng (CRM)', icon: 'group', table: 'users (role=CUSTOMER)' },
        { route: 'admin-loyalty', path: '/admin/memberships', pageRoute: 'admin-loyalty', label: 'Tích điểm & Hạng thẻ', icon: 'loyalty', table: 'loyalty_transactions' },
        { route: 'admin-complaints', path: '/admin/complaints', pageRoute: 'admin-complaints', label: 'Đánh giá & Khiếu nại', icon: 'feedback', table: 'customer_reviews' },
      ]
    }
  ];

  const currentEffectivePath = activePath || location.pathname;

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-stone-200/80 min-h-screen flex flex-col justify-between py-4 text-xs select-none">
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="px-4 pb-3 flex items-center gap-2.5 border-b border-stone-100">
          <div 
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#800020] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:bg-[#68001a] transition-colors">
              <span className="material-symbols-outlined text-[18px]">local_cafe</span>
            </div>
            <div>
              <div className="font-black text-[14px] tracking-wide text-[#800020] leading-none">AURA CAFÉ</div>
              <div className="text-[9px] font-bold text-stone-400 tracking-wider mt-1 leading-none uppercase">QUẢN TRỊ HỆ THỐNG</div>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-4 px-2">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-0.5">
              <div className="px-3 py-1 text-[10px] font-bold uppercase text-stone-400 tracking-wider">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    (activePath && (item.path === activePath || (activePath.startsWith(item.path) && item.path !== '/admin'))) ||
                    (currentRoute && (item.route === currentRoute || item.path === currentRoute)) ||
                    (!activePath && !currentRoute && currentEffectivePath === item.path);

                  return (
                    <button
                      key={item.route}
                      type="button"
                      onClick={() => handleNav(item.pageRoute, item.path)}
                      title={item.table ? `Thao tác với bảng: ${item.table}` : item.label}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-medium transition-colors cursor-pointer text-xs ${
                        isActive
                          ? 'bg-[#800020] text-white font-semibold shadow-xs'
                          : 'text-stone-700 hover:bg-stone-50 hover:text-stone-900'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-white' : 'text-stone-400'}`}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* User / Exit Footer */}
      <div className="pt-3 border-t border-stone-100 px-3 space-y-2">
        {user && (
          <div className="px-2 py-1.5 rounded-xl bg-stone-50 flex items-center justify-between">
            <div className="truncate">
              <div className="text-[11px] font-bold text-stone-800 truncate">{user.fullName || 'Admin'}</div>
              <div className="text-[9px] text-stone-500 font-medium uppercase tracking-wider">{user.role} {user.position ? `(${user.position})` : ''}</div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              title="Đăng xuất"
              className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AdminSidebar;
