import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopApi, ShopApiError } from '../../lib/shopApi';
import useAuthStore from '../../store/authStore';
import { AdminLayout, Badge, Field, FormActions, GhostButton, Modal, PrimaryButton, StatCard, inputCls } from './AdminUi';

type InventoryTxType = 'IN_PURCHASE' | 'OUT_ORDER' | 'ADJUSTMENT' | 'SPOILAGE';
type Supplier = { _id: string; name: string; phone?: string } | null;
type Ingredient = { _id: string; name: string; supplier: Supplier; unit: string; currentStock: number; minStockLevel: number; latestUnitPrice: number | null; estimatedValue: number | null; status: 'SAFE' | 'LOW_STOCK' };
type InventoryTransaction = { _id: string; ingredient: Pick<Ingredient, '_id' | 'name' | 'unit' | 'currentStock'> | null; transactionType: InventoryTxType; quantity: number; stockDelta: number; referenceType: 'ORDER' | 'PURCHASE_ORDER' | 'ADJUSTMENT'; referenceId?: string; createdAt: string };
type InventoryOverview = { summary: { estimatedValue: number; ingredientCount: number; lowStockCount: number; transactionCount: number }; ingredients: Ingredient[] };

const TX_LABEL: Record<InventoryTxType, string> = { IN_PURCHASE: 'Nhập mua hàng', OUT_ORDER: 'Xuất theo đơn bán', ADJUSTMENT: 'Điều chỉnh tăng', SPOILAGE: 'Hao hụt / Hủy' };
const fmtNumber = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value);
const fmtMoney = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
const fmtDateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

