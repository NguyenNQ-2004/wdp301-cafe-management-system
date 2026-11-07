import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AdminLayout, Badge, inputCls, StatCard } from './AdminUi';
import { formatVnd, shopApi } from '../../lib/shopApi';
import useAuthStore from '../../store/authStore';

export interface DeliveryAreaItem {
  _id: string;
  district: string;
  deliveryFee: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminDeliveryAreasPage() {
  const token = useAuthStore(state => state.user?.token);
  const [areas, setAreas] = useState<DeliveryAreaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<DeliveryAreaItem | null>(null);
  const [formDistrict, setFormDistrict] = useState('');
  const [formFee, setFormFee] = useState('18000');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    shopApi<DeliveryAreaItem[]>('/api/delivery-areas?all=true', { token })
      .then(data => { if (active) setAreas(data); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, revision]);

  const openCreateModal = () => {
    setEditingArea(null);
    setFormDistrict('');
    setFormFee('18000');
    setFormActive(true);
    setModalOpen(true);
    setError('');
  };

  const openEditModal = (area: DeliveryAreaItem) => {
    setEditingArea(area);
    setFormDistrict(area.district);
    setFormFee(String(area.deliveryFee));
    setFormActive(area.isActive);
    setModalOpen(true);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || saving) return;
    const feeNum = Number(formFee);
    if (!Number.isSafeInteger(feeNum) || feeNum < 0 || feeNum > 1000000) {
      setError('Phí giao hàng phải từ 0 đến 1.000.000 VNĐ.');
      return;
    }
    if (!formDistrict.trim()) {
      setError('Tên quận/huyện không được để trống.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingArea) {
        await shopApi(`/api/delivery-areas/${editingArea._id}`, {
          method: 'PUT',
          token,
          body: {
            district: formDistrict.trim(),
            deliveryFee: feeNum,
            isActive: formActive
          }
        });
        showToast(`Đã cập nhật khu vực "${formDistrict.trim()}".`);
      } else {
        await shopApi('/api/delivery-areas', {
          method: 'POST',
          token,
          body: {
            district: formDistrict.trim(),
            deliveryFee: feeNum,
            isActive: formActive
          }
        });
        showToast(`Đã thêm khu vực mới "${formDistrict.trim()}".`);
      }
      setModalOpen(false);
      setRevision(r => r + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (area: DeliveryAreaItem) => {
    if (!token || saving) return;
    try {
      await shopApi(`/api/delivery-areas/${area._id}`, {
        method: 'PUT',
        token,
        body: { isActive: !area.isActive }
      });
      showToast(`Đã ${!area.isActive ? 'kích hoạt' : 'tạm ngưng'} khu vực "${area.district}".`);
      setRevision(r => r + 1);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (area: DeliveryAreaItem) => {
    if (!token || !window.confirm(`Bạn có chắc chắn muốn xóa khu vực "${area.district}"?`)) return;
    try {
      await shopApi(`/api/delivery-areas/${area._id}`, {
        method: 'DELETE',
        token
      });
      showToast(`Đã xóa khu vực "${area.district}".`);
      setRevision(r => r + 1);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const visible = areas.filter(a => {
    const matchesSearch = a.district.toLowerCase().includes(search.toLowerCase().trim());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && a.isActive) ||
      (statusFilter === 'INACTIVE' && !a.isActive);
    return matchesSearch && matchesStatus;
  });

  const totalAreas = areas.length;
  const activeAreas = areas.filter(a => a.isActive).length;
  const avgFee = activeAreas > 0
    ? Math.round(areas.filter(a => a.isActive).reduce((sum, a) => sum + a.deliveryFee, 0) / activeAreas)
    : 0;

  return (
    <AdminLayout
      title="Quản lý khu vực & phí giao hàng (UC71)"
      subtitle="Cấu hình danh mục quận/huyện phục vụ, mức phí vận chuyển theo khu vực và trạng thái hoạt động."
      activePath="/admin/delivery-areas"
    >
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Tổng số khu vực" value={totalAreas} hint="Quận/huyện trong hệ thống" />
        <StatCard label="Đang phục vụ giao hàng" value={activeAreas} tone="success" hint="Khách có thể chọn khi checkout" />
        <StatCard label="Phí giao trung bình" value={formatVnd(avgFee)} tone="primary" hint="Khu vực đang hoạt động" />
      </div>

      {/* Filter and Action Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <input
            className={`${inputCls} min-w-56`}
            placeholder="Tìm theo tên quận / huyện..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className={inputCls}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Tạm ngưng</option>
          </select>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-red-800 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
          <span>Thêm khu vực mới</span>
        </button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}

      {/* Table of Delivery Areas */}
      <section aria-label="Danh sách khu vực giao hàng" className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        {loading ? (
          <p role="status" className="p-8 text-center text-stone-500">Đang tải dữ liệu khu vực...</p>
        ) : visible.length === 0 ? (
          <p className="p-10 text-center text-stone-500">Không tìm thấy khu vực giao hàng phù hợp.</p>
        ) : (
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="bg-stone-50 text-left text-xs text-stone-500">
              <tr>
                <th className="px-4 py-3">Quận / Huyện</th>
                <th className="px-4 py-3 text-right">Phí giao hàng</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(area => (
                <tr key={area._id} className="border-t border-stone-100 hover:bg-stone-50/50">
                  <td className="px-4 py-4 font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-stone-400 text-[18px]">location_on</span>
                      <span>{area.district}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-extrabold text-primary tabular-nums">
                    {formatVnd(area.deliveryFee)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(area)}
                      className="cursor-pointer"
                      title="Nhấn để đổi trạng thái"
                    >
                      <Badge className={area.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'}>
                        {area.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(area)}
                        className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-stone-100 transition-colors"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(area)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Modal Add / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-800">
              {editingArea ? `Chỉnh sửa khu vực "${editingArea.district}"` : 'Thêm khu vực giao hàng mới'}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Cấu hình tên quận/huyện và mức phí giao hàng áp dụng cho đơn đặt online.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Tên Quận / Huyện *</label>
                <input
                  required
                  maxLength={100}
                  className={`${inputCls} mt-1 w-full`}
                  placeholder="VD: Cầu Giấy, Hoàn Kiếm, Gia Lâm..."
                  value={formDistrict}
                  onChange={e => setFormDistrict(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Phí giao hàng (VNĐ) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  max="1000000"
                  step="1000"
                  className={`${inputCls} mt-1 w-full`}
                  placeholder="18000"
                  value={formFee}
                  onChange={e => setFormFee(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-stone-400">
                  Lưu ý: Nếu đơn hàng đạt ngưỡng Freeship (cấu hình trong Shop Settings), phí ship sẽ tự động là 0đ.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={formActive}
                  onChange={e => setFormActive(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-primary focus:ring-primary"
                />
                <label htmlFor="activeCheck" className="text-xs font-semibold text-slate-700">
                  Đang hoạt động (cho phép khách chọn khi checkout)
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : editingArea ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}
