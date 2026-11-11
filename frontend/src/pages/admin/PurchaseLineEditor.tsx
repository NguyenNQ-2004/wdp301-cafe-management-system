import { NumberInput } from '../../components/NumberInput';
import { purchaseQuantity, purchaseUnits } from '../../lib/purchaseCost';
import type { PurchaseIngredient, PurchaseLine } from '../../lib/purchaseCost';
import { Field, inputCls } from './AdminUi';

export function PurchaseLineEditor({ line, ingredients, index, onChange, onRemove, disabled = false }: {
  line: PurchaseLine; ingredients: PurchaseIngredient[]; index: number;
  onChange: (patch: Partial<PurchaseLine>) => void; onRemove?: () => void; disabled?: boolean;
}) {
  const ingredient = ingredients.find(row => row._id === line.ingredient);
  const amount = ingredient ? purchaseQuantity(line, ingredient) : 0;
  const number = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(value);
  return <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Nguyên liệu"><select aria-label={`Nguyên liệu ${index + 1}`} required disabled={disabled} className={inputCls} value={line.ingredient} onChange={event => {
        const selected = ingredients.find(row => row._id === event.target.value);
        if (selected) onChange({ ingredient: selected._id, inputUnit: selected.unit });
      }}>{ingredients.map(row => <option key={row._id} value={row._id}>{row.name}</option>)}</select></Field>
      <Field label="Số lượng mua"><div className="flex gap-2">
        <NumberInput aria-label={`Số lượng mua ${index + 1}`} required disabled={disabled} type="number" min="0.001" step="any" value={line.quantity} className={inputCls} onChange={event => onChange({ quantity: event.target.value === '' ? '' : Number(event.target.value) })} />
        <select aria-label={`Đơn vị mua ${index + 1}`} disabled={disabled} className={`${inputCls} max-w-24`} value={line.inputUnit} onChange={event => onChange({ inputUnit: event.target.value })}>{purchaseUnits(ingredient?.unit || line.inputUnit).map(option => <option key={option.label} value={option.label}>{option.label}</option>)}</select>
      </div></Field>
      <Field label="Tổng tiền trả cho lượng này (đ)"><NumberInput aria-label={`Tổng tiền ${index + 1}`} required disabled={disabled} type="number" min="0" step="1" placeholder="Ví dụ: 200000" className={inputCls} value={line.totalCost} onChange={event => onChange({ totalCost: event.target.value === '' ? '' : Number(event.target.value) })} /></Field>
      <div className="flex items-end justify-between gap-2 text-xs"><p className="text-stone-600">{line.totalCost !== '' && amount > 0
        ? <>Tự tính: <strong>{number(line.totalCost)}đ ÷ {number(amount)} {ingredient?.unit} = {number(line.totalCost / amount)}đ/{ingredient?.unit}</strong></>
        : 'Nhập số lượng và tổng tiền; hệ thống tự chia đơn giá.'}</p>{onRemove && <button type="button" disabled={disabled} aria-label={`Xóa dòng ${index + 1}`} onClick={onRemove} className="shrink-0 text-rose-700">Xóa dòng</button>}</div>
    </div>
  </div>;
}
