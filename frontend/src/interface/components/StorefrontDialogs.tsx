import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Product, OrderCustomization } from '../types';
import { fmtMoney, calcUnitPrice, productSizes, productToppings } from '../data/dbUtils';
import useCartStore from '../../store/cartStore';
import { repairDisplayText } from '../../lib/displayText';

function Dialog({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    root.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
      if (event.key === 'Tab') {
        const controls = root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href],textarea');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  return <div className="swp-dialog-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className="swp-dialog" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={root}><button className="swp-dialog-close" aria-label="Đóng" onClick={onClose}><span className="material-symbols-outlined text-lg">close</span></button>{children}</div></div>;
}

export function ProductOptionsDialog({ product, category, onClose, onAdd }: { product: Product; category: string; onClose: () => void; onAdd: (size: string, quantity: number, options: OrderCustomization) => boolean }) {
  const sizes = productSizes(product);
  const [size, setSize] = useState(sizes[0]?.[0] || 'M');
  const [toppings, setToppings] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const total = calcUnitPrice(product, size, toppings) * quantity;
  const submit = () => { if (onAdd(size, quantity, { size, ...(toppings.length ? { topping: toppings } : {}) })) onClose(); else setError('Chưa thêm được món. Kiểm tra số lượng trong giỏ hoặc thử lại.'); };
  return <Dialog label={`Tùy chọn ${product.name}`} onClose={onClose}><div className="swp-product-dialog-grid"><img src={product.image_url || '/cafe-placeholder.svg'} alt={product.name} /><div><p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">{category}</p><h2 className="text-2xl font-bold">{product.name}</h2><p className="mt-2 text-sm text-stone-500">{product.description}</p><p className="my-4 border-b pb-3"><strong className="text-3xl text-primary">{fmtMoney(calcUnitPrice(product, size, toppings))}</strong><span className="ml-2 text-xs text-stone-500">/ Giá tiêu chuẩn</span></p>
    <fieldset className="mb-4"><legend className="mb-2 text-xs font-bold text-stone-500">CHỌN SIZE (KÍCH CỠ):</legend><div className="flex flex-wrap gap-2">{sizes.map(([name, price]) => <button type="button" aria-pressed={size === name} key={name} className={`swp-option-chip ${size === name ? 'selected' : ''}`} onClick={() => setSize(name)}>{name}{price > 0 ? ` +${fmtMoney(price)}` : ''}</button>)}</div></fieldset>
    {productToppings(product).length > 0 && <fieldset className="mb-4"><legend className="mb-2 text-xs font-bold text-stone-500">TOPPING THÊM:</legend><div className="space-y-2">{productToppings(product).map(topping => <label key={topping.name} className="flex cursor-pointer items-center justify-between gap-2 text-sm"><span><input type="checkbox" checked={toppings.includes(topping.name)} onChange={() => setToppings(previous => previous.includes(topping.name) ? previous.filter(name => name !== topping.name) : [...previous, topping.name])} className="mr-2 accent-primary" />{repairDisplayText(topping.name)}</span><span>+{fmtMoney(topping.price)}</span></label>)}</div></fieldset>}
    {error && <p role="alert" className="mb-2 text-sm text-red-700">{error}</p>}<div className="flex flex-wrap items-center gap-3 border-t pt-4"><div className="swp-cart-qty"><button aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity(value => Math.max(1, value - 1))}>−</button><b>{quantity}</b><button aria-label="Tăng số lượng" disabled={quantity >= 99} onClick={() => setQuantity(value => Math.min(99, value + 1))}>+</button></div><button onClick={submit} className="swp-primary-button flex-1">Chọn món này • {fmtMoney(total)}</button></div>
  </div></div></Dialog>;
}

export function SelectedItemsDialog({ onClose, onCart }: { onClose: () => void; onCart: () => void }) {
  const items = useCartStore(state => state.items);
  const update = useCartStore(state => state.updateQuantity);
  const remove = useCartStore(state => state.removeItem);
  const replace = useCartStore(state => state.replace);
  return <Dialog label="Món đang chọn" onClose={onClose}><div className="mx-auto max-w-[500px]"><div className="mb-5 pr-8"><h2 className="text-xl font-bold">Món đang chọn <span className="ml-2 text-sm text-primary">{items.reduce((sum, item) => sum + item.quantity, 0)} món</span></h2><p className="mt-1 text-sm text-stone-500">Các món bạn vừa chọn tại Aura Café</p></div>{items.length ? <><button className="text-xs font-semibold text-primary" onClick={() => replace([], useCartStore.getState().ownerId)}>Xoá tất cả</button>{items.map(item => <article key={item.cartId} className="swp-cart-preview-line"><img src={item.image || '/cafe-placeholder.svg'} alt={item.name} /><div><b>{item.name}</b><p>Size {item.size}{(item.customization?.topping || []).map(name => ` · ${repairDisplayText(name)}`).join('')}</p><div className="flex flex-wrap items-center justify-between gap-3"><div className="swp-cart-qty"><button aria-label={`Giảm ${item.name}`} disabled={item.quantity <= 1} onClick={() => update(item.cartId, -1)}>−</button><b>{item.quantity}</b><button aria-label={`Tăng ${item.name}`} onClick={() => update(item.cartId, 1)}>+</button></div><strong>{fmtMoney(item.unitPrice * item.quantity)}</strong><button aria-label={`Xóa ${item.name}`} onClick={() => remove(item.cartId)}>×</button></div></div></article>)}<button onClick={onCart} className="swp-primary-button mt-5 w-full">Xem giỏ hàng →</button></> : <div className="swp-store-empty"><h2>Chưa có món nào được chọn</h2><p>Hãy chọn các món yêu thích từ thực đơn nhé.</p></div>}<button onClick={onClose} className="mt-3 w-full py-2 text-sm text-stone-500">+ Chọn thêm món khác</button></div></Dialog>;
}
