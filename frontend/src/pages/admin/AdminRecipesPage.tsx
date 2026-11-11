import { NumberInput } from '../../components/NumberInput';
import React, { useState } from 'react';
import type { PageRoute } from '../../types';
import { useDb } from '../../data/DbContext';
import { shopApi } from '../../lib/shopApi';
import useAuthStore from '../../store/authStore';
import { fmtMoney, fmtNumber, recipeLineCost, productCostDetails } from '../../data/dbUtils';
import { AdminLayout, Badge, FormActions, Modal, StatCard, inputCls } from './AdminUi';

interface AdminRecipesPageProps {
  onNavigate?: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
}

export const AdminRecipesPage: React.FC<AdminRecipesPageProps> = ({ onNavigate, onShowToast }) => {
  const { db, refresh } = useDb();
  const token = useAuthStore(state => state.user?.token);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingProductId, setEditingProductId] = useState<any | null>(null);
  const [lines, setLines] = useState<{ ingredient_id: any; quantity_required: number }[]>([]);
  const [filter, setFilter] = useState<'all' | 'with' | 'without'>('all');
  const [search, setSearch] = useState('');
  const [valuation, setValuation] = useState<{ ingredientId: string; totalCost: number | '' } | null>(null);

  const bomOf = (productId: any) =>
    (db.product_ingredients || []).filter(
      b => b.product_id === productId || String(b.product_id) === String(productId)
    );

  const ingredient = (id: any) =>
    (db.ingredients || []).find(
      i => i.id === id || i._id === id || String(i.id) === String(id)
    );
  const unpricedQuantity = (id: any) => {
    const row = ingredient(id) as any;
    if (!row) return 0;
    const lots = row.stockLots ?? row.stock_lots ?? [];
    const tracked = lots.reduce((sum: number, lot: any) => sum + lot.remainingQuantity, 0);
    return Math.max(0, Number(row.currentStock ?? row.current_stock ?? 0) - tracked)
      + lots.reduce((sum: number, lot: any) => sum + (lot.unitCost == null ? lot.remainingQuantity : 0), 0);
  };
  const saveIngredientCost = async () => {
    if (!valuation || !token || saving) return;
    if (valuation.totalCost === '' || !Number.isSafeInteger(valuation.totalCost) || valuation.totalCost < 0) {
      setMessage('Nhập tổng tiền của lượng tồn chưa có giá bằng số nguyên không âm.'); return;
    }
    setSaving(true); setMessage('');
    try {
      await shopApi(`/api/ingredients/${valuation.ingredientId}/unpriced-stock-cost`, { token, method: 'PUT', body: { totalCost: valuation.totalCost } });
      await refresh(); setValuation(null);
      setMessage('Đã lưu giá nguyên liệu. Giá vốn công thức đã được cập nhật.');
    } catch (error) { setMessage((error as Error).message); }
    finally { setSaving(false); }
  };

  const products = (db.products || []).filter(p => {
    const pId = p.id ?? p._id;
    const has = bomOf(pId).length > 0;
    return p.name.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')) && (filter === 'all' || (filter === 'with' ? has : !has));
  });

  const openEditor = (productId: any) => {
    setMessage('');
    setValuation(null);
    setEditingProductId(productId);
    const existing = bomOf(productId);
    setLines(
      existing.length > 0
        ? existing.map(b => ({
            ingredient_id: b.ingredient_id ?? b.ingredientId,
            quantity_required: b.quantity_required ?? b.quantityRequired ?? 1
          }))
        : [{ ingredient_id: db.ingredients?.[0]?.id ?? db.ingredients?.[0]?._id ?? 1, quantity_required: 1 }]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductId || saving || !token) return;
    const valid = lines;
    if (valid.some(l => !l.ingredient_id || !Number.isFinite(l.quantity_required) || l.quantity_required < 0.001)) {
      setMessage('Vui lòng chọn nguyên liệu và nhập định lượng từ 0.001.'); return;
    }
    const ids = valid.map(l => String(l.ingredient_id));
    if (new Set(ids).size !== ids.length) {
      setMessage('Mỗi nguyên liệu chỉ xuất hiện một lần trong công thức.');
      return;
    }
    setSaving(true); setMessage('');
    try {
      await shopApi(`/api/product-ingredients/product/${editingProductId}`, { token, method: 'PUT', body: { items: valid.map(l => ({ ingredient: l.ingredient_id, quantityRequired: l.quantity_required })) } });
      await refresh();
      setMessage('Đã lưu công thức định mức.');
      onShowToast?.('Đã lưu công thức định mức.');
      setEditingProductId(null);
    } catch (error) { setMessage((error as Error).message); }
    finally { setSaving(false); }
  };

  const editingProduct = (db.products || []).find(
    p => p.id === editingProductId || p._id === editingProductId || String(p.id) === String(editingProductId)
  );
  const draftCosts = lines.map(line => {
    const valid = Boolean(ingredient(line.ingredient_id)) && Number.isFinite(line.quantity_required) && line.quantity_required >= 0.001;
    return valid ? recipeLineCost(db, line.ingredient_id, line.quantity_required) : { cost: null, estimated: false };
  });
  const duplicateIngredients = new Set(lines.map(line => String(line.ingredient_id))).size !== lines.length;
  const draftCost = lines.length && !duplicateIngredients && draftCosts.every(row => row.cost !== null)
    ? draftCosts.reduce((sum, row) => sum + (row.cost ?? 0), 0) : null;
  const draftEstimated = draftCosts.some(row => row.estimated);
  const draftPrice = editingProduct?.base_price ?? editingProduct?.basePrice ?? 0;
  const draftProfit = draftCost === null ? null : draftPrice - draftCost;
  const draftMargin = draftProfit !== null && draftPrice > 0 ? Math.round(draftProfit / draftPrice * 100) : null;

  return (
    <AdminLayout
      route="admin-recipes"
      onNavigate={onNavigate}
      onShowToast={onShowToast}
      title="Công thức & giá vốn"
      subtitle="Quản lý nguyên liệu cho từng món, theo dõi chi phí cho mỗi ly hoặc phần."
      stats={
        <>
          <StatCard label="Tổng sản phẩm" value={(db.products || []).length} />
          <StatCard
            label="Đã có công thức"
            value={(db.products || []).filter(p => bomOf(p.id ?? p._id).length > 0).length}
            tone="success"
          />
          <StatCard
            label="Chưa có công thức"
            value={(db.products || []).filter(p => bomOf(p.id ?? p._id).length === 0).length}
            tone="danger"
          />
          <StatCard label="Dòng định mức" value={(db.product_ingredients || []).length} />
        </>
      }
      actions={
        <select
          aria-label="Lọc tình trạng công thức"
          value={filter}
          onChange={e => setFilter(e.target.value as typeof filter)}
          className="h-9 px-3 rounded-xl border border-stone-200 bg-stone-50 font-medium text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#800020]/20"
        >
          <option value="all">Tất cả sản phẩm</option>
          <option value="with">Đã có công thức</option>
          <option value="without">Chưa có công thức</option>
        </select>
      }
    >
      {message && !editingProduct && <p role="status" className="mb-4 text-sm text-stone-700">{message}</p>}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-base font-bold text-stone-900">Sổ công thức</h2><p className="mt-1 text-xs text-stone-500">{products.length} món · Định lượng cho 1 ly / phần</p></div>
        <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 sm:w-72"><span aria-hidden="true" className="material-symbols-outlined text-[20px] text-stone-400">search</span><input aria-label="Tìm công thức theo tên món" placeholder="Tìm tên món..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400" /></label>
      </div>
      {!products.length && <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center"><span aria-hidden="true" className="material-symbols-outlined text-4xl text-stone-300">menu_book</span><h3 className="mt-3 font-semibold text-stone-800">Chưa có món phù hợp</h3><p className="mt-1 text-sm text-stone-500">Thử tên món khác hoặc thay đổi bộ lọc.</p></div>}
      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
        {products.map(p => {
          const pId = p.id ?? p._id;
          const bom = bomOf(pId);
          const { cost, estimated } = productCostDetails(db, pId);
          const basePrice = p.base_price ?? p.basePrice ?? 0;
          const margin = cost !== null && basePrice > 0 ? Math.round(((basePrice - cost) / basePrice) * 100) : null;
          const catName = (db.categories || []).find(
            c => c.id === p.category_id || c._id === p.category_id || String(c.id) === String(p.category_id)
          )?.name;

          return (
            <article key={pId} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6">
                  <div className="flex min-w-0 flex-1 items-center gap-3.5">
                    <img
                      src={p.image_url || p.imageUrl || '/cafe-placeholder.svg'}
                      alt={p.name}
                      className="h-16 w-16 shrink-0 rounded-2xl border border-stone-100 bg-stone-100 object-cover"
                      onError={e => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/cafe-placeholder.svg';
                      }}
                    />
                    <div className="min-w-0">
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-stone-500">{catName || 'Chưa phân loại'}</p>
                      <h3 className="text-lg font-bold leading-snug tracking-tight text-stone-900">{p.name}</h3>
                      <p className="mt-1 text-xs text-stone-400">Công thức cho 1 ly / phần</p>
                    </div>
                  </div>
                  <Badge className={(p.is_available ?? p.isAvailable ?? true) ? 'shrink-0 bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/10' : 'shrink-0 bg-stone-100 text-stone-500'}>{(p.is_available ?? p.isAvailable ?? true) ? 'Đang bán' : 'Tạm ngưng'}</Badge>
              </div>
              <div className="mx-5 grid grid-cols-1 divide-y divide-stone-200/70 overflow-hidden rounded-xl border border-stone-200/70 bg-[#faf9f6] sm:mx-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="px-4 py-4"><p className="text-xs text-stone-500">Giá bán</p><p className="mt-2 text-xl font-bold tabular-nums tracking-tight text-stone-900">{fmtMoney(basePrice)}</p></div>
                <div className="px-4 py-4"><p className="text-xs text-stone-500">{estimated ? 'Giá vốn dự kiến' : 'Giá vốn nguyên liệu'}</p><p className="mt-2 text-xl font-bold tabular-nums tracking-tight text-[#800020]">{cost === null ? '—' : fmtMoney(cost)}</p></div>
                <div className="px-4 py-4"><p className="text-xs text-stone-500">{estimated ? 'Lợi nhuận gộp dự kiến' : 'Lợi nhuận gộp'}</p><div className="mt-2 flex flex-wrap items-center gap-2"><p className={`text-xl font-bold tabular-nums tracking-tight ${cost !== null && cost > basePrice ? 'text-rose-700' : 'text-emerald-700'}`}>{cost === null ? '—' : fmtMoney(basePrice - cost)}</p>{margin !== null && <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${margin < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{`${margin}%`}</span>}</div></div>
              </div>
              <div className="px-5 py-5 sm:px-6">
                <div className="mb-3 flex items-center justify-between gap-2"><h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">Thành phần <span className="ml-1 font-normal text-stone-400">({bom.length})</span></h4><span className="text-[11px] text-stone-400">Cho 1 ly / phần</span></div>
                <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-stone-100 text-[11px] text-stone-400"><th className="pb-2 font-medium">Nguyên liệu</th><th className="pb-2 pl-3 text-right font-medium">Lượng dùng</th><th className="pb-2 pl-3 text-right font-medium">Chi phí</th></tr></thead><tbody className="divide-y divide-stone-100">
                  {bom.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-stone-400">Thêm nguyên liệu để bắt đầu tính giá vốn.</td></tr>}
                  {bom.map(b => {
                    const ingId = b.ingredient_id ?? b.ingredientId;
                    const ing = ingredient(ingId);
                    const qty = b.quantity_required ?? b.quantityRequired ?? 0;
                    const quote = recipeLineCost(db, ingId, qty);
                    return (
                      <tr key={b.id || b._id || ingId}>
                        <td className="py-3 font-medium text-stone-800">{ing?.name || 'Nguyên liệu'}<span className="mt-0.5 block text-[10px] font-normal text-stone-400">{quote.cost === null ? 'Chưa đủ giá lô' : `${fmtMoney(quote.cost / qty)}/${ing?.unit || 'đơn vị'}`}</span></td>
                        <td className="whitespace-nowrap py-3 pl-3 text-right tabular-nums text-stone-600">{fmtNumber(qty)} <span className="text-stone-400">{ing?.unit || 'đơn vị'}</span></td>
                        <td className="whitespace-nowrap py-3 pl-3 text-right font-semibold tabular-nums text-stone-800">{quote.cost === null ? '—' : fmtMoney(quote.cost)}</td>
                      </tr>
                    );
                  })}
                </tbody></table></div>
                {cost !== null && cost > basePrice && <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-700"><span aria-hidden="true" className="material-symbols-outlined text-[17px]">info</span><p>Giá vốn đang vượt giá bán. Kiểm tra lại lượng nguyên liệu cho 1 ly và đơn giá nhập.</p></div>}
                {cost === null && bom.length > 0 && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">Bổ sung giá nguyên liệu ở màn Nguyên liệu để tính đủ giá vốn.</p>}
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50/50 px-5 py-3 sm:px-6">
                <span className="flex items-center gap-1.5 text-[11px] text-stone-500"><span aria-hidden="true" className="material-symbols-outlined text-[16px]">{cost === null ? 'info' : estimated ? 'schedule' : 'layers'}</span>{cost === null ? 'Chưa đủ dữ liệu giá vốn' : estimated ? 'Giá vốn dự kiến theo định mức' : 'Giá vốn theo lô nhập'}</span>
                <button
                  type="button"
                  onClick={() => openEditor(pId)}
                  className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#800020] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#620018] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800020]"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Sửa định mức
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {editingProduct && (
        <Modal title={`Định mức: ${editingProduct.name}`} onClose={() => setEditingProductId(null)} wide>
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="rounded-xl border border-stone-200 bg-[#faf9f6] px-4 py-3"><p className="font-semibold text-stone-800">Công thức cho 1 ly / phần</p><p className="mt-1 leading-relaxed text-stone-500">Nhập lượng nguyên liệu dùng cho một món, theo đơn vị ghi cạnh tên nguyên liệu.</p></div>
            <div className="hidden grid-cols-12 gap-3 text-[10px] font-bold uppercase text-stone-500 sm:grid">
              <span className="col-span-5">Nguyên liệu</span>
              <span className="col-span-3">Lượng dùng / phần</span>
              <span className="col-span-3 text-right">Chi phí nguyên liệu</span>
            </div>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 items-start gap-3 rounded-xl border border-stone-100 bg-stone-50/50 p-3 sm:border-0 sm:bg-transparent sm:p-0">
                <div className="col-span-11 sm:col-span-5">
                <select
                  aria-label={`Nguyên liệu ${i + 1}`}
                  value={l.ingredient_id}
                  onChange={e => {
                    const val = e.target.value;
                    const matched = (db.ingredients || []).find((ing: any) => String(ing.id) === val || String(ing._id) === val);
                    const parsedId = matched?.id ?? (isNaN(Number(val)) ? val : Number(val));
                    setLines(lines.map((x, idx) => (idx === i ? { ...x, ingredient_id: parsedId } : x)));
                  }}
                  disabled={saving}
                  className={inputCls}
                >
                  {(db.ingredients || []).map(ing => (
                    <option key={ing.id || ing._id} value={ing.id || ing._id}>
                      {ing.name} ({ing.unit})
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[10px] text-stone-400">{draftCosts[i].cost === null ? unpricedQuantity(l.ingredient_id) > 0 ? `Chưa có giá cho ${fmtNumber(unpricedQuantity(l.ingredient_id))} ${ingredient(l.ingredient_id)?.unit} tồn kho` : 'Chưa có giá nhập nguyên liệu' : draftCosts[i].estimated ? 'Đơn giá dự kiến' : 'Đơn giá theo lô nhập'}</p>
                {unpricedQuantity(l.ingredient_id) > 0 && <button type="button" disabled={saving} onClick={() => { setValuation({ ingredientId: String(l.ingredient_id), totalCost: '' }); setMessage(''); }} className="mt-1 text-[11px] font-semibold text-[#800020] underline underline-offset-2">Bổ sung giá tồn tại đây</button>}
                {draftCosts[i].cost === null && unpricedQuantity(l.ingredient_id) <= 0 && <a href="/admin/purchases" target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] font-semibold text-[#800020] underline underline-offset-2">Nhập hàng và giá mua ↗</a>}
                </div>
                <div className="col-span-6 row-start-2 sm:col-span-3 sm:row-start-auto">
                <div className="relative">
                <NumberInput
                  aria-label={`Lượng dùng ${i + 1}`}
                  required
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={l.quantity_required}
                  onChange={e => setLines(lines.map((x, idx) => (idx === i ? { ...x, quantity_required: Number(e.target.value) } : x)))}
                  disabled={saving}
                  className={`${inputCls} pr-14`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] text-stone-400">{ingredient(l.ingredient_id)?.unit}</span>
                </div>
                </div>
                <div className="col-span-5 row-start-2 text-right sm:col-span-3 sm:row-start-auto">
                  <p className="pt-2 font-semibold tabular-nums text-stone-900">{draftCosts[i].cost === null ? '—' : fmtMoney(draftCosts[i].cost)}</p>
                  {draftCosts[i].cost !== null && <p className="mt-1 text-[10px] leading-relaxed tabular-nums text-stone-400">{fmtNumber(l.quantity_required)} × {fmtMoney(draftCosts[i].cost! / l.quantity_required)}/{ingredient(l.ingredient_id)?.unit}</p>}
                </div>
                <button
                  aria-label={`Xóa nguyên liệu ${i + 1}`}
                  type="button"
                  disabled={saving}
                  onClick={() => setLines(lines.filter((_, idx) => idx !== i))}
                  className="col-span-1 col-start-12 row-start-1 flex justify-center pt-2 text-stone-400 transition-colors hover:text-rose-600 disabled:opacity-40 sm:col-start-auto sm:row-start-auto"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
                {valuation?.ingredientId === String(l.ingredient_id) && <div className="col-span-12 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <p className="font-semibold text-stone-800">Bổ sung giá tồn: {ingredient(l.ingredient_id)?.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-stone-600">Lượng tồn chưa có giá: <b>{fmtNumber(unpricedQuantity(l.ingredient_id))} {ingredient(l.ingredient_id)?.unit}</b>. Nhập tổng tiền mua của đúng lượng này, hệ thống tự chia ra đơn giá.</p>
                  <label className="mt-3 block text-[11px] font-medium text-stone-700" htmlFor={`stock-cost-${i}`}>Tổng tiền của lượng tồn trên (đ)</label>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row"><NumberInput id={`stock-cost-${i}`} aria-label={`Tổng giá trị tồn ${ingredient(l.ingredient_id)?.name}`} type="number" min="0" step="1" disabled={saving} value={valuation.totalCost} onChange={e => setValuation({ ...valuation, totalCost: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Nhập tổng tiền mua" className={inputCls} /><button type="button" disabled={saving || valuation.totalCost === ''} onClick={() => void saveIngredientCost()} className="shrink-0 rounded-xl bg-[#800020] px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu giá & tính cost'}</button><button type="button" disabled={saving} onClick={() => setValuation(null)} className="shrink-0 px-2 py-2 text-stone-500">Đóng</button></div>
                  {valuation.totalCost !== '' && Number.isFinite(valuation.totalCost) && valuation.totalCost >= 0 && unpricedQuantity(l.ingredient_id) > 0 && <p className="mt-2 text-[11px] tabular-nums text-stone-600">Đơn giá tự tính: {fmtMoney(valuation.totalCost)} ÷ {fmtNumber(unpricedQuantity(l.ingredient_id))} = {fmtMoney(valuation.totalCost / unpricedQuantity(l.ingredient_id))}/{ingredient(l.ingredient_id)?.unit}</p>}
                  <p className="mt-2 text-[10px] text-stone-500">Lưu giá sẽ cập nhật giá trị nguyên liệu trong kho, giữ nguyên số lượng tồn. Công thức được lưu riêng bằng nút bên dưới.</p>
                </div>}
              </div>
            ))}
            <button
              type="button"
              disabled={saving || !db.ingredients?.length}
              onClick={() => {
                const firstIng = db.ingredients?.[0];
                const firstId = firstIng?.id ?? firstIng?._id ?? 1;
                setLines([...lines, { ingredient_id: firstId, quantity_required: 1 }]);
              }}
              className="text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Thêm nguyên liệu
            </button>
            <div aria-live="polite" aria-atomic="true" className="rounded-xl border border-stone-200 bg-[#faf9f6] p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold text-stone-800">Ước tính cho 1 ly / phần</h4><span className="text-[10px] text-stone-400">Cập nhật theo lượng vừa nhập</span></div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><p className="text-[11px] text-stone-500">Giá bán</p><p className="mt-1 text-lg font-bold tabular-nums text-stone-900">{fmtMoney(draftPrice)}</p></div>
                <div><p className="text-[11px] text-stone-500">Tổng giá vốn{draftEstimated ? ' dự kiến' : ''}</p><p className="mt-1 text-lg font-bold tabular-nums text-[#800020]">{draftCost === null ? 'Chưa tính đủ' : fmtMoney(draftCost)}</p></div>
                <div><p className="text-[11px] text-stone-500">Lợi nhuận gộp dự kiến</p><p className={`mt-1 text-lg font-bold tabular-nums ${draftProfit !== null && draftProfit < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{draftProfit === null ? '—' : fmtMoney(draftProfit)}{draftMargin !== null && <span className="ml-2 text-xs font-medium">{`(${draftMargin}%)`}</span>}</p></div>
              </div>
              {duplicateIngredients ? <p className="mt-3 text-xs text-amber-800">Nguyên liệu bị trùng. Gộp lượng dùng vào một dòng để tính đúng giá vốn.</p>
                : draftCost === null ? <p className="mt-3 text-xs text-stone-500">Chọn nguyên liệu, nhập lượng dùng hợp lệ và bổ sung giá nguyên liệu để tính đủ chi phí.</p>
                : draftProfit !== null && draftProfit < 0 ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">Giá vốn vượt giá bán {fmtMoney(-draftProfit)}. Kiểm tra lượng dùng cho 1 ly và đơn giá nhập.</p> : null}
              <p className="mt-3 border-t border-stone-200/70 pt-3 text-[10px] leading-relaxed text-stone-400">Chi phí nguyên liệu theo lô còn lại{draftEstimated ? ', có sử dụng đơn giá dự kiến' : ''}. Chưa gồm nhân công và chi phí vận hành.</p>
            </div>
            {message && <p role="status" className="text-sm text-stone-700">{message}</p>}
            <FormActions loading={saving} onCancel={() => setEditingProductId(null)} submitLabel="Lưu công thức" />
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
};

export default AdminRecipesPage;
