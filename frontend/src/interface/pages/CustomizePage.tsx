import React, { useEffect, useState } from 'react';
import type { PageRoute, CartItem } from '../types';
import { useDb } from '../data/DbContext';
import { calcUnitPrice, defaultSize, fmtMoney, productSizes, productToppings } from '../data/dbUtils';

interface CustomizePageProps {
  productId: number;
  onNavigate: (route: PageRoute) => void;
  onAddToCart: (item: CartItem, goToCart?: boolean) => void;
}

// Mức đường / đá không có cột riêng: được lưu trong JSON order_items.customization (khoá "sugar", "ice")
const SUGAR_LEVELS = ['0%', '30%', '50%', '100%'];
const ICE_LEVELS = ['Không đá', 'Ít đá', 'Đá chuẩn'];

export const CustomizePage: React.FC<CustomizePageProps> = ({ productId, onNavigate, onAddToCart }) => {
  const { db } = useDb();
  const product = db.products.find(p => p.id === productId) ?? db.products[0];
  const category = db.categories.find(c => c.id === product.category_id);
  const sizes = productSizes(product);
  const toppings = productToppings(product);
  // Bánh ngọt không có tuỳ chọn đường/đá
  const isDrink = category?.name !== 'Bánh ngọt';

  const [size, setSize] = useState<string | undefined>(defaultSize(product));
  const [sugar, setSugar] = useState('50%');
  const [ice, setIce] = useState('Đá chuẩn');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setSize(defaultSize(product));
    setSelectedToppings([]);
    setNote('');
    setQuantity(1);
  }, [product.id]);

  const unitPrice = calcUnitPrice(product, size, selectedToppings);
  const totalPrice = unitPrice * quantity;

  const toggleTopping = (name: string) =>
    setSelectedToppings(prev => (prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]));

  const appendNote = (text: string) =>
    setNote(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return text;
      return trimmed.length + text.length + 2 <= 120 ? `${trimmed}, ${text}` : trimmed;
    });

  const handleAdd = () => {
    onAddToCart({
      cartId: `cart-${Date.now()}`,
      product_id: product.id,
      quantity,
      unit_price: unitPrice,
      customization: {
        size,
        ...(isDrink ? { sugar, ice } : {}),
        ...(selectedToppings.length ? { topping: selectedToppings } : {}),
        ...(note.trim() ? { note: note.trim() } : {})
      },
      checked: true
    });
  };

  const crossSell = db.products
    .filter(p => p.is_available && p.id !== product.id)
    .filter(p => db.categories.find(c => c.id === p.category_id)?.name === 'Bánh ngọt')
    .slice(0, 4);

  return (
    <div className="flex flex-col w-full">
      {/* Breadcrumb Bar */}
      <div className="w-full px-margin-lg py-space-md bg-surface-container-low flex items-center justify-between border-b border-surface-container-high">
        <div className="flex items-center gap-space-sm font-label-md text-label-md text-on-surface-variant">
          <button
            onClick={() => onNavigate('menu')}
            className="hover:text-primary transition-colors flex items-center gap-space-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Thực đơn</span>
          </button>
          <span>/</span>
          <span>{category?.name}</span>
          <span>/</span>
          <span className="text-on-surface font-semibold">{product.name}</span>
        </div>
        <span className="hidden sm:inline text-secondary font-body-sm text-body-sm">Mã SP: #{product.id}</span>
      </div>

      {/* Main Layout Grid */}
      <div className="w-full px-margin-lg py-space-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          {/* Visual Column */}
          <div className="lg:col-span-5 flex flex-col gap-space-md lg:sticky lg:top-24">
            <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden shadow-lg bg-surface-container-highest group">
              <img
                src={product.image_url ?? ''}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-space-md left-space-md flex flex-col gap-space-xs">
                {product.badge && (
                  <span className="px-space-md py-space-xs rounded-full bg-primary-container text-white font-label-sm text-label-sm shadow-md uppercase tracking-wider font-bold">
                    {product.badge}
                  </span>
                )}
              </div>
              {product.subtitle && (
                <div className="absolute bottom-space-md right-space-md bg-surface-container-lowest/90 backdrop-blur-md px-space-md py-space-sm rounded-lg shadow-md">
                  <span className="font-label-md text-label-md text-on-surface font-semibold">{product.subtitle}</span>
                </div>
              )}
            </div>

            {/* Thông tin danh mục */}
            {category && (
              <div className="p-space-md bg-surface-container-lowest rounded-lg shadow-sm flex items-center gap-space-md border border-surface-container-high">
                <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">{category.icon ?? 'local_cafe'}</span>
                </span>
                <div>
                  <span className="font-label-lg text-label-lg text-on-surface font-semibold block">{category.name}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">{category.description}</span>
                </div>
              </div>
            )}
          </div>

          {/* Configurator Column */}
          <div className="lg:col-span-7 flex flex-col gap-space-lg">
            <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm flex flex-col gap-space-md border border-surface-container-high">
              <div className="flex flex-col gap-space-xs">
                <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight mt-space-xs font-bold">{product.name}</h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">{product.description}</p>
              </div>
              <div className="flex items-baseline gap-space-md pt-space-xs">
                <span className="font-display-lg text-display-lg text-primary tabular-data font-bold">{fmtMoney(unitPrice)}</span>
                <span className="font-body-md text-body-md text-secondary">Giá gốc {fmtMoney(product.base_price)}</span>
              </div>
            </div>

            {/* 1. Size (variants_config.sizes) */}
            {sizes.length > 0 && (
              <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm flex flex-col gap-space-md border border-surface-container-high">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary text-[20px]">local_cafe</span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">1. Chọn kích cỡ</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-wider">Bắt buộc</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
                  {sizes.map(([name, delta]) => (
                    <label
                      key={name}
                      onClick={() => setSize(name)}
                      className={`cursor-pointer relative p-space-md rounded-lg flex flex-col gap-space-xs transition-all duration-150 border-2 ${
                        size === name
                          ? 'border-primary-container bg-surface-container-low shadow-sm'
                          : 'border-transparent bg-surface hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">{name}</span>
                        <span className={`material-symbols-outlined text-[20px] ${size === name ? 'text-primary' : 'text-outline-variant'}`}>
                          {size === name ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                      </div>
                      <span className="font-tabular-data text-tabular-data font-semibold text-primary mt-space-xs">
                        {delta > 0 ? `+${fmtMoney(delta)}` : 'Không phụ thu'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Sugar & 3. Ice */}
            {isDrink && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
                <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm flex flex-col gap-space-md border border-surface-container-high">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary text-[20px]">nutrition</span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">2. Mức đường</span>
                  </div>
                  <div className="grid grid-cols-2 gap-space-sm">
                    {SUGAR_LEVELS.map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSugar(lvl)}
                        className={`h-11 px-space-sm rounded-lg font-label-md text-label-md flex items-center justify-center transition-colors cursor-pointer ${
                          sugar === lvl ? 'bg-primary-container text-white font-semibold shadow-sm' : 'bg-surface text-on-surface hover:bg-surface-container'
                        }`}
                      >
                        {lvl} đường
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm flex flex-col gap-space-md border border-surface-container-high">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary text-[20px]">ac_unit</span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">3. Lượng đá</span>
                  </div>
                  <div className="grid grid-cols-3 gap-space-sm">
                    {ICE_LEVELS.map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setIce(lvl)}
                        className={`h-11 px-space-xs rounded-lg font-label-md text-label-md flex items-center justify-center transition-colors cursor-pointer ${
                          ice === lvl ? 'bg-primary-container text-white font-semibold shadow-sm' : 'bg-surface text-on-surface hover:bg-surface-container'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. Toppings (variants_config.toppings) */}
            {toppings.length > 0 && (
              <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm flex flex-col gap-space-md border border-surface-container-high">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">add_circle</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">4. Topping thêm</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  {toppings.map(top => {
                    const checked = selectedToppings.includes(top.name);
                    return (
                      <label
                        key={top.name}
                        className={`cursor-pointer p-space-md rounded-lg flex items-center justify-between gap-space-sm transition-all duration-150 border-2 ${
                          checked ? 'bg-primary-fixed border-primary/30 text-primary shadow-sm' : 'bg-surface hover:bg-surface-container border-transparent'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold">{top.name}</span>
                          <span className="font-tabular-data text-tabular-data font-semibold text-primary">+{fmtMoney(top.price)}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTopping(top.name)}
                          className="w-5 h-5 accent-primary cursor-pointer rounded"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Ghi chú cho barista (customization.note) */}
            <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-sm flex flex-col gap-space-sm border border-surface-container-high">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">edit_note</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">5. Ghi chú riêng cho Barista</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{note.length}/120</span>
              </div>
              <textarea
                rows={2}
                maxLength={120}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ví dụ: Để riêng kem muối, ít cà phê hơn..."
                className="w-full p-space-md rounded-lg bg-surface text-on-surface placeholder:text-secondary font-body-md text-body-md focus:outline-none focus:bg-surface-container-low transition-all resize-none border-0"
              />
              <div className="flex items-center gap-space-sm flex-wrap mt-space-xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Gợi ý nhanh:</span>
                {['Tách đá riêng', 'Ít cà phê hơn', 'Không lấy ống hút'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => appendNote(t)}
                    className="px-space-sm py-1 bg-surface-container rounded font-label-sm text-label-sm text-on-surface hover:bg-secondary-container transition-colors cursor-pointer"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Order Summary Bar & CTA */}
            <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-lg sticky bottom-4 z-40 border border-surface-container-high">
              <div className="flex items-center justify-between sm:justify-start gap-space-lg">
                <div className="flex flex-col gap-space-xs">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Số lượng</span>
                  <div className="flex items-center bg-surface-container rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-9 h-9 rounded-md bg-surface text-on-surface flex items-center justify-center hover:bg-surface-container-high transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <span className="w-10 text-center font-tabular-data text-tabular-data font-bold text-on-surface">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(q => q + 1)}
                      className="w-9 h-9 rounded-md bg-surface text-on-surface flex items-center justify-center hover:bg-surface-container-high transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Tạm tính</span>
                  <span className="font-headline-lg text-headline-lg text-primary tabular-data font-bold">{fmtMoney(totalPrice)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!product.is_available}
                className="flex-1 sm:flex-none h-12 px-space-xl bg-primary-container text-white rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-space-sm shadow-md hover:bg-primary transition-all active:scale-[0.98] cursor-pointer font-semibold disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                <span>{product.is_available ? 'Thêm vào giỏ hàng' : 'Món tạm ngưng bán'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-sell: các món thuộc danh mục Bánh ngọt */}
      {crossSell.length > 0 && (
        <div className="w-full px-margin-lg py-space-xl bg-surface-container-low mt-space-xl border-t border-surface-container-high">
          <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-wider">Hoàn hảo khi dùng cùng</span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">Bánh ngọt</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter-lg">
              {crossSell.map(p => (
                <div
                  key={p.id}
                  className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm flex flex-col group border border-surface-container-high"
                >
                  <div className="w-full aspect-[4/3] overflow-hidden bg-surface-container relative">
                    <img src={p.image_url ?? ''} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {p.badge && (
                      <span className="absolute top-space-sm left-space-sm bg-surface-container-lowest/90 px-space-xs py-0.5 rounded text-label-sm font-label-sm text-on-surface font-semibold shadow-sm">
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <div className="p-space-md flex flex-col justify-between flex-1 gap-space-sm">
                    <div className="flex flex-col">
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">{p.name}</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">{p.subtitle}</p>
                    </div>
                    <div className="flex items-center justify-between pt-space-xs">
                      <span className="font-tabular-data text-tabular-data font-bold text-primary">{fmtMoney(p.base_price)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const s = defaultSize(p);
                          onAddToCart(
                            {
                              cartId: `cart-cross-${Date.now()}`,
                              product_id: p.id,
                              quantity: 1,
                              unit_price: calcUnitPrice(p, s),
                              customization: s ? { size: s } : {},
                              checked: true
                            },
                            false
                          );
                        }}
                        className="w-8 h-8 rounded-full bg-surface-container hover:bg-primary-container hover:text-white text-on-surface flex items-center justify-center transition-colors cursor-pointer"
                        title="Thêm vào giỏ"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
