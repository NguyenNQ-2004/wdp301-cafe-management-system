import React, { useState } from 'react';
import type { PageRoute, Ingredient } from '../../types';
import { useDb } from '../../data/DbContext';
import { shopApi } from '../../lib/shopApi';
import useAuthStore from '../../store/authStore';
import { fmtMoney, fmtNumber, isLowStock, lastPurchasePrice, lastOrderedPrice } from '../../data/dbUtils';
import { AdminLayout, Badge, Field, FormActions, Modal, PrimaryButton, StatCard, inputCls } from './AdminUi';

interface AdminIngredientsPageProps {
  onNavigate: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
}

type IngredientForm = Omit<Ingredient, 'id'> & { openingTotalCost?: number | ''; unpricedTotalCost?: number | '' };
const UNITS = ['gram', 'ml', 'piece', 'kg', 'lít', 'hộp', 'chai', 'gói'];

export const AdminIngredientsPage: React.FC<AdminIngredientsPageProps> = ({ onNavigate, onShowToast }) => {
  const { db, refresh } = useDb();
  const token = useAuthStore(state => state.user?.token);
  const [saving, setSaving] = useState(false);
  const [valuation, setValuation] = useState<{ id: string; name: string; unit: string; quantity: number; total: number | '' } | null>(null);
  const unpricedQuantity = (i: any) => {
    const lots = i.stockLots ?? [];
    const tracked = lots.reduce((sum: number, lot: any) => sum + lot.remainingQuantity, 0);
    return Math.max(0, i.current_stock - tracked) + lots.reduce((sum: number, lot: any) => sum + (lot.unitCost == null ? lot.remainingQuantity : 0), 0);
  };
  const saveValuation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valuation || valuation.total === '' || !token || saving) return;
    setSaving(true);
    try {
      await shopApi(`/api/ingredients/${valuation.id}/unpriced-stock-cost`, { token, method: 'PUT', body: { totalCost: valuation.total } });
      await refresh(); setValuation(null); notify('Đã lưu giá trị tồn cũ để tính giá vốn.');
    } catch (error) { notify((error as Error).message); }
    finally { setSaving(false); }
  };
  const [search, setSearch] = useState('');
  const [localToast, setLocalToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: any; form: IngredientForm } | null>(null);
  const [priceMessage, setPriceMessage] = useState('');
  const editingIngredient = editing?.id ? (db.ingredients || []).find(i => String(i.id) === String(editing.id)) : null;
  const editingUnpriced = editingIngredient ? unpricedQuantity(editingIngredient) : 0;
  const stockValue = (i: any): number | null => {
    if (!i || unpricedQuantity(i) > 0) return null;
    return (i.stockLots ?? []).reduce((sum: number, lot: any) => sum + lot.remainingQuantity * (lot.unitCost ?? 0), 0);
  };
  const saveEditingPrice = async () => {
    if (!editing?.id || !token || saving) return;
    const total = editing.form.unpricedTotalCost;
    if (total === undefined || total === '' || !Number.isSafeInteger(total) || total < 0) {
      setPriceMessage('Bạn cần nhập tổng tiền mua ở ô phía trên rồi bấm Lưu giá vốn.');
      document.getElementById('ingredient-stock-total')?.focus();
      return;
    }
    setSaving(true); setPriceMessage('');
    try {
      await shopApi(`/api/ingredients/${editing.id}/unpriced-stock-cost`, { token, method: 'PUT', body: { totalCost: total } });
      await refresh();
      setPriceMessage('Đã lưu giá vốn. Các công thức sẽ tính theo giá vừa nhập.');
    } catch (error) { setPriceMessage((error as Error).message); }
    finally { setSaving(false); }
  };

  const notify = (msg: string) => {
    if (onShowToast) {
      onShowToast(msg);
    } else {
      setLocalToast(msg);
      setTimeout(() => setLocalToast(null), 3000);
    }
  };

  const supplierName = (id: any) =>
    id ? (db.suppliers || []).find(s => s.id === id || s._id === id || String(s.id) === String(id) || String(s._id) === String(id))?.name ?? '—' : 'Chưa gán';

  const usedIn = (id: any) =>
    (db.product_ingredients || []).filter(b => b.ingredient_id === id || b.ingredientId === id || String(b.ingredient_id) === String(id));

  const rows = (db.ingredients || []).filter(i => (i.name || '').toLowerCase().includes(search.trim().toLowerCase()));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || saving || !token) return;
    const f = editing.form;
    if (f.current_stock < 0 || f.min_stock_level < 0) {
      notify('Tồn kho và mức tối thiểu không được âm (chk_ingredient_stock).');
      return;
    }
    const row = { name: f.name.trim(), unit: f.unit.trim(), supplier: f.supplier_id || null, minStockLevel: f.min_stock_level,
      ...(!editing.id ? { currentStock: f.current_stock, ...(f.openingTotalCost !== undefined && f.openingTotalCost !== '' ? { openingTotalCost: f.openingTotalCost } : {}) } : {}) };
    if (!row.name || !row.unit) { notify('Vui lòng nhập tên và đơn vị nguyên liệu.'); return; }
    setSaving(true);
    try {
      await shopApi(editing.id ? `/api/ingredients/${editing.id}` : '/api/ingredients', { token, method: editing.id ? 'PUT' : 'POST', body: row });
      await refresh();
      notify(editing.id ? `Đã cập nhật nguyên liệu "${row.name}".` : `Đã thêm nguyên liệu "${row.name}".`);
      setEditing(null);
    } catch (error) { notify((error as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (i: Ingredient) => {
    if (saving || !token) return;
    const inPo = (db.purchase_order_items || []).some(
      p => p.ingredient_id === i.id || p.ingredient === i.id || String(p.ingredient_id) === String(i.id)
    );
    const inTx = (db.inventory_transactions || []).some(
      t => t.ingredient_id === i.id || t.ingredient === i.id || String(t.ingredient_id) === String(i.id)
    );
    if (inPo || inTx) {
      notify('Không thể xóa: nguyên liệu đã có phiếu nhập hoặc lịch sử xuất nhập kho.');
      return;
    }
    if (!confirm(`Xóa nguyên liệu "${i.name}"? Định mức liên quan cũng bị xóa (ON DELETE CASCADE).`)) return;
    setSaving(true);
    try {
      await shopApi(`/api/ingredients/${i.id}`, { token, method: 'DELETE' });
      await refresh();
      notify('Đã xóa nguyên liệu.');
    } catch (error) { notify((error as Error).message); }
    finally { setSaving(false); }
  };

  const setForm = (patch: Partial<IngredientForm>) =>
    setEditing(prev => (prev ? { ...prev, form: { ...prev.form, ...patch } } : prev));

  return (
    <AdminLayout
      route="admin-ingredients"
      onNavigate={onNavigate}
      onShowToast={onShowToast}
      table="ingredients"
      title="Quản lý nguyên vật liệu"
      subtitle="Danh mục nguyên liệu, đơn vị tính, nhà cung cấp và ngưỡng tồn kho tối thiểu."
      actions={
        <PrimaryButton
          icon="add_circle"
          onClick={() =>
            setEditing({
              id: null,
              form: {
                supplier_id: db.suppliers?.[0]?.id ?? null,
                name: '',
                unit: 'gram',
                current_stock: 0,
                min_stock_level: 0
              }
            })
          }
        >
          Thêm nguyên liệu
        </PrimaryButton>
      }
      stats={
        <>
          <StatCard label="Tổng nguyên liệu" value={(db.ingredients || []).length} />
          <StatCard label="Nhà cung cấp" value={(db.suppliers || []).length} />
          <StatCard label="Dưới mức tối thiểu" value={(db.ingredients || []).filter(isLowStock).length} tone="danger" />
          <StatCard label="Chưa dùng trong công thức" value={(db.ingredients || []).filter(i => usedIn(i.id).length === 0).length} />
        </>
      }
    >
      {localToast && (
        <div className="fixed top-5 right-5 z-[150] bg-stone-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg border border-stone-700 animate-fade-in flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-emerald-400">info</span>
          <span>{localToast}</span>
        </div>
      )}

      <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div className="relative max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[18px]">search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm nguyên liệu..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-bold border-b border-stone-200">
              <tr>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Tên nguyên liệu</th>
                <th className="py-2.5 px-3">ĐVT</th>
                <th className="py-2.5 px-3">Nhà cung cấp</th>
                <th className="py-2.5 px-3 text-right">Tồn hiện tại</th>
                <th className="py-2.5 px-3 text-right">Tối thiểu</th>
                <th className="py-2.5 px-3 text-right">Giá nhập / giá đặt</th>
                <th className="py-2.5 px-3 text-center">Dùng trong</th>
                <th className="py-2.5 px-3 text-center">Trạng thái</th>
                <th className="py-2.5 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map(i => {
                const purchasePrice = lastPurchasePrice(db, i.id);
                const value = stockValue(i);
                const price = purchasePrice ?? (value !== null && i.current_stock > 0 ? value / i.current_stock : null);
                const orderedPrice = lastOrderedPrice(db, i.id);
                const low = isLowStock(i);
                return (
                  <tr key={i.id || i._id} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-primary">#{i.id}</td>
                    <td className="py-2.5 px-3 font-bold text-stone-900">{i.name}</td>
                    <td className="py-2.5 px-3 text-stone-600">{i.unit}</td>
                    <td className="py-2.5 px-3">{supplierName(i.supplier_id)}</td>
                    <td className={`py-2.5 px-3 text-right font-mono font-bold ${low ? 'text-rose-600' : 'text-stone-900'}`}>
                      {fmtNumber(i.current_stock)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-stone-500">{fmtNumber(i.min_stock_level)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {price !== null ? <>{fmtMoney(price)}/{i.unit}<span className="block font-sans text-[10px] text-stone-500">{purchasePrice !== null ? 'Giá đã nhập kho' : 'Giá vốn bình quân tồn kho'}</span></>
                        : orderedPrice !== null ? <>{fmtMoney(orderedPrice)}/{i.unit}<span className="block font-sans text-[10px] text-amber-700">Giá đặt hàng · chưa nhập kho</span></>
                          : <span className="font-sans text-stone-500">Chưa có giá nhập hoặc giá đặt</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">{usedIn(i.id).length} món</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge className={low ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}>
                        {low ? 'Cần nhập thêm' : 'Đủ hàng'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {unpricedQuantity(i) > 0 && <button type="button" className="mr-2 text-primary underline" onClick={() => setValuation({ id: String(i.id), name: i.name, unit: i.unit, quantity: unpricedQuantity(i), total: '' })}>Nhập giá tồn cũ</button>}
                      <button
                        onClick={() => {
                          setPriceMessage('');
                          setEditing({
                            id: i.id,
                            form: {
                              supplier_id: i.supplier_id,
                              name: i.name,
                              unit: i.unit,
                              current_stock: i.current_stock,
                              min_stock_level: i.min_stock_level
                            }
                          });
                        }}
                        className="p-1 hover:text-primary rounded text-stone-500 cursor-pointer"
                        title="Sửa"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(i)} className="p-1 hover:text-rose-600 rounded text-stone-400 cursor-pointer" title="Xóa">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal title={editing.id ? `Sửa nguyên liệu: ${editing.form.name}` : 'Thêm nguyên liệu'} onClose={() => setEditing(null)}>
          <form onSubmit={handleSave} className="space-y-3">
            <Field label="Tên nguyên liệu *">
              <input required maxLength={150} value={editing.form.name} onChange={e => setForm({ name: e.target.value })} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Đơn vị tính *">
                <input required disabled={Boolean(editing.id) && editing.form.current_stock > 0} list="unit-options" maxLength={20} value={editing.form.unit} onChange={e => setForm({ unit: e.target.value })} className={inputCls} />
                <datalist id="unit-options">
                  {UNITS.map(u => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </Field>
              <Field label="Nhà cung cấp">
                <select
                  value={editing.form.supplier_id ?? ''}
                  onChange={e => {
                    const val = e.target.value;
                    setForm({ supplier_id: val ? (isNaN(Number(val)) ? val : Number(val)) : null });
                  }}
                  className={inputCls}
                >
                  <option value="">-- Chưa gán --</option>
                  {(db.suppliers || []).map(s => (
                    <option key={s.id || s._id} value={s.id || s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tồn hiện tại">
                <input
                  type="number"
                  min={0}
                  step="0.001"
                  value={editing.form.current_stock}
                  disabled={Boolean(editing.id)}
                  onChange={e => setForm({ current_stock: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="Mức tối thiểu">
                <input
                  type="number"
                  min={0}
                  step="0.001"
                  value={editing.form.min_stock_level}
                  onChange={e => setForm({ min_stock_level: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
            </div>
            {editing.id && (
              <p className="text-[11px] text-stone-500">
                Điều chỉnh tồn kho tại màn hình "Tồn kho & Xuất nhập" để ghi lại lịch sử.
              </p>
            )}
            {editing.id && <section className="space-y-3 rounded-xl border border-stone-200 bg-[#faf9f6] p-4">
              <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-stone-800">Giá vốn nguyên liệu</h3><Badge className={editingUnpriced > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}>{editingUnpriced > 0 ? 'Cần bổ sung giá' : 'Đã có giá tồn'}</Badge></div>
              {editingUnpriced > 0 ? <>
                <p className="text-xs leading-relaxed text-stone-600">Lượng tồn chưa có giá: <b>{fmtNumber(editingUnpriced)} {editingIngredient?.unit}</b>. Nhập tổng tiền mua của đúng lượng này để tính giá vốn.</p>
                <Field label={`Tổng tiền của ${fmtNumber(editingUnpriced)} ${editingIngredient?.unit} (đ)`}><input id="ingredient-stock-total" aria-label="Tổng giá trị tồn chưa có giá" aria-describedby="ingredient-price-message" type="number" min="0" step="1" disabled={saving} placeholder="Ví dụ: 810000" className={inputCls} value={editing.form.unpricedTotalCost ?? ''} onChange={e => { setForm({ unpricedTotalCost: e.target.value === '' ? '' : Number(e.target.value) }); setPriceMessage(''); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void saveEditingPrice(); } }} /></Field>
                {editing.form.unpricedTotalCost !== undefined && editing.form.unpricedTotalCost !== '' && Number.isFinite(editing.form.unpricedTotalCost) && editing.form.unpricedTotalCost >= 0 && <p className="text-xs tabular-nums text-stone-700">Đơn giá tự tính: <b>{fmtMoney(editing.form.unpricedTotalCost / editingUnpriced)}/{editingIngredient?.unit}</b></p>}
                <button type="button" disabled={saving} onClick={() => void saveEditingPrice()} className="cursor-pointer rounded-lg bg-[#800020] px-3 py-2 text-xs font-semibold text-white hover:bg-[#68001a] disabled:cursor-wait disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu giá vốn'}</button>
                <p className="text-[10px] leading-relaxed text-stone-500">Giá vốn lưu riêng tại đây; tên, nhà cung cấp và mức tối thiểu lưu bằng “Lưu thay đổi”.</p>
              </> : <div className="grid grid-cols-2 gap-3 text-xs"><div><p className="text-stone-500">Tổng giá trị tồn</p><p className="mt-1 font-bold tabular-nums text-stone-900">{fmtMoney(stockValue(editingIngredient))}</p></div><div><p className="text-stone-500">Giá vốn bình quân / {editingIngredient?.unit}</p><p className="mt-1 font-bold tabular-nums text-[#800020]">{editingIngredient && editingIngredient.current_stock > 0 ? fmtMoney((stockValue(editingIngredient) ?? 0) / editingIngredient.current_stock) : '—'}</p></div></div>}
              <p className="text-[10px] leading-relaxed text-stone-500">Hàng mua mới: nhập số lượng và tổng tiền tại <a href="/admin/purchases" className="font-medium text-[#800020] underline">Phiếu nhập hàng</a>. Chi phí sử dụng tính theo từng lô nhập.</p>
              <p id="ingredient-price-message" role="status" className="text-xs text-stone-700">{priceMessage}</p>
            </section>}
            {!editing.id && editing.form.current_stock > 0 && <Field label="Tổng tiền của lượng tồn đầu (đ)"><input type="number" min="0" step="1" className={inputCls} value={editing.form.openingTotalCost ?? ''} onChange={e => setForm({ openingTotalCost: e.target.value === '' ? '' : Number(e.target.value) })} /><p className="text-xs text-stone-500">Hệ thống tự chia tổng tiền cho số lượng để tính giá vốn.</p></Field>}
            <FormActions loading={saving} onCancel={() => setEditing(null)} submitLabel={editing.id ? 'Lưu thay đổi' : 'Thêm nguyên liệu'} />
          </form>
        </Modal>
      )}
      {valuation && <Modal title={`Giá tồn cũ: ${valuation.name}`} onClose={() => setValuation(null)}><form onSubmit={saveValuation} className="space-y-4"><p className="text-sm">Lượng chưa có giá: <b>{fmtNumber(valuation.quantity)} {valuation.unit}</b>. Nhập tổng tiền của đúng lượng này.</p><Field label="Tổng giá trị (đ)"><input required type="number" min="0" step="1" className={inputCls} value={valuation.total} onChange={e => setValuation({ ...valuation, total: e.target.value === '' ? '' : Number(e.target.value) })} /></Field><FormActions loading={saving} onCancel={() => setValuation(null)} submitLabel="Lưu giá vốn" /></form></Modal>}
    </AdminLayout>
  );
};

export default AdminIngredientsPage;
