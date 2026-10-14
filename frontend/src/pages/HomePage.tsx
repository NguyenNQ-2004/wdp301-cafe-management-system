import React from 'react';
import type { PageRoute, Product } from '../types';
import { useDb } from '../data/DbContext';

interface HomePageProps {
  onNavigate: (route: PageRoute) => void;
  onNavigateCategory?: (categoryName: string) => void;
  onSelectProduct: (productId: string) => void;
  onQuickAdd: (product: Product) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onNavigateCategory = () => {},
  onSelectProduct
}) => {
  const { db } = useDb();
  const activeCategories = db.categories.filter(c => c.status === 'ACTIVE');

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
                Aura Privilege Club
              </span>
            </div>

            <div className="flex flex-col gap-space-xs">
              <span className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-widest font-semibold">
                Chào mừng bạn đến với
              </span>
              <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight font-bold">
                Hương vị chuẩn mực.
                <br />
                <span className="text-primary">Đặc quyền hội viên.</span>
              </h1>
            </div>

            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
              Khám phá không gian cà phê thủ công chọn lọc từ những nông trại cao nguyên danh tiếng cùng quà tặng chào mừng trị giá tới 150.000đ dành riêng cho thành viên mới.
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
                <span className="material-symbols-outlined text-primary text-[20px]">
                  workspace_premium
                </span>
                <span>Xem điểm tích luỹ</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-gutter mt-space-sm pt-space-md bg-surface-container-lowest/80 backdrop-blur rounded-xl p-space-md shadow-sm">
              <div className="flex flex-col">
                <span className="font-headline-lg text-headline-lg text-primary tabular-data font-bold">
                  100%
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Hạt Arabica Cầu Đất
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-lg text-headline-lg text-primary tabular-data font-bold">
                  4.9/5
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Đánh giá trải nghiệm
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-lg text-headline-lg text-primary tabular-data font-bold">
                  15 Phút
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Giao tận nơi giữ nhiệt
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="relative h-[380px] sm:h-[440px] rounded-2xl overflow-hidden shadow-xl bg-surface-container group">
                <div
                  className="bg-cover bg-center w-full h-full transform group-hover:scale-105 transition-transform duration-700"
                  style={{
                    backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBw-dbJgXjvCR5nkOrwZ8VgbS5GY2OEyRxEbOPz5Icbwto9r4_yy3ThjTmDPVYgkVS0qvw9zgWOIgZyovscgGXFfWYGZIWnz4J-kEojbOR_3UIVRm6Pc2K3JfHrvidn2O5NIY6kYDmJT7_FHzfZXsvm5SPBgxa8HNtPCnWXgdeqGGBi8jSUbqQkSy9_zS1iUSwY3th8A9HlEIBbs8WrZi_JfRhmcTX_OGMjA0Fi-G89MqKh9nlG6OfL')`
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-transparent to-transparent flex flex-col justify-end p-space-lg text-white">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed-dim font-bold">
                    Món Signature Aura
                  </span>
                  <h2 className="font-headline-lg text-headline-lg text-white font-bold">
                    Cà Phê Muối Aura
                  </h2>
                  <p className="font-body-sm text-body-sm text-surface-variant line-clamp-2 mt-1">
                    Lớp kem béo mặn đặc chế hòa quyện cà phê phin nguyên bản từ cao nguyên Lâm Đồng.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => onSelectProduct('ca-phe-muoi')}
                      className="px-4 py-2 bg-primary hover:bg-primary-container text-white rounded-lg text-sm font-semibold flex items-center gap-1 shadow cursor-pointer transition-colors"
                    >
                      <span>Tùy chỉnh món</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>

      {/* Product Categories Showcase Section (Synchronized with DB Categories) */}
      <section className="w-full px-margin-lg py-space-xl bg-surface-container-lowest border-y border-surface-container-high">
        <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-sm">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-xs text-primary font-semibold">
                <span className="material-symbols-outlined text-[20px]">category</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider">
                  Khám phá thực đơn Aura
                </span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
                Danh mục món & Đồ uống
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Lựa chọn từ 6 dòng thực đơn chuẩn vị được cập nhật đồng bộ với quầy và hệ thống Aura Café.
              </p>
            </div>
            <button
              onClick={() => onNavigate('menu')}
              className="inline-flex items-center gap-space-xs text-primary hover:text-primary-container font-label-lg text-label-lg transition-colors cursor-pointer group"
            >
              <span>Xem toàn bộ Menu</span>
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">east</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {activeCategories.map((cat) => (
              <div
                key={String(cat.id)}
                onClick={() => onNavigateCategory(cat.name)}
                className="group flex flex-col rounded-2xl bg-surface p-3 border border-surface-container-high hover:border-primary/50 hover:shadow-md transition-all duration-300 cursor-pointer text-center"
              >
                <div className="relative h-28 w-full rounded-xl overflow-hidden mb-3 bg-surface-container">
                  {cat.image_url || cat.imageUrl ? (
                    <img
                      src={cat.image_url || cat.imageUrl || ''}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary text-3xl">
                      <span className="material-symbols-outlined">{cat.icon || 'local_cafe'}</span>
                    </div>
                  )}
                  <span className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-surface-container-lowest/90 backdrop-blur text-primary flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-[16px]">{cat.icon || 'local_cafe'}</span>
                  </span>
                </div>
                <h3 className="font-headline-sm text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">
                  {cat.description || 'Thức uống chuẩn vị'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Best Sellers Section */}
      <div className="w-full px-margin-lg py-space-xl">
        <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-sm">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-xs text-primary font-semibold">
                <span className="material-symbols-outlined text-[20px]">local_fire_department</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider">
                  Ưa chuộng nhất
                </span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
                Sản phẩm bán chạy trong tuần
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Những công thức hương vị được yêu thích và đặt nhiều nhất bởi tín đồ sành cà phê.
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
            {/* Card 1: Cà phê Muối Aura Đặc Biệt */}
            <div className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="relative h-56 bg-surface-container overflow-hidden">
                <div
                  className="bg-cover bg-center w-full h-full group-hover:scale-105 transition-transform duration-500"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80')`
                  }}
                />
                <span className="absolute top-3 left-3 px-space-sm py-0.5 rounded-md bg-primary text-white font-label-sm text-label-sm uppercase font-bold">
                  Bán chạy
                </span>
                <span className="absolute bottom-3 right-3 px-space-sm py-0.5 rounded bg-surface-container-lowest/90 backdrop-blur font-tabular-data text-tabular-data font-semibold text-on-surface">
                  45.000đ
                </span>
              </div>
              <div className="p-space-md flex flex-col flex-1 justify-between gap-space-sm">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-secondary">Cà phê truyền thống</span>
                    <div className="flex items-center gap-0.5 text-tertiary-container">
                      <span className="material-symbols-outlined text-[16px] text-amber-500">star</span>
                      <span className="font-tabular-data text-label-sm font-bold">4.9</span>
                    </div>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Cà Phê Muối Aura Đặc Biệt
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                    Fine Robusta ủ phin truyền thống phối kem sữa mằn mặn béo ngậy, cân bằng hậu vị ngọt đầm.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-space-xs">
                  <span className="font-label-sm text-label-sm text-primary font-medium">
                    Bán ra 1.420+ ly
                  </span>
                  <button
                    onClick={() => onSelectProduct('ca-phe-muoi')}
                    className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer"
                    title="Chọn món & Tuỳ chỉnh"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Trà Sen Vàng Long Nhãn */}
            <div className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="relative h-56 bg-surface-container overflow-hidden">
                <div
                  className="bg-cover bg-center w-full h-full group-hover:scale-105 transition-transform duration-500"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&auto=format&fit=crop&q=80')`
                  }}
                />
                <span className="absolute top-3 left-3 px-space-sm py-0.5 rounded-md bg-tertiary-container text-white font-label-sm text-label-sm uppercase font-bold">
                  Thanh nhiệt
                </span>
                <span className="absolute bottom-3 right-3 px-space-sm py-0.5 rounded bg-surface-container-lowest/90 backdrop-blur font-tabular-data text-tabular-data font-semibold text-on-surface">
                  49.000đ
                </span>
              </div>
              <div className="p-space-md flex flex-col flex-1 justify-between gap-space-sm">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-secondary">Trà trái cây</span>
                    <div className="flex items-center gap-0.5 text-tertiary-container">
                      <span className="material-symbols-outlined text-[16px] text-amber-500">star</span>
                      <span className="font-tabular-data text-label-sm font-bold">4.8</span>
                    </div>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Trà Sen Vàng Long Nhãn
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                    Hạt sen Huế ninh mềm dẻo, nhãn nhục ngọt thanh quyện cùng trà ô long hảo hạng và lớp kem củ năng giòn.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-space-xs">
                  <span className="font-label-sm text-label-sm text-primary font-medium">
                    Bán ra 980+ ly
                  </span>
                  <button
                    onClick={() => onSelectProduct('tra-sen-vang')}
                    className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer"
                    title="Chọn món & Tuỳ chỉnh"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card 3: Cold Brew Đóng Chai */}
            <div className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="relative h-56 bg-surface-container overflow-hidden">
                <div
                  className="bg-cover bg-center w-full h-full group-hover:scale-105 transition-transform duration-500"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80')`
                  }}
                />
                <span className="absolute top-3 left-3 px-space-sm py-0.5 rounded-md bg-secondary text-white font-label-sm text-label-sm uppercase font-bold">
                  Ủ lạnh 16H
                </span>
                <span className="absolute bottom-3 right-3 px-space-sm py-0.5 rounded bg-surface-container-lowest/90 backdrop-blur font-tabular-data text-tabular-data font-semibold text-on-surface">
                  68.000đ
                </span>
              </div>
              <div className="p-space-md flex flex-col flex-1 justify-between gap-space-sm">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-secondary">Đóng chai</span>
                    <div className="flex items-center gap-0.5 text-tertiary-container">
                      <span className="material-symbols-outlined text-[16px] text-amber-500">star</span>
                      <span className="font-tabular-data text-label-sm font-bold">4.9</span>
                    </div>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Cold Brew Đóng Chai Aura Reserve
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                    Chiết xuất lạnh 16 tiếng từ 100% Arabica Bourbon, hương hoa quả nhiệt đới tươi mát, giữ trọn vị nguyên bản.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-space-xs">
                  <span className="font-label-sm text-label-sm text-primary font-medium">
                    Bán ra 870+ chai
                  </span>
                  <button
                    onClick={() => onSelectProduct('coldbrew-300ml')}
                    className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer"
                    title="Chọn món & Tuỳ chỉnh"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card 4: Caramel Macchiato Đặc Sản */}
            <div className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="relative h-56 bg-surface-container overflow-hidden">
                <div
                  className="bg-cover bg-center w-full h-full group-hover:scale-105 transition-transform duration-500"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80')`
                  }}
                />
                <span className="absolute top-3 left-3 px-space-sm py-0.5 rounded-md bg-primary-container text-white font-label-sm text-label-sm uppercase font-bold">
                  Pha máy
                </span>
                <span className="absolute bottom-3 right-3 px-space-sm py-0.5 rounded bg-surface-container-lowest/90 backdrop-blur font-tabular-data text-tabular-data font-semibold text-on-surface">
                  55.000đ
                </span>
              </div>
              <div className="p-space-md flex flex-col flex-1 justify-between gap-space-sm">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-secondary">Cà phê máy</span>
                    <div className="flex items-center gap-0.5 text-tertiary-container">
                      <span className="material-symbols-outlined text-[16px] text-amber-500">star</span>
                      <span className="font-tabular-data text-label-sm font-bold">4.8</span>
                    </div>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Caramel Macchiato Đặc Sản
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                    Lớp sữa tươi nóng thanh dịu, quyện cùng espresso kép Arabica Cầu Đất đậm đà và vân sốt caramel thơm lừng.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-space-xs">
                  <span className="font-label-sm text-label-sm text-primary font-medium">
                    Bán ra 1.250+ ly
                  </span>
                  <button
                    onClick={() => onSelectProduct('caramel-macchiato')}
                    className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer"
                    title="Chọn món & Tuỳ chỉnh"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seasonal Releases */}
      <div className="w-full bg-surface-container-low py-space-xl px-margin-lg">
        <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm">
            <div className="flex flex-col gap-space-xs">
              <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-wider">
                Aura Seasonal Releases
              </span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
                Bộ sưu tập món mới & Đặc sản tuyển chọn
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Các công thức hương vị mới nhất được cập nhật đồng bộ với quầy và hệ thống Aura Café.
              </p>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="px-space-sm py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                Phiên bản giới hạn
              </span>
              <span className="px-space-sm py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                Ra mắt tháng này
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-lg">
            {/* Seasonal 1: Latte Nghệ Thuật Hạt Phỉ */}
            <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm flex flex-col group">
              <div className="relative h-64 overflow-hidden">
                <div
                  className="bg-cover bg-center w-full h-full group-hover:scale-105 transition-transform duration-500"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80')`
                  }}
                />
                <div className="absolute top-3 left-3 bg-surface-container-lowest/90 backdrop-blur px-space-sm py-1 rounded text-primary font-label-sm text-label-sm font-semibold">
                  Món mới
                </div>
              </div>
              <div className="p-space-lg flex flex-col flex-1 justify-between gap-space-md">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-secondary">Cà phê máy</span>
                    <span className="font-tabular-data text-headline-sm font-bold text-primary">
                      52.000đ
                    </span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                    Latte Nghệ Thuật Hạt Phỉ
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Hòa quyện tinh tế giữa espresso thơm ngát, sữa tươi đánh bọt mịn màng và siro hạt phỉ thơm lừng.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-space-sm bg-surface-container/50 -mx-space-lg -mb-space-lg p-space-md">
                  <span className="font-label-sm text-label-sm text-secondary">
                    Phục vụ: Nóng / Lạnh
                  </span>
                  <button
                    onClick={() => onSelectProduct('latte-hat-phi')}
                    className="font-label-md text-label-md text-primary font-semibold hover:underline cursor-pointer"
                  >
                    Chi tiết & Thêm món
                  </button>
                </div>
              </div>
            </div>

            {/* Seasonal 2: Trà Đào Cam Sả Tươi */}
            <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm flex flex-col group">
              <div className="relative h-64 overflow-hidden">
                <div
                  className="bg-cover bg-center w-full h-full group-hover:scale-105 transition-transform duration-500"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80')`
                  }}
                />
                <div className="absolute top-3 left-3 bg-surface-container-lowest/90 backdrop-blur px-space-sm py-1 rounded text-primary font-label-sm text-label-sm font-semibold">
                  Món mới
                </div>
              </div>
              <div className="p-space-lg flex flex-col flex-1 justify-between gap-space-md">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-secondary">Trà trái cây</span>
                    <span className="font-tabular-data text-headline-sm font-bold text-primary">
                      45.000đ
                    </span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                    Trà Đào Cam Sả Tươi
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Nước cốt trà đen Ceylon thanh dịu kết hợp miếng đào giòn ngọt mọng nước cùng sả tươi ấm nồng.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-space-sm bg-surface-container/50 -mx-space-lg -mb-space-lg p-space-md">
                  <span className="font-label-sm text-label-sm text-secondary">
                    Phục vụ: Lạnh đá
                  </span>
                  <button
                    onClick={() => onSelectProduct('tra-dao-cam-sa')}
                    className="font-label-md text-label-md text-primary font-semibold hover:underline cursor-pointer"
                  >
                    Chi tiết & Thêm món
                  </button>
                </div>
              </div>
            </div>

            {/* Seasonal 3: Matcha Latte Uji Kyoto Đá Xay */}
            <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm flex flex-col group">
              <div className="relative h-64 overflow-hidden">
                <div
                  className="bg-cover bg-center w-full h-full group-hover:scale-105 transition-transform duration-500"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80')`
                  }}
                />
                <div className="absolute top-3 left-3 bg-surface-container-lowest/90 backdrop-blur px-space-sm py-1 rounded text-primary font-label-sm text-label-sm font-semibold">
                  Bán chạy
                </div>
              </div>
              <div className="p-space-lg flex flex-col flex-1 justify-between gap-space-md">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-secondary">Đá xay & Matcha</span>
                    <span className="font-tabular-data text-headline-sm font-bold text-primary">
                      58.000đ
                    </span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                    Matcha Latte Uji Kyoto Đá Xay
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Bột trà xanh Uji trứ danh cố đô Kyoto xay cùng sữa hạt và kem whipping bông xốp béo mịn thượng hạng.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-space-sm bg-surface-container/50 -mx-space-lg -mb-space-lg p-space-md">
                  <span className="font-label-sm text-label-sm text-secondary">
                    Phục vụ: Đá xay mát lạnh
                  </span>
                  <button
                    onClick={() => onSelectProduct('matcha-uji')}
                    className="font-label-md text-label-md text-primary font-semibold hover:underline cursor-pointer"
                  >
                    Chi tiết & Thêm món
                  </button>
                </div>
              </div>
            </div>
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
                Trải nghiệm không giới hạn
              </span>
              <h2 className="font-headline-lg text-headline-lg md:text-display-lg font-bold">
                Bạn đã sẵn sàng thưởng thức ly cà phê hoàn hảo hôm nay?
              </h2>
              <p className="font-body-lg text-body-lg text-primary-fixed">
                Hơn 45 thức uống được cân chỉnh hoàn hảo từ đội ngũ Barista tâm huyết đang sẵn sàng phục vụ tại chi nhánh hoặc giao nóng hổi tận nơi.
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

import { useNavigate } from 'react-router-dom';

const HomeContainer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <HomePage
      onNavigate={(route) => {
        if (route === 'login') navigate('/login');
        if (route === 'menu') navigate('/menu');
        if (route === 'profile') navigate('/profile');
      }}
      onNavigateCategory={(categoryName) => {
        navigate(`/menu?category=${encodeURIComponent(categoryName)}`);
      }}
      onSelectProduct={(productId) => {
        const search: Record<string, string> = {
          'ca-phe-muoi': 'muối',
          'tra-sen-vang': 'sen vàng',
          'coldbrew-300ml': 'cold brew',
          'caramel-macchiato': 'caramel',
          'latte-hat-phi': 'hạt phỉ',
          'tra-dao-cam-sa': 'trà đào',
          'matcha-uji': 'matcha'
        };
        navigate(`/menu?search=${encodeURIComponent(search[productId] || productId)}`);
      }}
      onQuickAdd={(product) => {
        navigate(`/menu?search=${encodeURIComponent(product.name)}`);
      }}
    />
  );
};

export default HomeContainer;