export default function AdminStockPage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.user?.token);
  const [overview, setOverview] = useState<InventoryOverview | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all');
  const [txFilter, setTxFilter] = useState<'all' | InventoryTxType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [form, setForm] = useState<{ ingredientId: string; type: 'ADJUSTMENT' | 'SPOILAGE'; quantity: number }>({ ingredientId: '', type: 'SPOILAGE', quantity: 0 });

  const loadInventory = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [nextOverview, nextTransactions] = await Promise.all([
        shopApi<InventoryOverview>('/api/inventory-transactions/overview', { token }),
        shopApi<InventoryTransaction[]>('/api/inventory-transactions?limit=200', { token })
      ]);
      setOverview(nextOverview);
      setTransactions(nextTransactions);
      setForm((current) => ({ ...current, ingredientId: current.ingredientId || nextOverview.ingredients[0]?._id || '' }));
    } catch (requestError) {
      setError(requestError instanceof ShopApiError ? requestError.message : 'Không tải được dữ liệu tồn kho.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetching remote inventory when the authenticated session changes is intentional.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { void loadInventory(); }, [loadInventory]);

  const ingredients = overview?.ingredients ?? [];
  const filteredStock = ingredients.filter((item) => stockFilter === 'all' || item.status === 'LOW_STOCK');
  const filteredTransactions = useMemo(() => transactions.filter((item) => txFilter === 'all' || item.transactionType === txFilter), [transactions, txFilter]);
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3000); };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !form.ingredientId || form.quantity <= 0) return showToast('Số lượng phải lớn hơn 0.');
    setSaving(true);
    try {
      await shopApi('/api/inventory-transactions', {
        method: 'POST', token,
        body: { ingredient: form.ingredientId, transactionType: form.type, quantity: form.quantity, isAddition: form.type === 'ADJUSTMENT', note: form.type === 'ADJUSTMENT' ? 'Kiểm kê thừa' : 'Hao hụt / hủy hàng' }
      });
      setIsModalOpen(false);
      setForm((current) => ({ ...current, quantity: 0 }));
      showToast('Đã ghi phiếu điều chỉnh vào cơ sở dữ liệu.');
      await loadInventory();
    } catch (requestError) {
      showToast(requestError instanceof ShopApiError ? requestError.message : 'Không thể ghi phiếu điều chỉnh.');
    } finally {
      setSaving(false);
    }
  };

  const summary = overview?.summary ?? { estimatedValue: 0, ingredientCount: 0, lowStockCount: 0, transactionCount: 0 };
  return <AdminLayout
    route="admin-inventory"
    table="ingredients, inventory_transactions"
    title="Tồn kho & lịch sử xuất nhập"
    subtitle="Tồn kho hiện tại và mọi biến động: nhập mua hàng, xuất theo đơn bán, điều chỉnh, hao hụt."
    actions={<><GhostButton icon="add_alert" onClick={() => navigate('/admin/restock')}>Đề xuất nhập hàng</GhostButton><PrimaryButton icon="tune" onClick={() => setIsModalOpen(true)}>Ghi phiếu điều chỉnh</PrimaryButton></>}
    stats={<><StatCard label="Giá trị tồn ước tính" value={fmtMoney(summary.estimatedValue)} hint="Theo giá nhập gần nhất" /><StatCard label="Số nguyên liệu" value={summary.ingredientCount} /><StatCard label="Dưới mức tối thiểu" value={summary.lowStockCount} tone="danger" /><StatCard label="Phiếu xuất nhập" value={summary.transactionCount} /></>}>
    {toast ? <div className="fixed right-7 top-7 z-[120] rounded-xl bg-stone-900 px-4 py-3 text-xs font-medium text-white shadow-xl">{toast}</div> : null}
    {error ? <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"><span>{error}</span><button type="button" className="font-bold" onClick={() => void loadInventory()}>Thử lại</button></div> : null}
    {loading ? <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">Đang tải dữ liệu từ cơ sở dữ liệu...</div> : <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs xl:col-span-7">
        <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/50 p-4"><h2 className="text-sm font-bold text-stone-800">Tồn kho hiện tại</h2><select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as typeof stockFilter)} className="h-8 cursor-pointer rounded-lg border border-stone-200 px-2 text-xs"><option value="all">Tất cả</option><option value="low">Dưới mức tối thiểu</option></select></div>
        <div className="overflow-x-auto text-xs"><table className="w-full text-left"><thead className="border-b border-stone-200 bg-stone-50 text-[10px] font-bold uppercase text-stone-500"><tr><th className="px-3 py-2.5">Nguyên liệu</th><th className="px-3 py-2.5 text-right">Tồn</th><th className="px-3 py-2.5 text-right">Tối thiểu</th><th className="px-3 py-2.5 text-right">Giá trị</th><th className="px-3 py-2.5 text-center">Trạng thái</th></tr></thead><tbody className="divide-y divide-stone-100">{filteredStock.map((item) => <tr key={item._id} className="hover:bg-stone-50"><td className="px-3 py-2.5"><strong className="block text-stone-900">{item.name}</strong><span className="text-[10px] text-stone-400">{item.supplier?.name || 'Chưa có nhà cung cấp'}</span></td><td className={`px-3 py-2.5 text-right font-mono font-bold ${item.status === 'LOW_STOCK' ? 'text-rose-600' : 'text-emerald-700'}`}>{fmtNumber(item.currentStock)} {item.unit}</td><td className="px-3 py-2.5 text-right font-mono text-stone-500">{fmtNumber(item.minStockLevel)}</td><td className="px-3 py-2.5 text-right font-mono">{item.estimatedValue === null ? '—' : fmtMoney(item.estimatedValue)}</td><td className="px-3 py-2.5 text-center"><Badge className={item.status === 'LOW_STOCK' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}>{item.status === 'LOW_STOCK' ? 'Cần nhập' : 'An toàn'}</Badge></td></tr>)}</tbody></table></div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs xl:col-span-5">
        <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/50 p-4"><h2 className="text-sm font-bold text-stone-800">Lịch sử xuất nhập</h2><select value={txFilter} onChange={(event) => setTxFilter(event.target.value as typeof txFilter)} className="h-8 cursor-pointer rounded-lg border border-stone-200 px-2 text-xs"><option value="all">Tất cả loại</option>{(Object.keys(TX_LABEL) as InventoryTxType[]).map((type) => <option key={type} value={type}>{TX_LABEL[type]}</option>)}</select></div>
        <div className="max-h-[520px] divide-y divide-stone-100 overflow-y-auto text-xs">{filteredTransactions.map((transaction) => <div key={transaction._id} className="flex items-center justify-between gap-2 p-3"><div><div className="flex items-center gap-1.5"><Badge className={transaction.stockDelta > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}>{TX_LABEL[transaction.transactionType]}</Badge><span className="font-mono text-[10px] text-stone-400">#{transaction._id.slice(-6)}</span></div><p className="mt-1 font-semibold text-stone-900">{transaction.ingredient?.name || 'Nguyên liệu đã xóa'}</p><p className="text-[10px] text-stone-400">{fmtDateTime(transaction.createdAt)} • {transaction.referenceType}</p></div><span className={`font-mono font-bold ${transaction.stockDelta > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{transaction.stockDelta > 0 ? '+' : ''}{fmtNumber(transaction.stockDelta)} {transaction.ingredient?.unit}</span></div>)}</div>
      </div>
    </div>}
    {isModalOpen ? <Modal title="Ghi phiếu điều chỉnh tồn kho" onClose={() => setIsModalOpen(false)}><form onSubmit={handleCreate} className="space-y-3"><Field label="Nguyên liệu" column="ingredient_id"><select required value={form.ingredientId} onChange={(event) => setForm((current) => ({ ...current, ingredientId: event.target.value }))} className={inputCls}>{ingredients.map((item) => <option key={item._id} value={item._id}>{item.name} (tồn {fmtNumber(item.currentStock)} {item.unit})</option>)}</select></Field><Field label="Loại phiếu" column="transaction_type"><select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as 'ADJUSTMENT' | 'SPOILAGE' }))} className={inputCls}><option value="ADJUSTMENT">ADJUSTMENT - Điều chỉnh tăng</option><option value="SPOILAGE">SPOILAGE - Hao hụt / hủy hàng</option></select></Field><Field label="Số lượng (luôn dương)" column="quantity"><input required type="number" min="0.001" step="0.001" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))} className={inputCls} /></Field><FormActions onCancel={() => setIsModalOpen(false)} submitLabel={saving ? 'Đang ghi...' : 'Ghi phiếu'} /></form></Modal> : null}
  </AdminLayout>;
}
