import { useCallback, useEffect, useState } from 'react';
import { shopApi, ShopApiError } from '../../lib/shopApi';
import useAuthStore from '../../store/authStore';
import { AdminLayout, Badge, Field, FormActions, Modal, PrimaryButton, StatCard, inputCls } from './AdminUi';

type SupplierStatus = 'ACTIVE' | 'INACTIVE';
interface Supplier { _id: string; name: string; phone: string; address: string; ingredients: string[]; purchaseOrderCount: number; status: SupplierStatus }
interface SupplierOverview { summary: { supplierCount: number; activeCount: number; inactiveCount: number; purchaseOrderCount: number }; suppliers: Supplier[] }
const EMPTY_FORM = { name: '', phone: '', address: '', status: 'ACTIVE' as SupplierStatus };

export default function AdminSuppliersPage() {
  const token = useAuthStore((state) => state.user?.token);
  const [data, setData] = useState<SupplierOverview | null>(null);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadSuppliers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      setData(await shopApi<SupplierOverview>('/api/suppliers/overview', { token }));
    } catch (requestError) {
      setError(requestError instanceof ShopApiError ? requestError.message : 'Không tải được dữ liệu nhà cung cấp.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { void loadSuppliers(); }, [loadSuppliers]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (supplier: Supplier) => { setEditing(supplier); setForm({ name: supplier.name, phone: supplier.phone || '', address: supplier.address || '', status: supplier.status }); setModalOpen(true); };
  const saveSupplier = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await shopApi(editing ? `/api/suppliers/${editing._id}` : '/api/suppliers', { method: editing ? 'PUT' : 'POST', token, body: form });
      setModalOpen(false);
      setMessage(editing ? 'Đã cập nhật nhà cung cấp trong cơ sở dữ liệu.' : 'Đã thêm nhà cung cấp mới vào cơ sở dữ liệu.');
      await loadSuppliers();
    } catch (requestError) {
      setMessage(requestError instanceof ShopApiError ? requestError.message : 'Không thể lưu nhà cung cấp.');
    } finally {
      setSaving(false);
    }
  };
  const removeSupplier = async (supplier: Supplier) => {
    if (!token || !window.confirm(`Xóa nhà cung cấp “${supplier.name}”?`)) return;
    try {
      await shopApi(`/api/suppliers/${supplier._id}`, { method: 'DELETE', token });
      setMessage('Đã xóa nhà cung cấp khỏi cơ sở dữ liệu.');
      await loadSuppliers();
    } catch (requestError) {
      setMessage(requestError instanceof ShopApiError ? requestError.message : 'Không thể xóa nhà cung cấp.');
    }
  };

  const suppliers = data?.suppliers ?? [];
  const summary = data?.summary ?? { supplierCount: 0, activeCount: 0, inactiveCount: 0, purchaseOrderCount: 0 };
  return <AdminLayout route="admin-suppliers" table="suppliers" title="Quản lý nhà cung cấp" subtitle="Đối tác cung cấp nguyên vật liệu cho quán."
    actions={<PrimaryButton icon="add" onClick={openCreate}>Thêm nhà cung cấp</PrimaryButton>}
    stats={<><StatCard label="Tổng nhà cung cấp" value={summary.supplierCount} /><StatCard label="Đang hợp tác" value={summary.activeCount} tone="success" /><StatCard label="Ngừng hợp tác" value={summary.inactiveCount} /><StatCard label="Phiếu nhập" value={summary.purchaseOrderCount} /></>}>
    {message ? <button type="button" onClick={() => setMessage('')} className="mb-3 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-xs text-stone-600">{message}</button> : null}
    {error ? <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"><span>{error}</span><button type="button" className="font-bold" onClick={() => void loadSuppliers()}>Thử lại</button></div> : null}
    {loading ? <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">Đang tải dữ liệu từ cơ sở dữ liệu...</div> : <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs">
      <thead className="border-b border-stone-200 bg-stone-50/70 text-stone-500"><tr>{['ID', 'Tên nhà cung cấp', 'Số điện thoại', 'Địa chỉ', 'Nguyên liệu cung cấp', 'Phiếu nhập', 'Trạng thái', 'Thao tác'].map((heading) => <th key={heading} className="px-5 py-4 font-bold">{heading}</th>)}</tr></thead>
      <tbody className="divide-y divide-stone-100">{suppliers.map((supplier, index) => <tr key={supplier._id} className="hover:bg-stone-50/60"><td className="px-5 py-4 text-stone-500">#{index + 1}</td><td className="px-5 py-4 font-bold text-stone-900">{supplier.name}</td><td className="px-5 py-4 font-mono">{supplier.phone || '—'}</td><td className="px-5 py-4">{supplier.address || '—'}</td><td className="max-w-sm px-5 py-4 text-stone-600">{supplier.ingredients.join(', ') || '—'}</td><td className="px-5 py-4 text-center">{supplier.purchaseOrderCount}</td><td className="px-5 py-4"><Badge className={supplier.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'}>{supplier.status === 'ACTIVE' ? 'Đang hợp tác' : 'Ngừng hợp tác'}</Badge></td><td className="px-5 py-4"><div className="flex gap-4 font-bold text-[#a8071f]"><button type="button" onClick={() => openEdit(supplier)} className="cursor-pointer hover:underline">Sửa</button><button type="button" onClick={() => void removeSupplier(supplier)} className="cursor-pointer hover:underline">Xóa</button></div></td></tr>)}</tbody>
    </table></div></section>}
    {modalOpen ? <Modal title={editing ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'} onClose={() => setModalOpen(false)}><form onSubmit={saveSupplier} className="space-y-4 text-xs">
      <Field label="Tên nhà cung cấp" column="name"><input required maxLength={120} className={inputCls} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
      <Field label="Số điện thoại" column="phone"><input required maxLength={20} pattern="[0-9+().\s-]{8,20}" className={inputCls} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></Field>
      <Field label="Địa chỉ" column="address"><textarea required maxLength={300} rows={3} className={inputCls} value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} /></Field>
      <Field label="Trạng thái" column="status"><select className={inputCls} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as SupplierStatus }))}><option value="ACTIVE">Đang hợp tác</option><option value="INACTIVE">Ngừng hợp tác</option></select></Field>
      <FormActions onCancel={() => setModalOpen(false)} submitLabel={saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Thêm nhà cung cấp'} />
    </form></Modal> : null}
  </AdminLayout>;
}
