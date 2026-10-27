import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Order, OrderCustomization } from '../../types';
import { useDb } from '../../data/DbContext';
import useAuthStore from '../../../store/authStore';
import { shopApi } from '../../../lib/shopApi';
import { calcUnitPrice, fmtMoney, orderItemsOf, productToppings } from '../../data/dbUtils';
import { counterOrderPayload } from '../../../lib/counterOrderPayload';

export default function CounterOrderEditor({ order, onClose }: { order: Order; onClose: () => void }) {
  const { db, rawId, refresh, notify } = useDb();
  const account = useAuthStore(state => state.user);
  const titleId = useId();
  const nextKey = useRef(0);
  const dialog = useRef<HTMLElement>(null);
  const [lines, setLines] = useState(() => orderItemsOf(db, order.id).map(item => ({
    key: nextKey.current++, productId: item.product_id, size: item.customization?.size || 'M', quantity: item.quantity,
    customization: structuredClone(item.customization || {}) as OrderCustomization,
  })));
  const [tableNumber, setTableNumber] = useState(order.table_number || '');
  const [note, setNote] = useState(order.order_note || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>('input, select, button')?.focus();
    return () => { previous?.focus(); };
  }, []);
  const catalog = db.products.filter(product => product.is_available || lines.some(line => line.productId === product.id));
  const total = lines.reduce((sum, line) => {
    const product = db.products.find(product => product.id === line.productId);
    return sum + (product ? calcUnitPrice(product, line.size, line.customization.topping || []) : 0) * (line.quantity || 0);
  }, 0);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || !account?.token) return;
    setError('');
    if (!lines.length || lines.some(line => !line.productId || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99)) {
      setError('Chọn ít nhất một món, số lượng mỗi món từ 1 đến 99.'); return;
    }
    setSaving(true);
    try {
      await shopApi(`/api/orders/${rawId(order.id)}/counter`, { method: 'PUT', token: account.token, body: {
        expectedUpdatedAt: order.update_token, tableNumber, orderNote: note,
        expectedTotal: total + (order.delivery_fee || 0) - order.discount_amount,
        items: counterOrderPayload(lines.map(line => ({ productId: rawId(line.productId), quantity: line.quantity, customization: { ...line.customization, size: line.size } }))),
      } });
      notify(`Đã cập nhật đơn ${order.order_code}.`);
      await refresh();
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Không thể cập nhật đơn.');
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={event => {
      if (event.key === 'Escape' && !saving) { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)') || []);
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-xl">
      <form onSubmit={save}>
        <div className="border-b border-stone-200 bg-stone-50 p-5">
          <h2 id={titleId} className="text-lg font-bold text-stone-900">Sửa đơn {order.order_code}</h2>
          <p className="mt-1 text-xs text-stone-500">Giá món được cập nhật theo thực đơn hiện tại. Chỉ lưu khi đơn chưa thanh toán và chưa có món được đánh dấu đã pha.</p>
        </div>
        <fieldset disabled={saving} className="space-y-4 p-5">
          {order.order_type === 'DINE_IN' && <label className="block text-sm font-semibold">Số bàn
            <input autoFocus required maxLength={20} value={tableNumber} onChange={event => setTableNumber(event.target.value)} className="mt-1 block w-full rounded-xl border border-stone-200 px-3 py-2 font-normal" />
          </label>}
          <div className="space-y-3">{lines.map((line, index) => {
            const product = db.products.find(product => product.id === line.productId);
            const sizes = Object.keys(product?.variants_config?.sizes || { M: 0 });
            const toppings = product ? productToppings(product) : [];
            const toppingNames = [...new Set([...toppings.map(item => item.name), ...(line.customization.topping || [])])];
            const updateOptions = (patch: Partial<OrderCustomization>) => setLines(current => current.map(item => item.key === line.key ? { ...item, customization: { ...item.customization, ...patch } } : item));
            return <div key={line.key} className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_80px_85px_50px]">
              <label className="text-xs">Món {index + 1}<select aria-label={`Món ${index + 1}`} value={line.productId} onChange={event => {
                const id = Number(event.target.value);
                const selected = db.products.find(product => product.id === id);
                const size = Object.keys(selected?.variants_config?.sizes || { M: 0 })[0] || 'M';
                setLines(current => current.map(item => item.key === line.key ? { ...item, productId: id, size, customization: { size } } : item));
              }} className="mt-1 w-full rounded-lg border border-stone-200 bg-white p-2">
                <option value={0}>Chọn món</option>{catalog.map(product => <option key={product.id} value={product.id}>{product.name}{product.is_available ? '' : ' (ngừng bán)'}</option>)}
              </select></label>
              <label className="text-xs">Size<select aria-label={`Size món ${index + 1}`} value={line.size} onChange={event => setLines(current => current.map(item => item.key === line.key ? { ...item, size: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-stone-200 bg-white p-2">
                {[...new Set([...sizes, line.size])].map(size => <option key={size}>{size}</option>)}
              </select></label>
              <label className="text-xs">Số lượng<input aria-label={`Số lượng món ${index + 1}`} type="number" required min={1} max={99} step={1} value={Number.isNaN(line.quantity) ? '' : line.quantity} onChange={event => setLines(current => current.map(item => item.key === line.key ? { ...item, quantity: event.target.valueAsNumber } : item))} className="mt-1 w-full rounded-lg border border-stone-200 bg-white p-2" /></label>
              <button type="button" aria-label={`Xóa món ${index + 1}`} onClick={() => setLines(current => current.filter(item => item.key !== line.key))} className="self-end rounded-lg border border-rose-200 p-2 text-xs text-rose-700">Xóa</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs">Đường<select aria-label={`Đường món ${index + 1}`} value={line.customization.sugar || ''} onChange={event => updateOptions({ sugar: event.target.value || undefined })} className="mt-1 w-full rounded-lg border border-stone-200 bg-white p-2">
                  <option value="">Không chỉ định</option>{['0%', '30%', '50%', '70%', '100%'].map(sugar => <option key={sugar}>{sugar}</option>)}
                </select></label>
                <label className="text-xs">Đá<select aria-label={`Đá món ${index + 1}`} value={line.customization.ice || ''} onChange={event => updateOptions({ ice: event.target.value || undefined })} className="mt-1 w-full rounded-lg border border-stone-200 bg-white p-2">
                  <option value="">Không chỉ định</option>{['Không đá', 'Ít đá', 'Đá chuẩn'].map(ice => <option key={ice}>{ice}</option>)}
                </select></label>
              </div>
              {toppingNames.length > 0 && <fieldset className="space-y-1"><legend className="text-xs font-semibold">Topping món {index + 1}</legend>{toppingNames.map(name => {
                const topping = toppings.find(item => item.name === name);
                return <label key={name} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={(line.customization.topping || []).includes(name)} onChange={event => updateOptions({ topping: event.target.checked ? [...(line.customization.topping || []), name] : (line.customization.topping || []).filter(value => value !== name) })} />{name} {topping ? `(+${fmtMoney(topping.price)})` : '(không còn bán; hãy bỏ chọn)'}</label>;
              })}</fieldset>}
              <label className="block text-xs">Ghi chú món {index + 1}<input aria-label={`Ghi chú món ${index + 1}`} maxLength={300} value={line.customization.note || ''} onChange={event => updateOptions({ note: event.target.value })} className="mt-1 w-full rounded-lg border border-stone-200 bg-white p-2" /></label>
            </div>;
          })}</div>
          <button type="button" disabled={lines.length >= 50} onClick={() => setLines(current => [...current, { key: nextKey.current++, productId: 0, size: 'M', quantity: 1, customization: {} }])} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-primary">+ Thêm món</button>
          <label className="block text-sm font-semibold">Ghi chú đơn<textarea maxLength={500} value={note} onChange={event => setNote(event.target.value)} className="mt-1 block w-full rounded-xl border border-stone-200 px-3 py-2 font-normal" /></label>
          <p className="text-right text-sm">Thành tiền dự kiến: <strong className="text-primary">{fmtMoney(total + (order.delivery_fee || 0) - order.discount_amount)}</strong></p>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        </fieldset>
        <div className="flex justify-end gap-3 border-t border-stone-200 bg-stone-50 p-4">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-stone-200 px-4 py-2 text-sm">Đóng</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
        </div>
      </form>
    </section>
  </div>;
}
