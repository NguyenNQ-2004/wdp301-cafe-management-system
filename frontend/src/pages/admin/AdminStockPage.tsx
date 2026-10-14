import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout, Badge, Field, FormActions, GhostButton, Modal, PrimaryButton, StatCard, inputCls } from './AdminUi';

type InventoryTxType = 'IN_PURCHASE' | 'OUT_ORDER' | 'ADJUSTMENT' | 'SPOILAGE';
type Ingredient = { id: number; name: string; supplier: string; unit: string; currentStock: number; minStock: number; unitPrice: number | null };
type InventoryTransaction = { id: number; ingredientId: number; type: InventoryTxType; quantity: number; reference: string; createdAt: string };

const initialIngredients: Ingredient[] = [
  { id: 1, name: 'Coffee beans', supplier: 'Fresh Bean Supplier', unit: 'gram', currentStock: 10000, minStock: 2000, unitPrice: 400 },
  { id: 2, name: 'Fresh milk', supplier: 'Dairy and Syrup Co.', unit: 'ml', currentStock: 20000, minStock: 5000, unitPrice: 150 },
  { id: 3, name: 'Peach syrup', supplier: 'Dairy and Syrup Co.', unit: 'ml', currentStock: 5000, minStock: 1000, unitPrice: 120 },
  { id: 4, name: 'Black tea', supplier: 'Dairy and Syrup Co.', unit: 'gram', currentStock: 8000, minStock: 1500, unitPrice: null },
  { id: 5, name: 'Tapioca pearls', supplier: 'Dairy and Syrup Co.', unit: 'gram', currentStock: 4000, minStock: 1000, unitPrice: null },
  { id: 6, name: 'Cheesecake slice', supplier: 'Bakery Ingredient Supply', unit: 'piece', currentStock: 30, minStock: 5, unitPrice: 40000 },
  { id: 7, name: 'Orange', supplier: 'Dairy and Syrup Co.', unit: 'piece', currentStock: 100, minStock: 20, unitPrice: null },
  { id: 8, name: 'Lemon', supplier: 'Dairy and Syrup Co.', unit: 'piece', currentStock: 80, minStock: 15, unitPrice: null },
];
const initialTransactions: InventoryTransaction[] = [
  { id: 1, ingredientId: 1, type: 'IN_PURCHASE', quantity: 5000, reference: 'PO-0001', createdAt: '2026-10-01 10:00:00' },
  { id: 2, ingredientId: 2, type: 'IN_PURCHASE', quantity: 10000, reference: 'PO-0002', createdAt: '2026-10-02 10:00:00' },
  { id: 3, ingredientId: 1, type: 'OUT_ORDER', quantity: 36, reference: 'AURA-001', createdAt: '2026-10-03 09:10:00' },
  { id: 4, ingredientId: 2, type: 'OUT_ORDER', quantity: 360, reference: 'AURA-002', createdAt: '2026-10-03 10:10:00' },
  { id: 5, ingredientId: 5, type: 'SPOILAGE', quantity: 100, reference: 'Điều chỉnh', createdAt: '2026-10-03 11:00:00' },
  { id: 6, ingredientId: 3, type: 'ADJUSTMENT', quantity: 50, reference: 'Điều chỉnh', createdAt: '2026-10-03 11:30:00' },
];
const txLabel: Record<InventoryTxType, string> = { IN_PURCHASE: 'Nhập mua hàng', OUT_ORDER: 'Xuất theo đơn bán', ADJUSTMENT: 'Điều chỉnh tăng', SPOILAGE: 'Hao hụt / Hủy' };
const txSign: Record<InventoryTxType, number> = { IN_PURCHASE: 1, OUT_ORDER: -1, ADJUSTMENT: 1, SPOILAGE: -1 };
const fmtNumber = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value);
const fmtMoney = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
const fmtDateTime = (value: string) => { const [date, time] = value.split(' '); const [year, month, day] = date.split('-'); return `${day}/${month}/${year} ${time.slice(0, 5)}`; };

