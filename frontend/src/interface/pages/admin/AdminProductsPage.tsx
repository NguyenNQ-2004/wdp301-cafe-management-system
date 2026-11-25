import { NumberInput } from '../../../components/NumberInput';
import React, { useState } from 'react';
import ImageInput from '../../../components/ImageInput';
import { shopApi } from '../../../lib/shopApi';
import { validateProductForm } from '../../../lib/formValidation';
import useAuthStore from '../../../store/authStore';
import { fmtMoney as formatCostMoney } from '../../../data/dbUtils';
import type { PageRoute, Product } from '../../types';
import { useDb } from '../../data/DbContext';
import { fmtMoney, productCost, productCostDetails, productSizes, productToppings } from '../../data/dbUtils';
import { AdminLayout, Badge, Field, FormActions, Modal, PrimaryButton, StatCard, inputCls } from './AdminUi';

interface AdminProductsPageProps {
  onNavigate: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
}

interface ProductForm {
  category_id: number;
  name: string;
  base_price: number | '';
  badge: string;
  subtitle: string;
  description: string;
  image_url: string;
  is_available: boolean;
  sizes: { name: string; delta: number | '' }[];
  toppings: { name: string; price: number | '' }[];
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
  const { db, transact, rawId, refresh } = useDb();
  const token = useAuthStore(state => state.user?.token);
  const [searchFilter, setSearchFilter] = useState('');
  const [catFilter, setCatFilter] = useState<number | 'all'>('all');
  const [editing, setEditing] = useState<{ id: number | null; form: ProductForm } | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const handleDelete = async () => {
    // [SP07] . Nút thùng rác chọn sản phẩm và mở xác nhận; Hủy chỉ đóng cửa sổ, xác nhận mới gọi hàm này.
    // [SP07] ... Đổi ID giao diện sang MongoDB ID bằng rawId(), gửi DELETE /api/products/:id. [SP08]
    if (!deletingProduct || !token || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await shopApi(`/api/products/${rawId(deletingProduct.id)}`, { method: 'DELETE', token });
      // [SP09] .. Xóa thành công thì đóng xác nhận và tải lại bảng; lỗi được hiện trong cửa sổ để người dùng xử lý.
      setDeletingProduct(null);
      await refresh();
      onShowToast?.('Đã xóa sản phẩm.');
    } catch (error) { setDeleteError((error as Error).message); }
    finally { setDeleting(false); }
  };

  const categoryName = (id: number) => db.categories.find(c => c.id === id)?.name ?? '—';

  const filtered = db.products.filter(p => {
    // [SP01] . Ô tìm kiếm và bộ lọc danh mục lọc dữ liệu đã tải, chưa gọi thao tác ghi database.
    const q = searchFilter.trim().toLowerCase();
    return (catFilter === 'all' || p.category_id === catFilter) && (q === '' || p.name.toLowerCase().includes(q) || String(p.id) === q);
  });

  const toggleAvailable = (p: Product) => {
    // [SP06] . Bấm trạng thái để đảo is_available, dùng chung hàng đợi cập nhật sản phẩm.
    // [SP06] ... Đóng gói lệnh sửa và gửi API qua LiveProvider. [SP03]
    transact(tx => tx.update('products', p.id, { is_available: !p.is_available }));
    onShowToast?.(`${p.name}: ${!p.is_available ? 'đang bán' : 'tạm ngưng bán'}.`);
  };

