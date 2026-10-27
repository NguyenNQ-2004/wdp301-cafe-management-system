import React, { useState } from 'react';
import type { PageRoute, Product } from '../../types';
import { useDb } from '../../data/DbContext';
import { fmtMoney, productCost, productSizes, productToppings } from '../../data/dbUtils';
import { AdminLayout, Badge, Field, FormActions, Modal, PrimaryButton, StatCard, inputCls } from './AdminUi';

interface AdminProductsPageProps {
  onNavigate: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
}

interface ProductForm {
  category_id: number;
  name: string;
  base_price: number;
  badge: string;
  subtitle: string;
  description: string;
  image_url: string;
  is_available: boolean;
  sizes: { name: string; delta: number }[];
  toppings: { name: string; price: number }[];
}

const toForm = (p: Product | null, defaultCategory: number): ProductForm => ({
  category_id: p?.category_id ?? defaultCategory,
  name: p?.name ?? '',
  base_price: p?.base_price ?? 0,
  badge: p?.badge ?? '',
  subtitle: p?.subtitle ?? '',
  description: p?.description ?? '',
  image_url: p?.image_url ?? '',
  is_available: p?.is_available ?? true,
  sizes: p ? productSizes(p).map(([name, delta]) => ({ name, delta })) : [{ name: 'M', delta: 0 }],
  toppings: p ? productToppings(p).map(t => ({ ...t })) : []
});

