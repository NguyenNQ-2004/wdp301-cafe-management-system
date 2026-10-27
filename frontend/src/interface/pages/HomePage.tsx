import React from 'react';
import type { PageRoute, Product } from '../types';
import { useDb } from '../data/DbContext';
import { fmtMoney, getSetting, getSettingNumber } from '../data/dbUtils';

interface HomePageProps {
  onNavigate: (route: PageRoute) => void;
  onSelectProduct: (productId: number) => void;
  onQuickAdd: (product: Product) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectProduct, onQuickAdd }) => {
  const { db } = useDb();
  const available = db.products.filter(p => p.is_available);
  const bestSellers = available.filter(p => p.badge === 'BÁN CHẠY').slice(0, 4);
  const newProducts = available.filter(p => p.badge === 'MÓN MỚI').slice(0, 3);
  const activeCategories = db.categories.filter(c => c.status === 'ACTIVE');
  const hero = bestSellers[0] ?? available[0];
  const categoryName = (id: number) => db.categories.find(c => c.id === id)?.name ?? '';

  // Số ly đã bán theo order_items (không tính đơn đã hủy)
  const soldQty = (productId: number) =>
    db.order_items
      .filter(i => i.product_id === productId)
      .filter(i => db.orders.find(o => o.id === i.order_id)?.status !== 'CANCELLED')
      .reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex flex-col w-full">
      {/* Hero Showcase Section */}
      <div className="relative w-full overflow-hidden bg-surface-container-high px-margin-lg py-space-xl md:py-space-xl">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-16 w-80 h-80 rounded-full bg-tertiary-container/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-center relative z-10">
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            <div className="flex items-center gap-space-xs self-start px-space-sm py-1 rounded-full bg-surface-container-lowest shadow-sm">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-semibold">
                Tích điểm theo số điện thoại
              </span>
            </div>

            <div className="flex flex-col gap-space-xs">
              <span className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-widest font-semibold">
                Chào mừng bạn đến với {getSetting(db, 'store_name', 'Aura Café')}
              </span>
              <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight font-bold">
                Hương vị chuẩn mực.
                <br />
                <span className="text-primary">Đặc quyền hội viên.</span>
              </h1>
            </div>

            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
              {activeCategories.length} nhóm thực đơn với {available.length} món đang phục vụ. Mỗi{' '}
              {fmtMoney(getSettingNumber(db, 'points_earn_unit', 1000))} chi tiêu được tích 1 điểm, đổi điểm trừ thẳng vào hóa đơn.
            </p>

            <div className="flex flex-wrap items-center gap-space-md pt-space-xs">
              <button
                onClick={() => onNavigate('menu')}
                className="h-11 px-space-lg flex items-center justify-center gap-space-sm bg-primary text-white rounded-lg shadow-sm hover:opacity-95 transition-opacity font-label-lg text-label-lg cursor-pointer"
              >
                <span>Khám phá toàn bộ Menu</span>
                <span className="material-symbols-outlined text-[18px]">east</span>
              </button>
              <button
                onClick={() => onNavigate('profile')}
                className="h-11 px-space-lg flex items-center justify-center gap-space-sm bg-surface-container-lowest text-on-surface rounded-lg shadow-sm hover:bg-surface transition-colors font-label-lg text-label-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-primary text-[20px]">workspace_premium</span>
                <span>Xem điểm tích luỹ</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-gutter mt-space-sm pt-space-md bg-surface-container-lowest/80 backdrop-blur rounded-xl p-space-md shadow-sm">
              <div className="flex flex-col">
                <span className="font-headline-lg text-headline-lg text-primary tabular-data font-bold">{available.length}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Món đang phục vụ</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-lg text-headline-lg text-primary tabular-data font-bold">
                  {fmtMoney(getSettingNumber(db, 'freeship_threshold'))}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Đơn từ mức này miễn phí ship</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-lg text-headline-lg text-primary tabular-data font-bold">
                  {getSettingNumber(db, 'delivery_minutes', 30)} Phút
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Thời gian giao dự kiến</span>
              </div>
            </div>
          </div>

          {hero && (
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="relative h-[380px] sm:h-[440px] rounded-2xl overflow-hidden shadow-xl bg-surface-container group">
                  <div
                    className="bg-cover bg-center w-full h-full transform group-hover:scale-105 transition-transform duration-700"
                    style={{ backgroundImage: `url('${hero.image_url ?? ''}')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-transparent to-transparent flex flex-col justify-end p-space-lg text-white">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed-dim font-bold">
                      {hero.subtitle ?? categoryName(hero.category_id)}
                    </span>
                    <h2 className="font-headline-lg text-headline-lg text-white font-bold">{hero.name}</h2>
                    <p className="font-body-sm text-body-sm text-surface-variant line-clamp-2 mt-1">{hero.description}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => onSelectProduct(hero.id)}
                        className="px-4 py-2 bg-primary hover:bg-primary-container text-white rounded-lg text-sm font-semibold flex items-center gap-1 shadow cursor-pointer transition-colors"
                      >
                        <span>Tùy chỉnh món</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                      <span className="px-3 py-2 rounded-lg bg-white/15 text-sm font-bold">{fmtMoney(hero.base_price)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Best Sellers Section (products.badge = 'BÁN CHẠY') */}
      <div className="w-full px-margin-lg py-space-xl">
        <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-sm">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-xs text-primary font-semibold">
                <span className="material-symbols-outlined text-[20px]">local_fire_department</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider">Ưa chuộng nhất</span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">Sản phẩm bán chạy</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Những món được gắn nhãn bán chạy trong thực đơn.
              </p>
            </div>
            <button
              onClick={() => onNavigate('menu')}
              className="inline-flex items-center gap-space-xs text-primary hover:text-primary-container font-label-lg text-label-lg transition-colors cursor-pointer"
            >
              <span>Xem tất cả danh mục</span>
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter-lg">
            {bestSellers.map(p => (
              <div
                key={p.id}
                className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                <div className="relative h-56 bg-surface-container overflow-hidden">
                  <div
                    className="bg-cover bg-center w-full h-full group-hover:scale-105 transition-transform duration-500"
                    style={{ backgroundImage: `url('${p.image_url ?? ''}')` }}
                  />
                  {p.badge && (
                    <span className="absolute top-3 left-3 px-space-sm py-0.5 rounded-md bg-primary text-white font-label-sm text-label-sm uppercase font-bold">
                      {p.badge}
                    </span>
                  )}
                  <span className="absolute bottom-3 right-3 px-space-sm py-0.5 rounded bg-surface-container-lowest/90 backdrop-blur font-tabular-data text-tabular-data font-semibold text-on-surface">
                    {fmtMoney(p.base_price)}
                  </span>
                </div>
                <div className="p-space-md flex flex-col flex-1 justify-between gap-space-sm">
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-secondary">{categoryName(p.category_id)}</span>
                      {p.subtitle && <span className="font-label-sm text-label-sm text-on-surface-variant">{p.subtitle}</span>}
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">{p.name}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{p.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-space-xs">
                    <span className="font-label-sm text-label-sm text-primary font-medium">Đã bán {soldQty(p.id)} phần</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onQuickAdd(p)}
                        className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer"
                        title="Thêm nhanh vào giỏ"
                      >
                        <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                      </button>
                      <button
                        onClick={() => onSelectProduct(p.id)}
                        className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer"
                        title="Chọn món & Tuỳ chỉnh"
                      >
                        <span className="material-symbols-outlined text-[18px]">tune</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Products (products.badge = 'MÓN MỚI') */}
      {newProducts.length > 0 && (
        <div className="w-full bg-surface-container-low py-space-xl px-margin-lg">
          <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
            <div className="flex flex-col gap-space-xs">
              <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-wider">Món mới</span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">Vừa có mặt trong thực đơn</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-lg">
              {newProducts.map(p => (
                <div key={p.id} className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm flex flex-col group">
                  <div className="relative h-64 overflow-hidden">
                    <div
                      className="bg-cover bg-center w-full h-full group-hover:scale-105 transition-transform duration-500"
                      style={{ backgroundImage: `url('${p.image_url ?? ''}')` }}
                    />
                    <div className="absolute top-3 left-3 bg-surface-container-lowest/90 backdrop-blur px-space-sm py-1 rounded text-primary font-label-sm text-label-sm font-semibold">
                      {p.badge}
                    </div>
                  </div>
                  <div className="p-space-lg flex flex-col flex-1 justify-between gap-space-md">
                    <div className="flex flex-col gap-space-xs">
                      <div className="flex justify-between items-baseline gap-2">
                        <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">{p.name}</h3>
                        <span className="font-tabular-data text-headline-sm font-bold text-primary">{fmtMoney(p.base_price)}</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">{p.description}</p>
                    </div>
                    <div className="flex items-center justify-between pt-space-sm bg-surface-container/50 -mx-space-lg -mb-space-lg p-space-md">
                      <span className="font-label-sm text-label-sm text-secondary">{categoryName(p.category_id)}</span>
                      <button
                        onClick={() => onSelectProduct(p.id)}
                        className="font-label-md text-label-md text-primary font-semibold hover:underline cursor-pointer"
                      >
                        Chi tiết
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Categories (bảng categories) */}
      <div className="w-full px-margin-lg py-space-xl">
        <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
          <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">Danh mục thực đơn</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-gutter">
            {activeCategories.map(c => (
              <button
                key={c.id}
                onClick={() => onNavigate('menu')}
                className="group relative h-40 rounded-xl overflow-hidden shadow-sm text-left cursor-pointer"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                  style={{ backgroundImage: `url('${c.image_url ?? ''}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-3 flex flex-col justify-end text-white">
                  <span className="material-symbols-outlined text-[20px]">{c.icon ?? 'local_cafe'}</span>
                  <span className="font-bold text-sm">{c.name}</span>
                  <span className="text-[11px] text-white/80 line-clamp-2">{c.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Call to Action Banner */}
      <div className="w-full px-margin-lg pb-space-xl">
        <div className="max-w-7xl mx-auto rounded-3xl bg-primary text-white p-space-lg md:p-space-xl relative overflow-hidden shadow-lg">
          <div className="absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-surface-container-lowest/10 blur-2xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-space-lg">
            <div className="flex flex-col gap-space-sm max-w-2xl">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary-fixed font-bold">
                {getSetting(db, 'store_address')}
              </span>
              <h2 className="font-headline-lg text-headline-lg md:text-display-lg font-bold">
                Bạn đã sẵn sàng thưởng thức ly cà phê hoàn hảo hôm nay?
              </h2>
              <p className="font-body-lg text-body-lg text-primary-fixed">
                {available.length} món đang sẵn sàng phục vụ tại quán hoặc giao tận nơi trong khoảng{' '}
                {getSettingNumber(db, 'delivery_minutes', 30)} phút. Hotline: {getSetting(db, 'store_hotline')}.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-space-md shrink-0">
              <button
                onClick={() => onNavigate('menu')}
                className="h-12 px-space-xl rounded-lg bg-white text-primary font-headline-sm text-headline-sm font-semibold flex items-center justify-center gap-space-sm shadow-md hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span>Khám phá toàn bộ Menu</span>
                <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
