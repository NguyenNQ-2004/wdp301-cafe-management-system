import React, { useState } from 'react';
import type { PageRoute, Category, ActiveStatus } from '../../types';
import { useDb } from '../../data/DbContext';
import { AdminLayout, Badge, Field, PrimaryButton, StatCard, inputCls } from './AdminUi';

interface AdminCategoriesPageProps {
  onNavigate?: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
}

type CategoryForm = Omit<Category, 'id'>;
const EMPTY: CategoryForm = { name: '', icon: 'local_cafe', description: '', image_url: '', status: 'ACTIVE' };
const ICONS = [
  'coffee_maker',
  'local_cafe',
  'emoji_food_beverage',
  'icecream',
  'bakery_dining',
  'liquor',
  'local_bar',
  'lunch_dining',
  'restaurant',
  'cake'
];

export const AdminCategoriesPage: React.FC<AdminCategoriesPageProps> = ({ onNavigate = () => {}, onShowToast }) => {
  const { db, transact } = useDb();
  const [selectedId, setSelectedId] = useState<any>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const showToast = (msg: string) => {
    if (onShowToast) onShowToast(msg);
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const productCount = (id: any) =>
    db.products.filter(
      p =>
        String(p.category_id) === String(id) ||
        String(p.category?._id) === String(id) ||
        String(p.category) === String(id)
    ).length;

  const select = (c: Category | null) => {
    setSelectedId(c?.id ?? null);
    setForm(
      c
        ? {
            name: c.name,
            icon: c.icon || 'local_cafe',
            description: c.description || '',
            image_url: c.image_url || c.imageUrl || '',
            status: c.status
          }
        : EMPTY
    );
  };

  const handleOpenCreate = () => {
    select(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: Category) => {
    select(c);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (
      db.categories.some(
        c =>
          c.name.toLowerCase() === name.toLowerCase() &&
          String(c.id) !== String(selectedId) &&
          String(c._id) !== String(selectedId)
      )
    ) {
      showToast('Tên danh mục đã tồn tại (categories.name là UNIQUE).');
      return;
    }
    const row: CategoryForm = {
      name,
      icon: form.icon || null,
      description: form.description?.trim() || null,
      image_url: form.image_url?.trim() || null,
      status: form.status
    };
    if (selectedId) {
      transact(tx => tx.update('categories', selectedId, row));
      showToast(`Đã cập nhật danh mục "${name}".`);
    } else {
      const created = transact(tx => tx.insert('categories', row));
      setSelectedId(created.id);
      showToast(`Đã tạo danh mục "${name}".`);
    }
    setIsFormOpen(false);
  };

  const handleDelete = (c: Category) => {
    if (productCount(c.id) > 0) {
      showToast('Không thể xóa: danh mục đang có sản phẩm (ràng buộc fk_product_category).');
      return;
    }
    if (!confirm(`Xóa danh mục "${c.name}"?`)) return;
    transact(tx => tx.remove('categories', c.id));
    if (selectedId === c.id) select(null);
    showToast('Đã xóa danh mục.');
  };

  const toggleStatus = (c: Category) => {
    const status: ActiveStatus = c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    transact(tx => tx.update('categories', c.id, { status }));
    if (String(c.id) === String(selectedId) || String(c._id) === String(selectedId)) {
      setForm(f => ({ ...f, status }));
    }
    showToast(`Đã chuyển trạng thái sang "${status}".`);
  };

  // Filter categories by search and status
  const filteredCategories = db.categories.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(c.id).toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AdminLayout
      route="admin-categories"
      onNavigate={onNavigate}
      onShowToast={onShowToast}
      table="categories"
      title="Quản lý danh mục thực đơn"
      subtitle="Danh mục hiển thị trên menu khách hàng, POS và KDS."
      actions={
        <PrimaryButton icon="add" onClick={handleOpenCreate}>
          Thêm danh mục
        </PrimaryButton>
      }
      stats={
        <>
          <StatCard label="TỔNG DANH MỤC" value={db.categories.length} />
          <StatCard
            label="ĐANG HOẠT ĐỘNG"
            value={db.categories.filter(c => c.status === 'ACTIVE').length}
            tone="success"
          />
          <StatCard
            label="TẠM ẨN"
            value={db.categories.filter(c => c.status === 'INACTIVE').length}
            tone={db.categories.filter(c => c.status === 'INACTIVE').length > 0 ? 'danger' : 'default'}
          />
          <StatCard label="TỔNG SẢN PHẨM" value={db.products.length} />
        </>
      }
    >
      {/* Toast Notification Alert */}
      {toast && (
        <div className="fixed top-6 right-8 z-50 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-xl border border-stone-700 flex items-center gap-3 animate-bounce">
          <span className="material-symbols-outlined text-amber-400 text-xl">info</span>
          <span className="text-xs font-medium">{toast}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-stone-400 hover:text-white cursor-pointer">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Search & Filter Bar (Matching Screenshot) */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-stone-200/80 shadow-2xs">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc mã danh mục..."
            className="w-full pl-10 pr-8 py-2 text-xs rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
            </button>
          )}
        </div>
        <div className="w-full sm:w-auto shrink-0">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-52 px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] cursor-pointer"
          >
            <option value="ALL">Tất cả danh mục ({db.categories.length})</option>
            <option value="ACTIVE">Đang hoạt động ({db.categories.filter(c => c.status === 'ACTIVE').length})</option>
            <option value="INACTIVE">Tạm ẩn ({db.categories.filter(c => c.status === 'INACTIVE').length})</option>
          </select>
        </div>
      </div>

      {/* Full-width Table View (Matching Screenshot) */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-bold border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">MÃ DANH MỤC</th>
                <th className="py-3 px-4">ẢNH / ICON</th>
                <th className="py-3 px-4">TÊN DANH MỤC</th>
                <th className="py-3 px-4">MÔ TẢ</th>
                <th className="py-3 px-4 text-right">SỐ MÓN</th>
                <th className="py-3 px-4">TRẠNG THÁI</th>
                <th className="py-3 px-4 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400 text-xs">
                    <span className="material-symbols-outlined text-3xl mb-1 block">search_off</span>
                    Không tìm thấy danh mục phù hợp
                  </td>
                </tr>
              ) : (
                filteredCategories.map(c => {
                  const displayId =
                    typeof c.id === 'string' && c.id.length > 8 ? c.id.slice(-6) : c.id;
                  const imgUrl = c.image_url || c.imageUrl;

                  return (
                    <tr
                      key={String(c.id)}
                      className="hover:bg-stone-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-stone-500" title={String(c.id)}>
                        #{displayId}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {imgUrl && (
                            <img
                              src={imgUrl}
                              alt={c.name}
                              className="w-10 h-10 rounded-lg object-cover border border-stone-100 shrink-0"
                            />
                          )}
                          <span className="w-8 h-8 rounded-lg bg-stone-100 text-[#800020] flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[18px]">
                              {c.icon ?? 'category'}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-stone-900">{c.name}</td>
                      <td className="py-3.5 px-4 text-stone-600 max-w-md truncate">{c.description || '—'}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-800">
                        {productCount(c.id)}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          className={
                            c.status === 'ACTIVE'
                              ? 'bg-[#eefbf4] text-[#0f5132] border border-[#d1f2e1]'
                              : 'bg-[#fdf2f2] text-[#991b1b] border border-[#fde2e2]'
                          }
                        >
                          {c.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ẩn'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 text-stone-400 hover:text-[#800020] rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                            title="Chỉnh sửa danh mục"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => toggleStatus(c)}
                            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                            title="Bật / tắt trạng thái"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {c.status === 'ACTIVE' ? 'visibility' : 'visibility_off'}
                            </span>
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                            title="Xóa danh mục"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-stone-100 bg-stone-50/50">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-stone-900">
                  {selectedId ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
                </h3>
                {selectedId && (
                  <span className="px-2 py-0.5 rounded bg-[#800020]/10 text-[#800020] font-mono font-bold text-[11px]">
                    #{typeof selectedId === 'string' && selectedId.length > 8 ? selectedId.slice(-6) : selectedId}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <Field label="Tên danh mục *" column="name">
                <input
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                  placeholder="VD: Cà phê pha máy, Trà trái cây..."
                />
              </Field>

              <Field label="Icon (Material Symbols)" column="icon">
                <div className="flex gap-2">
                  <select
                    value={form.icon ?? ''}
                    onChange={e => setForm({ ...form, icon: e.target.value })}
                    className={inputCls}
                  >
                    {[...new Set([form.icon ?? '', ...ICONS])].filter(Boolean).map(i => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                  <span className="w-10 h-10 rounded-xl bg-[#800020] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-[20px]">{form.icon || 'category'}</span>
                  </span>
                </div>
              </Field>

              <Field label="Mô tả" column="description">
                <textarea
                  rows={3}
                  value={form.description ?? ''}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className={inputCls}
                  placeholder="Mô tả danh mục hiển thị cho khách hàng..."
                />
              </Field>

              <Field label="Ảnh đại diện (URL)" column="image_url">
                <input
                  maxLength={500}
                  value={form.image_url ?? ''}
                  onChange={e => setForm({ ...form, image_url: e.target.value })}
                  className={inputCls}
                  placeholder="https://example.com/image.jpg"
                />
              </Field>

              <Field label="Trạng thái" column="status">
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value as ActiveStatus })}
                  className={inputCls}
                >
                  <option value="ACTIVE">ACTIVE - Hoạt động</option>
                  <option value="INACTIVE">INACTIVE - Tạm ẩn</option>
                </select>
              </Field>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-medium transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#800020] hover:bg-[#68001a] text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>{selectedId ? 'Lưu thay đổi' : 'Tạo danh mục'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCategoriesPage;
