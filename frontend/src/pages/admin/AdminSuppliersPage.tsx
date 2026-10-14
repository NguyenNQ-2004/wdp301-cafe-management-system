import { useMemo, useState } from 'react';
import { AdminLayout, Badge, Field, FormActions, Modal, PrimaryButton, StatCard, inputCls } from './AdminUi';

type SupplierStatus = 'ACTIVE' | 'INACTIVE';
interface Supplier { id: number; name: string; phone: string; address: string; ingredients: string[]; purchaseOrders: number; status: SupplierStatus }

const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 1, name: 'Fresh Bean Supplier', phone: '0911000001', address: 'Dong Da, Hanoi', ingredients: ['Coffee beans'], purchaseOrders: 1, status: 'ACTIVE' },
  { id: 2, name: 'Dairy and Syrup Co.', phone: '0911000002', address: 'Cau Giay, Hanoi', ingredients: ['Fresh milk', 'Peach syrup', 'Black tea', 'Tapioca pearls', 'Orange', 'Lemon'], purchaseOrders: 1, status: 'ACTIVE' },
  { id: 3, name: 'Bakery Ingredient Supply', phone: '0911000003', address: 'Ba Dinh, Hanoi', ingredients: ['Cheesecake slice'], purchaseOrders: 1, status: 'ACTIVE' }
];
const EMPTY_FORM = { name: '', phone: '', address: '', status: 'ACTIVE' as SupplierStatus };

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const totals = useMemo(() => ({ active: suppliers.filter((item) => item.status === 'ACTIVE').length, orders: suppliers.reduce((sum, item) => sum + item.purchaseOrders, 0) }), [suppliers]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (supplier: Supplier) => { setEditing(supplier); setForm({ name: supplier.name, phone: supplier.phone, address: supplier.address, status: supplier.status }); setModalOpen(true); };
  const saveSupplier = (event: React.FormEvent) => {
    event.preventDefault();
    if (editing) {
      setSuppliers((current) => current.map((item) => item.id === editing.id ? { ...item, ...form } : item));
      setMessage('Đã cập nhật nhà cung cấp.');
    } else {
      setSuppliers((current) => [...current, { id: Math.max(0, ...current.map((item) => item.id)) + 1, ...form, ingredients: [], purchaseOrders: 0 }]);
      setMessage('Đã thêm nhà cung cấp mới.');
    }
    setModalOpen(false);
  };
  const removeSupplier = (supplier: Supplier) => {
    if (supplier.purchaseOrders > 0) { setMessage('Không thể xóa nhà cung cấp đã có phiếu nhập.'); return; }
    setSuppliers((current) => current.filter((item) => item.id !== supplier.id));
    setMessage('Đã xóa nhà cung cấp.');
  };

  return (
    <AdminLayout route="admin-suppliers" table="suppliers" title="Quản lý nhà cung cấp" subtitle="Đối tác cung cấp nguyên vật liệu cho quán."
      actions={<PrimaryButton icon="add" onClick={openCreate}>Thêm nhà cung cấp</PrimaryButton>}
      stats={<><StatCard label="Tổng nhà cung cấp" value={suppliers.length} /><StatCard label="Đang hợp tác" value={totals.active} tone="success" /><StatCard label="Ngừng hợp tác" value={suppliers.length - totals.active} /><StatCard label="Phiếu nhập" value={totals.orders} /></>}>
      {message ? <button type="button" onClick={() => setMessage('')} className="mb-3 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-xs text-stone-600">{message}</button> : null}
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs">
        <thead className="border-b border-stone-200 bg-stone-50/70 text-stone-500"><tr>{['ID', 'Tên nhà cung cấp', 'Số điện thoại', 'Địa chỉ', 'Nguyên liệu cung cấp', 'Phiếu nhập', 'Trạng thái', 'Thao tác'].map((heading) => <th key={heading} className="px-5 py-4 font-bold">{heading}</th>)}</tr></thead>
        <tbody className="divide-y divide-stone-100">{suppliers.map((supplier) => <tr key={supplier.id} className="hover:bg-stone-50/60">
          <td className="px-5 py-4 text-stone-500">#{supplier.id}</td><td className="px-5 py-4 font-bold text-stone-900">{supplier.name}</td><td className="px-5 py-4 font-mono">{supplier.phone}</td><td className="px-5 py-4">{supplier.address}</td><td className="max-w-sm px-5 py-4 text-stone-600">{supplier.ingredients.join(', ') || '—'}</td><td className="px-5 py-4 text-center">{supplier.purchaseOrders}</td><td className="px-5 py-4"><Badge className={supplier.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'}>{supplier.status === 'ACTIVE' ? 'Đang hợp tác' : 'Ngừng hợp tác'}</Badge></td><td className="px-5 py-4"><div className="flex gap-4 font-bold text-[#a8071f]"><button type="button" onClick={() => openEdit(supplier)} className="cursor-pointer hover:underline">Sửa</button><button type="button" onClick={() => removeSupplier(supplier)} className="cursor-pointer hover:underline">Xóa</button></div></td>
        </tr>)}</tbody>
      </table></div></section>
      {modalOpen ? <Modal title={editing ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'} onClose={() => setModalOpen(false)}><form onSubmit={saveSupplier} className="space-y-4 text-xs">
        <Field label="Tên nhà cung cấp" column="name"><input required className={inputCls} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
        <Field label="Số điện thoại" column="phone"><input required className={inputCls} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></Field>
        <Field label="Địa chỉ" column="address"><textarea required rows={3} className={inputCls} value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} /></Field>
        <Field label="Trạng thái" column="status"><select className={inputCls} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as SupplierStatus }))}><option value="ACTIVE">Đang hợp tác</option><option value="INACTIVE">Ngừng hợp tác</option></select></Field>
        <FormActions onCancel={() => setModalOpen(false)} submitLabel={editing ? 'Lưu thay đổi' : 'Thêm nhà cung cấp'} />
      </form></Modal> : null}
    </AdminLayout>
  );
}
