import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout, Badge, Field, FormActions, GhostButton, Modal, PrimaryButton, StatCard, inputCls } from './AdminUi';

type PurchaseStatus = 'DRAFT' | 'ORDERED' | 'CANCELLED';
type Ingredient = { id: number; supplierId: number; name: string; unit: string; currentStock: number; minStock: number; unitPrice: number };
type PurchaseOrder = { id: number; supplierId: number; ingredientId: number; quantity: number; unitPrice: number; creator: string; createdAt: string; note: string; status: PurchaseStatus };
type ProposalForm = { ingredientId: number; quantity: number; unitPrice: number; note: string };

const suppliers = new Map([[1, 'Fresh Bean Supplier'], [2, 'Dairy and Syrup Co.'], [3, 'Bakery Ingredient Supply']]);
const ingredients: Ingredient[] = [
  { id: 1, supplierId: 1, name: 'Coffee beans', unit: 'gram', currentStock: 10000, minStock: 2000, unitPrice: 400 },
  { id: 2, supplierId: 2, name: 'Fresh milk', unit: 'ml', currentStock: 20000, minStock: 5000, unitPrice: 150 },
  { id: 3, supplierId: 2, name: 'Peach syrup', unit: 'ml', currentStock: 5000, minStock: 1000, unitPrice: 120 },
  { id: 4, supplierId: 2, name: 'Black tea', unit: 'gram', currentStock: 8000, minStock: 1500, unitPrice: 0 },
  { id: 5, supplierId: 2, name: 'Tapioca pearls', unit: 'gram', currentStock: 4000, minStock: 1000, unitPrice: 0 },
  { id: 6, supplierId: 3, name: 'Cheesecake slice', unit: 'piece', currentStock: 30, minStock: 5, unitPrice: 40000 },
  { id: 7, supplierId: 2, name: 'Orange', unit: 'piece', currentStock: 100, minStock: 20, unitPrice: 0 },
  { id: 8, supplierId: 2, name: 'Lemon', unit: 'piece', currentStock: 80, minStock: 15, unitPrice: 0 },
];
const initialOrders: PurchaseOrder[] = [
  { id: 1, supplierId: 1, ingredientId: 1, quantity: 5000, unitPrice: 400, creator: 'Aura Admin', createdAt: '2026-10-01 08:00:00', note: '', status: 'ORDERED' },
  { id: 3, supplierId: 3, ingredientId: 6, quantity: 20, unitPrice: 40000, creator: 'Aura Admin', createdAt: '2026-10-03 08:00:00', note: '', status: 'DRAFT' },
];
const fmtNumber = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value);
const fmtMoney = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
const fmtDateTime = (value: string) => { const [date, time] = value.split(' '); const [year, month, day] = date.split('-'); return `${day}/${month}/${year} ${time.slice(0, 5)}`; };
const poCode = (id: number) => `PO-${String(id).padStart(4, '0')}`;

const AdminRestockPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState(initialOrders);
  const [modal, setModal] = useState<ProposalForm | null>(null);
  const [toast, setToast] = useState('');
  const lowStock = ingredients.filter(item => item.currentStock <= item.minStock);
  const drafts = orders.filter(order => order.status === 'DRAFT').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3000); };

  const openFor = (ingredient: Ingredient) => setModal({ ingredientId: ingredient.id, quantity: Math.max(ingredient.minStock * 2 - ingredient.currentStock, ingredient.minStock), unitPrice: ingredient.unitPrice, note: ingredient.currentStock <= ingredient.minStock ? `Tồn ${fmtNumber(ingredient.currentStock)}/${fmtNumber(ingredient.minStock)} ${ingredient.unit} - dưới mức tối thiểu` : '' });

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!modal) return;
    const ingredient = ingredients.find(item => item.id === modal.ingredientId);
    if (!ingredient || modal.quantity <= 0 || modal.unitPrice < 0) return showToast('Số lượng phải lớn hơn 0 và đơn giá không âm.');
    const nextId = Math.max(...orders.map(order => order.id), 0) + 1;
    setOrders(current => [...current, { id: nextId, supplierId: ingredient.supplierId, ingredientId: ingredient.id, quantity: modal.quantity, unitPrice: modal.unitPrice, creator: 'Aura Admin', createdAt: '2026-10-15 09:00:00', note: modal.note.trim(), status: 'DRAFT' }]);
    showToast(`Đã tạo đề xuất ${poCode(nextId)} cho ${ingredient.name}.`);
    setModal(null);
  };

  const setStatus = (id: number, status: 'ORDERED' | 'CANCELLED') => {
    setOrders(current => current.map(order => order.id === id ? { ...order, status } : order));
    showToast(status === 'ORDERED' ? `Đã duyệt ${poCode(id)} và đặt hàng với nhà cung cấp.` : `Đã từ chối ${poCode(id)}.`);
  };

  return <AdminLayout
    route="admin-restock"
    table="purchase_orders (DRAFT)"
    title="Đề xuất nhập hàng"
    subtitle="Nguyên liệu dưới mức tối thiểu và các phiếu nhập đang ở dạng nháp chờ duyệt."
    actions={<><GhostButton icon="receipt_long" onClick={() => navigate('/admin/purchases')}>Phiếu nhập hàng</GhostButton><PrimaryButton icon="add_alert" onClick={() => openFor(ingredients[0])}>Tạo đề xuất</PrimaryButton></>}
    stats={<><StatCard label="Dưới mức tối thiểu" value={lowStock.length} tone="danger" /><StatCard label="Đề xuất chờ duyệt" value={drafts.length} tone="primary" /><StatCard label="Đã đặt hàng" value={orders.filter(order => order.status === 'ORDERED').length} /><StatCard label="Giá trị chờ duyệt" value={fmtMoney(drafts.reduce((sum, order) => sum + order.quantity * order.unitPrice, 0))} /></>}
  >
    {toast && <div className="fixed right-7 top-7 z-[120] rounded-xl bg-stone-900 px-4 py-3 text-xs font-medium text-white shadow-xl">{toast}</div>}
    <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
      <div className="p-4 border-b border-stone-100 bg-stone-50/50"><h2 className="font-bold text-sm text-stone-800">Nguyên liệu cần nhập (current_stock ≤ min_stock_level)</h2></div>
      <div className="divide-y divide-stone-100 text-xs">{lowStock.length === 0 && <p className="p-4 text-stone-400">Tất cả nguyên liệu đang trên mức tối thiểu.</p>}{lowStock.map(item => <div key={item.id} className="p-4 flex items-center justify-between gap-3"><div><strong className="text-stone-900">{item.name}</strong><p className="text-stone-500">Tồn <span className="text-rose-600 font-bold">{fmtNumber(item.currentStock)}</span> / tối thiểu {fmtNumber(item.minStock)} {item.unit} • {suppliers.get(item.supplierId)}</p></div><PrimaryButton icon="add_shopping_cart" onClick={() => openFor(item)}>Đề xuất nhập</PrimaryButton></div>)}</div>
    </div>
    <div className="mt-5 bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
      <div className="p-4 border-b border-stone-100 bg-stone-50/50"><h2 className="font-bold text-sm text-stone-800">Đề xuất chờ duyệt ({drafts.length})</h2></div>
      <div className="overflow-x-auto text-xs"><table className="w-full min-w-[1120px] text-left"><thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-100"><tr><th className="p-4">Mã phiếu</th><th className="p-4">Nhà cung cấp</th><th className="p-4">Nguyên liệu</th><th className="p-4 text-right">Tổng tiền</th><th className="p-4">Người tạo / Ngày</th><th className="p-4">Ghi chú</th><th className="p-4">Trạng thái</th><th className="p-4 text-right">Duyệt</th></tr></thead><tbody className="divide-y divide-stone-100">{drafts.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-stone-400">Không có đề xuất nào chờ duyệt.</td></tr>}{drafts.map(order => { const ingredient = ingredients.find(item => item.id === order.ingredientId); return <tr key={order.id} className="hover:bg-stone-50/60"><td className="p-4 font-mono font-bold text-[#800020]">{poCode(order.id)}</td><td className="p-4 font-semibold">{suppliers.get(order.supplierId)}</td><td className="p-4">{ingredient?.name}: <strong>{fmtNumber(order.quantity)}</strong> {ingredient?.unit} × {fmtMoney(order.unitPrice)}</td><td className="p-4 text-right font-mono font-bold">{fmtMoney(order.quantity * order.unitPrice)}</td><td className="p-4">{order.creator}<span className="block text-[10px] text-stone-400">{fmtDateTime(order.createdAt)}</span></td><td className="p-4 text-stone-500 max-w-xs">{order.note || '—'}</td><td className="p-4"><Badge className="bg-stone-100 text-stone-700">Nháp / Đề xuất</Badge></td><td className="p-4 text-right whitespace-nowrap"><button onClick={() => setStatus(order.id, 'ORDERED')} className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg mr-1.5 cursor-pointer">Duyệt</button><button onClick={() => setStatus(order.id, 'CANCELLED')} className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded-lg cursor-pointer">Từ chối</button></td></tr>; })}</tbody></table></div>
    </div>
    {modal && <Modal title="Tạo đề xuất nhập hàng (phiếu nháp)" onClose={() => setModal(null)}><form onSubmit={handleCreate} className="space-y-3"><Field label="Nguyên liệu" column="purchase_order_items.ingredient_id"><select value={modal.ingredientId} onChange={event => { const ingredient = ingredients.find(item => item.id === Number(event.target.value)); if (ingredient) openFor(ingredient); }} className={inputCls}>{ingredients.map(item => <option key={item.id} value={item.id}>{item.name} ({item.unit}) - {suppliers.get(item.supplierId)}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Số lượng" column="quantity"><input type="number" min={0} step="0.001" value={modal.quantity} onChange={event => setModal({ ...modal, quantity: Number(event.target.value) })} className={inputCls} /></Field><Field label="Đơn giá dự kiến" column="unit_price"><input type="number" min={0} value={modal.unitPrice} onChange={event => setModal({ ...modal, unitPrice: Number(event.target.value) })} className={inputCls} /></Field></div><Field label="Lý do / ghi chú" column="purchase_orders.note"><textarea rows={2} value={modal.note} onChange={event => setModal({ ...modal, note: event.target.value })} className={inputCls} /></Field><p className="text-xs text-stone-500">Thành tiền dự kiến: <strong>{fmtMoney(modal.quantity * modal.unitPrice)}</strong></p><FormActions onCancel={() => setModal(null)} submitLabel="Tạo đề xuất" /></form></Modal>}
  </AdminLayout>;
};

export default AdminRestockPage;
