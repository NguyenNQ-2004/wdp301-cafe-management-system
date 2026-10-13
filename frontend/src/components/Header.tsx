import React, { useState } from 'react';
import type { PageRoute } from '../types';

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
  const [searchValue, setSearchValue] = useState('');

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

        {/* Action Controls: Cart & Profile */}
        <div className="flex items-center gap-space-md">
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

          {/* User Profile / Auth Button */}
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-8 h-8 rounded-full bg-primary hover:bg-primary-container text-white flex items-center justify-center shadow-sm cursor-pointer transition-transform active:scale-95"
            title="Đăng nhập / Tài khoản vận hành Aura"
          >
            <span className="material-symbols-outlined text-white text-[18px]">person</span>
          </button>
        </div>
      </div>
    </header>
  );
};
