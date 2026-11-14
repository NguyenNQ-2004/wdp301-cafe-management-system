import { useState } from 'react';
import type { PageRoute, CartItem } from '../types';
import { useDb } from '../data/DbContext';
import { calcUnitPrice, fmtMoney, productSizes, productToppings } from '../data/dbUtils';
import StorefrontProductCard from '../components/StorefrontProductCard';
import { repairDisplayText } from '../../lib/displayText';
import '../storefront.css';
interface Props { productId: number; onNavigate: (route: PageRoute) => void; onAddToCart: (item: CartItem, goToCart?: boolean) => void; onSelectProduct?: (id: number) => void }
export const CustomizePage = ({ productId, onNavigate, onAddToCart, onSelectProduct }: Props) => {
  const { db } = useDb();
  const product = db.products.find(item => item.id === productId);
  const sizes = product ? productSizes(product) : [];
  const [size, setSize] = useState(sizes[0]?.[0] || 'M');
  const [toppings, setToppings] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  if (!product) return <div className="swp-store-empty">Không tìm thấy sản phẩm.</div>;
  const category = db.categories.find(item => item.id === product.category_id);
  const price = calcUnitPrice(product, size, toppings);
  const related = db.products.filter(item => item.id !== product.id && item.is_available && item.category_id === product.category_id).slice(0, 4);
  const add = () => onAddToCart({ cartId: `detail-${product.id}`, product_id: product.id, quantity, unit_price: price, checked: true, customization: { size, ...(toppings.length ? { topping: toppings } : {}) } }, false);
  return <div className="swp-storefront"><div className="mx-auto max-w-[1200px]"><div className="mb-7 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-500"><div><button onClick={() => onNavigate('home')}>Trang chủ</button> › <button onClick={() => onNavigate('menu')}>Menu & Đồ uống</button> › {product.name}</div><button className="rounded-full border px-4 py-2 text-stone-800" onClick={() => onNavigate('menu')}>← Tất cả thực đơn</button></div>
    <div className="grid items-start gap-8 md:grid-cols-[5fr_7fr]"><div className="relative overflow-hidden rounded-3xl bg-stone-100"><img className="h-[420px] w-full object-cover lg:h-[500px]" src={product.image_url || '/cafe-placeholder.svg'} alt={product.name} /><span className="absolute bottom-5 left-5 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-primary">{category?.name}</span></div>
      <section className="py-3"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-primary">● {category?.name}</p><h1 className="mb-5 text-3xl font-extrabold leading-tight md:text-4xl">{product.name}</h1><div className="mb-5 flex gap-2 text-xs"><span className="rounded-full border border-green-200 bg-green-50 px-3 py-2 text-green-800">✓ Còn phục vụ</span><span className="rounded-full border px-3 py-2 text-stone-500">Giao hàng tận nơi</span></div><p className="mb-5 text-sm leading-relaxed text-stone-500">{product.description}</p><p className="mb-6 border-b pb-5"><strong className="text-4xl font-extrabold text-primary">{fmtMoney(price)}</strong><span className="ml-3 text-xs text-stone-400">Giá tiêu chuẩn / 1 món</span></p>
        <fieldset className="mb-6"><legend className="mb-3 text-sm font-bold">Chọn size</legend><div className="flex flex-wrap gap-3">{sizes.map(([name, extra]) => <button key={name} aria-pressed={size === name} className={`swp-option-chip ${size === name ? 'selected' : ''}`} onClick={() => setSize(name)}>{name} {extra ? `+${fmtMoney(extra)}` : 'Tiêu chuẩn'}</button>)}</div></fieldset>
        {productToppings(product).length > 0 && <fieldset className="mb-6"><legend className="mb-3 text-sm font-bold">Thêm topping</legend><div className="grid gap-3 sm:grid-cols-2">{productToppings(product).map(item => <label key={item.name} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 text-sm ${toppings.includes(item.name) ? 'border-primary bg-red-50' : ''}`}><span><input type="checkbox" checked={toppings.includes(item.name)} onChange={() => setToppings(previous => previous.includes(item.name) ? previous.filter(name => name !== item.name) : [...previous, item.name])} className="mr-2 accent-primary" />{repairDisplayText(item.name)}</span><b className="text-xs text-primary">+{fmtMoney(item.price)}</b></label>)}</div></fieldset>}
        <div className="flex flex-wrap items-center gap-4 border-t pt-5"><div className="swp-cart-qty"><button aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity(value => Math.max(1, value - 1))}>−</button><b>{quantity}</b><button aria-label="Tăng số lượng" disabled={quantity >= 99} onClick={() => setQuantity(value => Math.min(99, value + 1))}>+</button></div><button className="swp-primary-button flex-1" onClick={add}>Thêm vào giỏ hàng • {fmtMoney(price * quantity)}</button></div>
      </section>
    </div>
    {related.length > 0 && <section className="mt-12"><div className="swp-products-heading"><div><h2>Có thể bạn cũng thích</h2><p className="text-sm text-stone-500">Khám phá thêm hương vị từ Aura Café</p></div></div><div className="swp-products-grid">{related.map(item => <StorefrontProductCard key={item.id} product={item} category={category?.name || ''} onDetail={() => onSelectProduct?.(item.id)} onCustomize={() => onSelectProduct?.(item.id)} />)}</div></section>}
  </div></div>;
};