  const handleSave = async (e: React.FormEvent) => {
    // [SP02] . Nút lưu lấy form đang mở, chuẩn hóa tên và kiểm tra trùng, kiểm tra giá không âm.
    // [SP02] . Size được gom thành tên và phụ thu; topping gồm tên và giá, lưu trong variants_config.
    // [SP02] ... Có editing.id thì cập nhật, chưa có thì tạo mới qua transact(). [SP03]
    e.preventDefault();
    if (!editing || !token || saving) return;
    const f = editing.form;
    const name = f.name.normalize('NFC').trim().replace(/\s+/gu, ' ');
    const nameKey = name.toLocaleLowerCase('vi');
    const validation = validateProductForm(f);
    if (db.products.some(product => product.id !== editing.id && product.name.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('vi') === nameKey)) validation.push('Tên sản phẩm đã tồn tại. Vui lòng chọn tên khác.');
    if (!db.categories.some(category => category.id === f.category_id)) validation.push('Vui lòng chọn danh mục sản phẩm hợp lệ.');
    if (validation.length) { setSaveError(validation.join('\n')); return; }
    const sizes = f.sizes;
    const row: Omit<Product, 'id'> = {
      category_id: f.category_id,
      name,
      base_price: Number(f.base_price),
      badge: f.badge.trim() || null,
      subtitle: f.subtitle.trim() || null,
      description: f.description.trim() || null,
      image_url: f.image_url.trim() || null,
      is_available: f.is_available,
      variants_config: {
        sizes: Object.fromEntries(sizes.map(s => [s.name.trim(), Number(s.delta)])),
        toppings: f.toppings.map(t => ({ name: t.name.trim(), price: Number(t.price) }))
      }
    };
    setSaving(true); setSaveError('');
    try {
      await shopApi(editing.id ? `/api/products/${rawId(editing.id)}` : '/api/products', {
        method: editing.id ? 'PUT' : 'POST', token,
        body: { name: row.name, category: rawId(row.category_id), basePrice: row.base_price, badge: row.badge, subtitle: row.subtitle, description: row.description, imageUrl: row.image_url, isAvailable: row.is_available, variantsConfig: row.variants_config }
      });
      await refresh();
      setEditing(null);
      onShowToast?.(editing.id ? `Đã cập nhật "${row.name}".` : `Đã thêm món "${row.name}". Hãy khai báo công thức cho món.`);
    } catch (error) { setSaveError((error as Error).message); }
    finally { setSaving(false); }
  };

