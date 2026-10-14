import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { PageRoute } from '../../types';
import useAuthStore from '../../store/authStore';

interface AdminSidebarProps {
  currentRoute?: string;
  onNavigate?: (route: PageRoute) => void;
}

interface NavItem {
  route: string;
  path: string;
  pageRoute: PageRoute;
  label: string;
  icon: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentRoute = 'admin-categories', onNavigate }) => {
  const navigate = useNavigate();
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
        { route: 'admin', path: '/admin', pageRoute: 'admin', label: 'Tổng quan', icon: 'dashboard' },
      ]
    },
    {
      title: 'BÁN HÀNG',
      items: [
        { route: 'admin-orders', path: '/admin/orders', pageRoute: 'admin-orders', label: 'Đơn hàng', icon: 'receipt_long' },
        { route: 'admin-categories', path: '/admin/categories', pageRoute: 'admin-categories', label: 'Danh mục', icon: 'account_tree' },
        { route: 'admin-products', path: '/admin/products', pageRoute: 'admin-products', label: 'Sản phẩm', icon: 'local_cafe' },
        { route: 'admin-recipes', path: '/admin/recipes', pageRoute: 'admin-recipes', label: 'Công thức (BOM)', icon: 'menu_book' },
      ]
    },
    {
      title: 'KHO & NHẬP HÀNG',
      items: [
        { route: 'admin-ingredients', path: '/admin/ingredients', pageRoute: 'admin-ingredients', label: 'Nguyên liệu', icon: 'inventory_2' },
        { route: 'admin-inventory', path: '/admin/inventory', pageRoute: 'admin-inventory', label: 'Tồn kho & Xuất nhập', icon: 'warehouse' },
        { route: 'admin-restock', path: '/admin/restock', pageRoute: 'admin-restock', label: 'Đề xuất nhập hàng', icon: 'assignment' },
        { route: 'admin-suppliers', path: '/admin/suppliers', pageRoute: 'admin-suppliers', label: 'Nhà cung cấp', icon: 'store' },
        { route: 'admin-purchases', path: '/admin/purchases', pageRoute: 'admin-purchases', label: 'Phiếu nhập hàng', icon: 'receipt' },
      ]
    },
    {
      title: 'NHÂN SỰ & CA LÀM',
      items: [
        { route: 'admin-employees', path: '/admin/employees', pageRoute: 'admin-employees', label: 'Nhân viên', icon: 'badge' },
        { route: 'admin-shifts', path: '/admin/shifts', pageRoute: 'admin-shifts', label: 'Khung giờ ca', icon: 'schedule' },
        { route: 'admin-schedules', path: '/admin/schedules', pageRoute: 'admin-schedules', label: 'Lịch phân ca', icon: 'calendar_month' },
        { route: 'admin-attendance', path: '/admin/attendance', pageRoute: 'admin-attendance', label: 'Chấm công', icon: 'how_to_reg' },
      ]
    },
    {
      title: 'KHÁCH HÀNG',
      items: [
        { route: 'admin-customers', path: '/admin/customers', pageRoute: 'admin-customers', label: 'Khách hàng', icon: 'group' },
      ]
    }
  ];

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-stone-200/80 min-h-screen flex flex-col justify-between py-4 text-xs select-none">
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="px-4 pb-3 flex items-center gap-2.5 border-b border-stone-100">
          <div className="w-8 h-8 rounded-lg bg-[#800020] text-white flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[18px]">local_cafe</span>
          </div>
          <div>
            <div className="font-black text-[14px] tracking-wide text-[#800020] leading-none">AURA CAFÉ</div>
            <div className="text-[9px] font-bold text-stone-400 tracking-wider mt-1 leading-none uppercase">QUẢN TRỊ HỆ THỐNG</div>
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
                  const isActive = currentRoute === item.route;
                  return (
                    <button
                      key={item.route}
                      type="button"
                      onClick={() => handleNav(item.pageRoute, item.path)}
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
              <div className="text-[9px] text-stone-500 font-medium uppercase tracking-wider">{user.role}</div>
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