const AdminStockPage: React.FC = () => {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all');
  const [txFilter, setTxFilter] = useState<'all' | InventoryTxType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState<{ ingredientId: number; type: 'ADJUSTMENT' | 'SPOILAGE'; quantity: number }>({ ingredientId: 1, type: 'SPOILAGE', quantity: 0 });

  const filteredStock = ingredients.filter(item => stockFilter === 'all' || item.currentStock <= item.minStock);
  const filteredTransactions = useMemo(() => [...transactions].filter(item => txFilter === 'all' || item.type === txFilter).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id), [transactions, txFilter]);
  const totalValue = ingredients.reduce((sum, item) => sum + (item.unitPrice === null ? 0 : item.unitPrice * item.currentStock), 0);
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3000); };

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const ingredient = ingredients.find(item => item.id === form.ingredientId);
    if (!ingredient || form.quantity <= 0) return showToast('Số lượng phải lớn hơn 0.');
    if (form.type === 'SPOILAGE' && form.quantity > ingredient.currentStock) return showToast('Số lượng hao hụt vượt quá tồn hiện tại.');
    setIngredients(current => current.map(item => item.id === ingredient.id ? { ...item, currentStock: item.currentStock + txSign[form.type] * form.quantity } : item));
    setTransactions(current => [...current, { id: Math.max(...current.map(item => item.id)) + 1, ingredientId: ingredient.id, type: form.type, quantity: form.quantity, reference: 'Điều chỉnh', createdAt: '2026-10-15 09:00:00' }]);
    showToast(`Đã ghi ${txLabel[form.type].toLowerCase()} ${fmtNumber(form.quantity)} ${ingredient.unit} ${ingredient.name}.`);
    setIsModalOpen(false);
    setForm(current => ({ ...current, quantity: 0 }));
  };

  return <AdminLayout
    route="admin-inventory"
    table="ingredients, inventory_transactions"
    title="Tồn kho & lịch sử xuất nhập"
    subtitle="Tồn kho hiện tại và mọi biến động: nhập mua hàng, xuất theo đơn bán, điều chỉnh, hao hụt."
    actions={<><GhostButton icon="add_alert" onClick={() => navigate('/admin/restock')}>Đề xuất nhập hàng</GhostButton><PrimaryButton icon="tune" onClick={() => setIsModalOpen(true)}>Ghi phiếu điều chỉnh</PrimaryButton></>}
    stats={<><StatCard label="Giá trị tồn ước tính" value={fmtMoney(totalValue)} hint="Theo giá nhập gần nhất" /><StatCard label="Số nguyên liệu" value={ingredients.length} /><StatCard label="Dưới mức tối thiểu" value={ingredients.filter(item => item.currentStock <= item.minStock).length} tone="danger" /><StatCard label="Phiếu xuất nhập" value={transactions.length} /></>}
  >
    {toast && <div className="fixed right-7 top-7 z-[120] rounded-xl bg-stone-900 px-4 py-3 text-xs font-medium text-white shadow-xl">{toast}</div>}
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      <div className="xl:col-span-7 bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50"><h2 className="font-bold text-sm text-stone-800">Tồn kho hiện tại</h2><select value={stockFilter} onChange={event => setStockFilter(event.target.value as typeof stockFilter)} className="h-8 px-2 rounded-lg border border-stone-200 text-xs cursor-pointer"><option value="all">Tất cả</option><option value="low">Dưới mức tối thiểu</option></select></div>
        <div className="overflow-x-auto text-xs"><table className="w-full text-left"><thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-bold border-b border-stone-200"><tr><th className="py-2.5 px-3">Nguyên liệu</th><th className="py-2.5 px-3 text-right">Tồn</th><th className="py-2.5 px-3 text-right">Tối thiểu</th><th className="py-2.5 px-3 text-right">Giá trị</th><th className="py-2.5 px-3 text-center">Trạng thái</th></tr></thead><tbody className="divide-y divide-stone-100">{filteredStock.map(item => { const low = item.currentStock <= item.minStock; const value = item.unitPrice === null ? null : item.unitPrice * item.currentStock; return <tr key={item.id} className="hover:bg-stone-50"><td className="py-2.5 px-3"><strong className="text-stone-900 block">{item.name}</strong><span className="text-[10px] text-stone-400">{item.supplier}</span></td><td className={`py-2.5 px-3 text-right font-mono font-bold ${low ? 'text-rose-600' : 'text-emerald-700'}`}>{fmtNumber(item.currentStock)} {item.unit}</td><td className="py-2.5 px-3 text-right font-mono text-stone-500">{fmtNumber(item.minStock)}</td><td className="py-2.5 px-3 text-right font-mono">{value === null ? '—' : fmtMoney(value)}</td><td className="py-2.5 px-3 text-center"><Badge className={low ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}>{low ? 'Cần nhập' : 'An toàn'}</Badge></td></tr>; })}</tbody></table></div>
      </div>
      <div className="xl:col-span-5 bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50"><h2 className="font-bold text-sm text-stone-800">Lịch sử xuất nhập</h2><select value={txFilter} onChange={event => setTxFilter(event.target.value as typeof txFilter)} className="h-8 px-2 rounded-lg border border-stone-200 text-xs cursor-pointer"><option value="all">Tất cả loại</option>{(Object.keys(txLabel) as InventoryTxType[]).map(type => <option key={type} value={type}>{txLabel[type]}</option>)}</select></div>
        <div className="divide-y divide-stone-100 text-xs max-h-[520px] overflow-y-auto">{filteredTransactions.map(transaction => { const ingredient = ingredients.find(item => item.id === transaction.ingredientId); const sign = txSign[transaction.type]; return <div key={transaction.id} className="p-3 flex items-center justify-between gap-2"><div><div className="flex items-center gap-1.5"><Badge className={sign > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}>{txLabel[transaction.type]}</Badge><span className="text-[10px] text-stone-400 font-mono">#{transaction.id}</span></div><p className="font-semibold text-stone-900 mt-1">{ingredient?.name}</p><p className="text-[10px] text-stone-400">{fmtDateTime(transaction.createdAt)} • {transaction.reference}</p></div><span className={`font-mono font-bold ${sign > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{sign > 0 ? '+' : '-'}{fmtNumber(transaction.quantity)} {ingredient?.unit}</span></div>; })}</div>
      </div>
    </div>
    {isModalOpen && <Modal title="Ghi phiếu điều chỉnh tồn kho" onClose={() => setIsModalOpen(false)}><form onSubmit={handleCreate} className="space-y-3"><Field label="Nguyên liệu" column="ingredient_id"><select value={form.ingredientId} onChange={event => setForm({ ...form, ingredientId: Number(event.target.value) })} className={inputCls}>{ingredients.map(item => <option key={item.id} value={item.id}>{item.name} (tồn {fmtNumber(item.currentStock)} {item.unit})</option>)}</select></Field><Field label="Loại phiếu" column="transaction_type"><select value={form.type} onChange={event => setForm({ ...form, type: event.target.value as 'ADJUSTMENT' | 'SPOILAGE' })} className={inputCls}><option value="ADJUSTMENT">ADJUSTMENT - Điều chỉnh tăng (kiểm kê thừa)</option><option value="SPOILAGE">SPOILAGE - Hao hụt / hủy hàng</option></select></Field><Field label="Số lượng (luôn dương)" column="quantity"><input type="number" min={0} step="0.001" value={form.quantity} onChange={event => setForm({ ...form, quantity: Number(event.target.value) })} className={inputCls} /></Field><FormActions onCancel={() => setIsModalOpen(false)} submitLabel="Ghi phiếu" /></form></Modal>}
  </AdminLayout>;
};

export default AdminStockPage;