export const AdminProductsPage: React.FC<AdminProductsPageProps> = ({ onNavigate, onShowToast }) => {
  const { db, transact } = useDb();
  const [searchFilter, setSearchFilter] = useState('');
  const [catFilter, setCatFilter] = useState<number | 'all'>('all');
  const [editing, setEditing] = useState<{ id: number | null; form: ProductForm } | null>(null);

  const categoryName = (id: number) => db.categories.find(c => c.id === id)?.name ?? '—';

  const filtered = db.products.filter(p => {
    const q = searchFilter.trim().toLowerCase();
    return (catFilter === 'all' || p.category_id === catFilter) && (q === '' || p.name.toLowerCase().includes(q) || String(p.id) === q);
  });

  const toggleAvailable = (p: Product) => {
    transact(tx => tx.update('products', p.id, { is_available: !p.is_available }));
    onShowToast?.(`${p.name}: ${!p.is_available ? 'đang bán' : 'tạm ngưng bán'}.`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const f = editing.form;
    if (f.base_price < 0) {
      onShowToast?.('Giá bán không được âm (chk_product_price).');
      return;
    }
    const sizes = f.sizes.filter(s => s.name.trim());
    const row: Omit<Product, 'id'> = {
      category_id: f.category_id,
      name: f.name.trim(),
      base_price: f.base_price,
      badge: f.badge.trim() || null,
      subtitle: f.subtitle.trim() || null,
      description: f.description.trim() || null,
      image_url: f.image_url.trim() || null,
      is_available: f.is_available,
      variants_config: {
        sizes: Object.fromEntries(sizes.map(s => [s.name.trim(), Number(s.delta) || 0])),
        toppings: f.toppings.filter(t => t.name.trim()).map(t => ({ name: t.name.trim(), price: Number(t.price) || 0 }))
      }
    };
    if (editing.id) {
      transact(tx => tx.update('products', editing.id!, row));
      onShowToast?.(`Đã cập nhật "${row.name}".`);
    } else {
      transact(tx => tx.insert('products', row));
      onShowToast?.(`Đã thêm món "${row.name}". Hãy khai báo công thức (BOM) cho món.`);
    }
    setEditing(null);
  };

  const setForm = (patch: Partial<ProductForm>) => setEditing(prev => (prev ? { ...prev, form: { ...prev.form, ...patch } } : prev));

  const withCost = db.products.map(p => ({ p, cost: productCost(db, p.id) }));

  return (
    <AdminLayout
      route="admin-products"
      onNavigate={onNavigate}
      onShowToast={onShowToast}
      table="products"
      title="Quản lý sản phẩm & giá bán"
      subtitle="Giá vốn được tính từ công thức (product_ingredients) × giá nhập gần nhất (purchase_order_items)."
      actions={
        <PrimaryButton icon="add" onClick={() => setEditing({ id: null, form: toForm(null, db.categories[0]?.id ?? 1) })}>
          Thêm món mới
        </PrimaryButton>
      }
      stats={
        <>
          <StatCard label="Tổng số món" value={db.products.length} />
          <StatCard label="Đang bán" value={db.products.filter(p => p.is_available).length} tone="success" />
          <StatCard label="Tạm ngưng" value={db.products.filter(p => !p.is_available).length} tone="danger" />
          <StatCard label="Chưa có công thức" value={withCost.filter(x => !db.product_ingredients.some(b => b.product_id === x.p.id)).length} />
        </>
      }
    >
      <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[18px]">search</span>
          <input
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            placeholder="Tìm theo tên hoặc mã món..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="h-10 px-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-xs"
        >
          <option value="all">Tất cả danh mục ({db.categories.length})</option>
          {db.categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-bold border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Sản phẩm</th>
                <th className="py-3 px-4">Danh mục</th>
                <th className="py-3 px-4">Size / Topping</th>
                <th className="py-3 px-4 text-right">Giá vốn</th>
                <th className="py-3 px-4 text-right">Giá bán</th>
                <th className="py-3 px-4 text-center">Lợi nhuận</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map(p => {
                const cost = productCost(db, p.id);
                const margin = cost !== null && p.base_price > 0 ? Math.round(((p.base_price - cost) / p.base_price) * 100) : null;
                return (
                  <tr key={p.id} className="hover:bg-stone-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img src={p.image_url ?? ''} alt={p.name} className="w-11 h-11 rounded-lg object-cover bg-stone-100 shrink-0" />
                        <div>
                          <strong className="text-stone-900 block">{p.name}</strong>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-primary font-bold text-[10px] bg-primary/10 px-1 rounded">#{p.id}</span>
                            {p.badge && <span className="text-[10px] text-amber-700 font-bold">{p.badge}</span>}
                            {p.subtitle && <span className="text-[10px] text-stone-400">{p.subtitle}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-stone-100 text-stone-700">{categoryName(p.category_id)}</Badge>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-stone-600">
                      {productSizes(p).map(([n, d]) => `${n}${d ? ` (+${d / 1000}k)` : ''}`).join(', ')}
                      {productToppings(p).length > 0 && <span className="block text-stone-400">{productToppings(p).length} topping</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-stone-500">{cost === null ? '—' : fmtMoney(cost)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">{fmtMoney(p.base_price)}</td>
                    <td className="py-3 px-4 text-center font-mono">
                      {margin === null ? <span className="text-stone-400">—</span> : <Badge className="bg-emerald-50 text-emerald-800">{margin}%</Badge>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleAvailable(p)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${p.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}
                      >
                        {p.is_available ? 'Đang bán' : 'Tạm ngưng'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => setEditing({ id: p.id, form: toForm(p, p.category_id) })} className="p-1 text-stone-400 hover:text-stone-800 rounded" title="Sửa">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
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
        <Modal title={editing.id ? `Sửa sản phẩm #${editing.id}` : 'Thêm sản phẩm'} onClose={() => setEditing(null)} wide>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Tên món *" column="name">
                <input required maxLength={150} value={editing.form.name} onChange={e => setForm({ name: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Danh mục *" column="category_id">
                <select value={editing.form.category_id} onChange={e => setForm({ category_id: Number(e.target.value) })} className={inputCls}>
                  {db.categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Giá cơ bản (VNĐ) *" column="base_price">
                <input type="number" min={0} required value={editing.form.base_price} onChange={e => setForm({ base_price: Number(e.target.value) })} className={inputCls} />
              </Field>
              <Field label="Nhãn" column="badge">
                <input list="badge-options" maxLength={50} value={editing.form.badge} onChange={e => setForm({ badge: e.target.value })} className={inputCls} />
                <datalist id="badge-options">
                  <option value="BÁN CHẠY" />
                  <option value="MÓN MỚI" />
                </datalist>
              </Field>
              <Field label="Phụ đề" column="subtitle">
                <input maxLength={150} value={editing.form.subtitle} onChange={e => setForm({ subtitle: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Ảnh (URL)" column="image_url">
                <input maxLength={500} value={editing.form.image_url} onChange={e => setForm({ image_url: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <Field label="Mô tả" column="description">
              <textarea rows={2} value={editing.form.description} onChange={e => setForm({ description: e.target.value })} className={inputCls} />
            </Field>

            {/* variants_config.sizes */}
            <div className="p-3 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-stone-600">
                <span>Size & phụ thu</span>
                <span className="font-mono text-[10px] font-normal text-stone-400">variants_config.sizes</span>
              </div>
              {editing.form.sizes.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={s.name}
                    onChange={e => setForm({ sizes: editing.form.sizes.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)) })}
                    placeholder="Tên size (M, L, Chai 250ml...)"
                    className={inputCls}
                  />
                  <input
                    type="number"
                    min={0}
                    value={s.delta}
                    onChange={e => setForm({ sizes: editing.form.sizes.map((x, idx) => (idx === i ? { ...x, delta: Number(e.target.value) } : x)) })}
                    className={`${inputCls} w-32`}
                  />
                  <button type="button" onClick={() => setForm({ sizes: editing.form.sizes.filter((_, idx) => idx !== i) })} className="px-2 text-stone-400 hover:text-rose-600">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setForm({ sizes: [...editing.form.sizes, { name: '', delta: 0 }] })} className="text-primary text-xs font-bold hover:underline">
                + Thêm size
              </button>
            </div>

            {/* variants_config.toppings */}
            <div className="p-3 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-stone-600">
                <span>Topping & giá</span>
                <span className="font-mono text-[10px] font-normal text-stone-400">variants_config.toppings</span>
              </div>
              {editing.form.toppings.map((t, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={t.name}
                    onChange={e => setForm({ toppings: editing.form.toppings.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)) })}
                    placeholder="Tên topping"
                    className={inputCls}
                  />
                  <input
                    type="number"
                    min={0}
                    value={t.price}
                    onChange={e => setForm({ toppings: editing.form.toppings.map((x, idx) => (idx === i ? { ...x, price: Number(e.target.value) } : x)) })}
                    className={`${inputCls} w-32`}
                  />
                  <button type="button" onClick={() => setForm({ toppings: editing.form.toppings.filter((_, idx) => idx !== i) })} className="px-2 text-stone-400 hover:text-rose-600">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setForm({ toppings: [...editing.form.toppings, { name: '', price: 0 }] })} className="text-primary text-xs font-bold hover:underline">
                + Thêm topping
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-stone-700">
              <input type="checkbox" checked={editing.form.is_available} onChange={e => setForm({ is_available: e.target.checked })} className="accent-primary w-4 h-4" />
              Đang bán <span className="font-mono text-[10px] text-stone-400">is_available</span>
            </label>

            <FormActions onCancel={() => setEditing(null)} submitLabel={editing.id ? 'Lưu thay đổi' : 'Thêm sản phẩm'} />
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
};
