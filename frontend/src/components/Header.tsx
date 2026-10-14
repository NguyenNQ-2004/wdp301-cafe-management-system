import React, { useState, useRef, useEffect } from 'react';
import type { PageRoute } from '../types';
import useAuthStore from '../store/authStore';

interface HeaderProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  cartCount: number;
  onOpenAuth: () => void;
  onSearch?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onNavigate,
  cartCount,
  onOpenAuth,
  onSearch
}) => {
  const { user, logout } = useAuthStore();
  const [searchValue, setSearchValue] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchValue);
    }
    if (currentRoute !== 'menu') {
      onNavigate('menu');
    }
  };

  const navItems: { route: PageRoute; label: string }[] = [
    { route: 'home', label: 'Trang chủ' },
    { route: 'menu', label: 'Menu & Đồ uống' },
    { route: 'orders', label: 'Đơn hàng của tôi' },
    { route: 'profile', label: 'Hồ sơ & Điểm tích luỹ' },
    { route: 'feedback', label: 'Phản ánh & Khiếu nại' }
  ];

  // Helper hiển thị badge vai trò
  const getRoleBadge = () => {
    if (!user) return null;
    if (user.role === 'ADMIN') {
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700 border border-red-200">
          Admin
        </span>
      );
    }
    if (user.position === 'CASHIER' || user.position === 'MANAGER') {
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200">
          Thu ngân
        </span>
      );
    }
    if (user.position === 'BARISTA') {
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-200">
          Pha chế
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
        Hội viên
      </span>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest border-b border-surface-container-highest shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-20 w-full px-margin-lg flex items-center justify-between gap-space-lg">
        {/* Brand Logo & Main Nav */}
        <div className="flex items-center gap-space-xl">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-space-sm text-left group cursor-pointer"
          >
            <span className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-white shadow-sm group-hover:bg-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">local_cafe</span>
            </span>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-primary tracking-tight font-bold">
                Aura Café
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                Specialty Coffee
              </span>
            </div>
          </button>

          <nav className="hidden xl:flex items-center gap-space-lg h-20">
            {navItems.map((item) => {
              const isActive = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  onClick={() => onNavigate(item.route)}
                  className={`h-full flex items-center font-label-lg text-label-lg transition-colors relative cursor-pointer ${
                    isActive
                      ? 'text-primary font-bold border-b-2 border-primary-container'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Global Search Input */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center gap-space-md flex-1 max-w-md mx-space-md hidden md:flex"
        >
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-secondary text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                if (onSearch) onSearch(e.target.value);
              }}
              placeholder="Tìm kiếm đồ uống, bánh ngọt hoặc combo..."
              className="w-full h-10 pl-11 pr-space-md rounded-lg bg-surface border border-surface-container-highest text-on-surface placeholder:text-secondary font-body-md text-body-md focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all"
            />
          </div>
        </form>

        {/* Action Controls: Role Quick Links, Cart & Profile */}
        <div className="flex items-center gap-space-md">
          {/* Quick link tới Portal dành cho Admin / Staff */}
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => onNavigate('admin')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                currentRoute === 'admin'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">shield_person</span>
              <span>Quản trị Admin</span>
            </button>
          )}

          {(user?.position === 'CASHIER' || (user?.role === 'ADMIN' && currentRoute !== 'cashier')) && (
            <button
              onClick={() => onNavigate('cashier')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                currentRoute === 'cashier'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
              <span>POS Thu ngân</span>
            </button>
          )}

          {(user?.position === 'BARISTA' || (user?.role === 'ADMIN' && currentRoute !== 'barista')) && (
            <button
              onClick={() => onNavigate('barista')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                currentRoute === 'barista'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">coffee</span>
              <span>KDS Pha chế</span>
            </button>
          )}

          {/* Mobile Menu Dropdown toggle (for smaller screens) */}
          <div className="flex xl:hidden">
            <button
              onClick={() => onNavigate('menu')}
              className="h-10 px-2 flex items-center justify-center rounded-lg border border-surface-container-highest text-on-surface hover:bg-surface-container cursor-pointer"
              title="Menu"
            >
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
            </button>
          </div>

          {/* Cart Button */}
          <button
            type="button"
            onClick={() => onNavigate('cart')}
            className={`relative h-10 px-space-md flex items-center gap-space-sm rounded-lg border border-surface-container-highest transition-colors cursor-pointer ${
              currentRoute === 'cart' || currentRoute === 'checkout' || currentRoute === 'payment'
                ? 'bg-primary-fixed border-primary/20 text-primary'
                : 'bg-surface hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-secondary text-[20px]">
              shopping_bag
            </span>
            <span className="font-label-md text-label-md text-on-surface hidden sm:inline">
              Giỏ hàng
            </span>
            <span className="h-5 min-w-[20px] px-1 rounded-full bg-primary-container text-white font-label-sm text-label-sm flex items-center justify-center">
              {cartCount}
            </span>
          </button>

          {/* User Profile / Auth Area with Dropdown */}
          <div className="relative" ref={menuRef}>
            {user ? (
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-full sm:rounded-lg border border-surface-container-highest hover:bg-surface-container transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-on-surface leading-tight max-w-[120px] truncate">
                    {user.fullName}
                  </span>
                  <div className="flex items-center mt-0.5">
                    {getRoleBadge()}
                  </div>
                </div>
                <span className="material-symbols-outlined text-secondary text-[18px] hidden sm:block">
                  {isUserMenuOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white font-label-md text-sm font-semibold shadow-sm cursor-pointer transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
                <span className="hidden sm:inline">Đăng nhập</span>
              </button>
            )}

            {/* Dropdown Menu khi đã đăng nhập */}
            {user && isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container-high py-2 z-50 animate-fadeIn">
                {/* Header info trong Dropdown */}
                <div className="px-4 py-3 border-b border-surface-container-highest">
                  <div className="font-semibold text-sm text-on-surface">{user.fullName}</div>
                  <div className="text-xs text-secondary mt-0.5">{user.phone}</div>
                  <div className="mt-1.5">{getRoleBadge()}</div>
                </div>

                {/* Các liên kết điều hướng */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      onNavigate('home');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs sm:text-sm text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary">home</span>
                    <span>Về Trang chủ Aura</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('menu');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs sm:text-sm text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary">restaurant_menu</span>
                    <span>Khám phá Menu đồ uống</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('profile');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs sm:text-sm text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary">account_circle</span>
                    <span>Hồ sơ & Đổi mật khẩu</span>
                  </button>

                  {user.role === 'STAFF' && (
                    <button
                      onClick={() => {
                        onNavigate('my-schedule');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs sm:text-sm text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-secondary">calendar_month</span>
                      <span>Lịch làm việc của tôi</span>
                    </button>
                  )}
                  {user.role === 'STAFF' && (
                    <button
                      onClick={() => {
                        onNavigate('my-attendance');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs sm:text-sm text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-secondary">how_to_reg</span>
                      <span>Chấm công của tôi</span>
                    </button>
                  )}

                  {/* Quyền quản trị cho Admin */}
                  {user.role === 'ADMIN' && (
                    <button
                      onClick={() => {
                        onNavigate('admin');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs sm:text-sm text-red-700 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-red-600">shield_person</span>
                      <span>Bảng Quản trị Admin</span>
                    </button>
                  )}

                  {/* Quyền POS cho Cashier hoặc Admin */}
                  {(user.position === 'CASHIER' || user.role === 'ADMIN') && (
                    <button
                      onClick={() => {
                        onNavigate('cashier');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs sm:text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-blue-600">point_of_sale</span>
                      <span>Màn hình Thu ngân POS</span>
                    </button>
                  )}

                  {/* Quyền KDS cho Barista hoặc Admin */}
                  {(user.position === 'BARISTA' || user.role === 'ADMIN') && (
                    <button
                      onClick={() => {
                        onNavigate('barista');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs sm:text-sm text-amber-700 hover:bg-amber-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-amber-600">coffee</span>
                      <span>Màn hình Pha chế KDS</span>
                    </button>
                  )}
                </div>

                {/* Nút Đăng xuất */}
                <div className="border-t border-surface-container-highest pt-1 mt-1">
                  <button
                    onClick={() => {
                      logout();
                      setIsUserMenuOpen(false);
                      onNavigate('home');
                    }}
                    className="w-full px-4 py-2 text-left text-xs sm:text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                  >
                    <span className="material-symbols-outlined text-[18px] text-red-600">logout</span>
                    <span>Đăng xuất tài khoản</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