  const setForm = (patch: Partial<ProductForm>) => { setSaveError(''); setEditing(prev => (prev ? { ...prev, form: { ...prev.form, ...patch } } : prev)); };
  // [SP01] . setForm() chỉ cập nhật bản nháp; Thêm món mới tạo form rỗng, Sửa dùng toForm() điền dữ liệu món đã chọn.

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
        <PrimaryButton icon="add" onClick={() => { setSaveError(''); setEditing({ id: null, form: toForm(null, db.categories[0]?.id ?? 1) }); }}>
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
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map(p => {
                const { cost, estimated } = productCostDetails(db, p.id);
                return (
                  <tr key={p.id} className="hover:bg-stone-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img src={p.image_url ?? ''} alt={p.name} className="w-11 h-11 rounded-lg object-cover bg-stone-100 shrink-0" />
                        <div>
                          <strong className="text-stone-900 block">{p.name}</strong>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-primary font-bold text-[10px] bg-primary/10 px-1 rounded">#{p.id}</span>
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
                    <td className="py-3 px-4 text-right font-mono text-stone-500">{cost === null ? '—' : <>{formatCostMoney(cost)}{estimated && <span className="block text-[10px] font-sans text-amber-700">Dự kiến · chưa nhập kho</span>}</>}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">{fmtMoney(p.base_price)}</td>
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
                      <button type="button" onClick={() => { setDeletingProduct(p); setDeleteError(''); }} className="p-1 text-stone-400 hover:text-red-700 rounded" title="Xóa sản phẩm" aria-label={`Xóa ${p.name}`}>
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

      {deletingProduct && (
        <Modal title="Xóa sản phẩm" onClose={() => { if (!deleting) setDeletingProduct(null); }}>
          <p className="text-sm text-stone-700">Bạn có chắc muốn xóa sản phẩm <strong>{deletingProduct.name}</strong>?</p>
          <p className="mt-2 text-xs text-stone-500">Sản phẩm đã có trong đơn hàng chỉ có thể tạm ngưng bán.</p>
          {deleteError && <p role="alert" className="mt-3 text-sm text-red-700">{deleteError}</p>}
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" disabled={deleting} onClick={() => setDeletingProduct(null)} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Hủy</button>
            <button type="button" disabled={deleting} onClick={() => void handleDelete()} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{deleting ? 'Đang xóa...' : 'Xóa sản phẩm'}</button>
          </div>
        </Modal>
      )}
      {editing && (
        <Modal title={editing.id ? `Sửa sản phẩm #${editing.id}` : 'Thêm sản phẩm'} onClose={() => setEditing(null)} wide>
          {/* [SP01] . Hủy hoặc X đóng form, chưa ghi dữ liệu; Thêm sản phẩm/Lưu thay đổi gọi handleSave(). */}
          {/* [SP01] ... Gửi bản nháp để kiểm tra trước khi lưu. [SP02] */}
          <form noValidate onSubmit={handleSave} className="space-y-3">
            {saveError && <p role="alert" className="whitespace-pre-line rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{saveError}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* [SP01] . Tên món cập nhật name, bắt buộc và tối đa 150 ký tự; tên trùng bị chặn khi lưu. */}
              <Field label="Tên món *" column="name">
                <input required maxLength={150} value={editing.form.name} onChange={e => setForm({ name: e.target.value })} className={inputCls} />
              </Field>
              {/* [SP01] . Chọn danh mục cập nhật category_id bằng ID giao diện; ID MongoDB được đổi trước khi gửi API. */}
              <Field label="Danh mục *" column="category_id">
                <select value={editing.form.category_id} onChange={e => setForm({ category_id: Number(e.target.value) })} className={inputCls}>
                  {db.categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              {/* [SP01] . Giá cơ bản cập nhật base_price dạng số; đây là giá chưa cộng size và topping. */}
              <Field label="Giá cơ bản (VNĐ) *" column="base_price">
                <NumberInput type="number" min={0} required value={editing.form.base_price} onChange={e => setForm({ base_price: e.target.value === '' ? '' : Number(e.target.value) })} className={inputCls} />
              </Field>
              {/* [SP01] . ImageInput nhận URL hoặc đọc tệp thành data URL và trả về image_url trên form. */}
              <Field label="Ảnh sản phẩm" column="image_url">
                <ImageInput value={editing.form.image_url} onChange={image_url => setForm({ image_url })} className={inputCls} />
              </Field>
            </div>
            {/* [SP01] . Mô tả cập nhật description, rỗng thì gửi null. */}
            <Field label="Mô tả" column="description">
              <textarea rows={2} value={editing.form.description} onChange={e => setForm({ description: e.target.value })} className={inputCls} />
            </Field>

            {/* variants_config.sizes */}
            {/* [SP01] . Tên size cập nhật sizes[i].name, phụ thu cập nhật delta; Thêm size thêm dòng, thùng rác bỏ dòng khỏi bản nháp. */}
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
                  <NumberInput
                    type="number"
                    min={0}
                    value={s.delta}
                    onChange={e => setForm({ sizes: editing.form.sizes.map((x, idx) => (idx === i ? { ...x, delta: e.target.value === '' ? '' : Number(e.target.value) } : x)) })}
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
            {/* [SP01] . Tên topping cập nhật toppings[i].name, giá cập nhật price; thêm/xóa chỉ đổi bản nháp, chưa ghi database. */}
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
                  <NumberInput
                    type="number"
                    min={0}
                    value={t.price}
                    onChange={e => setForm({ toppings: editing.form.toppings.map((x, idx) => (idx === i ? { ...x, price: e.target.value === '' ? '' : Number(e.target.value) } : x)) })}
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

            {/* [SP01] . Ô Đang bán cập nhật is_available, được gửi cùng các trường sản phẩm khi lưu. */}
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-700">
              <input type="checkbox" checked={editing.form.is_available} onChange={e => setForm({ is_available: e.target.checked })} className="accent-primary w-4 h-4" />
              Đang bán <span className="font-mono text-[10px] text-stone-400">is_available</span>
            </label>

            <FormActions loading={saving} onCancel={() => setEditing(null)} submitLabel={saving ? 'Đang lưu...' : editing.id ? 'Lưu thay đổi' : 'Thêm sản phẩm'} />
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
};
