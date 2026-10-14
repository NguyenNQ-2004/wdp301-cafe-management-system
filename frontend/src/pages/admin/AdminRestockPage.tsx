import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopApi, ShopApiError } from '../../lib/shopApi';
import useAuthStore from '../../store/authStore';
import { AdminLayout, Badge, Field, FormActions, GhostButton, Modal, PrimaryButton, StatCard, inputCls } from './AdminUi';

type Supplier = { _id: string; name: string; status: 'ACTIVE' | 'INACTIVE' } | null;
type Ingredient = { _id: string; name: string; supplier: Supplier; unit: string; currentStock: number; minStockLevel: number; latestUnitPrice: number; needsRestock: boolean };
type OrderItem = { ingredient: Pick<Ingredient, '_id' | 'name' | 'unit' | 'currentStock' | 'minStockLevel'> | null; quantity: number; unitPrice: number };
type PurchaseOrder = { _id: string; supplier: Supplier; creator: { _id: string; fullName: string }; totalCost: number; status: 'DRAFT'; note?: string; items: OrderItem[]; createdAt: string };
type RestockOverview = { summary: { lowStockCount: number; draftCount: number; orderedCount: number; pendingValue: number }; ingredients: Ingredient[]; drafts: PurchaseOrder[] };
type ProposalForm = { ingredientId: string; quantity: number; unitPrice: number; note: string };

const fmtNumber = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value);
const fmtMoney = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
const fmtDateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const poCode = (id: string) => `PO-${id.slice(-4).toUpperCase()}`;

export default function AdminRestockPage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.user?.token);
  const [data, setData] = useState<RestockOverview | null>(null);
  const [modal, setModal] = useState<ProposalForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      setData(await shopApi<RestockOverview>('/api/purchase-orders/restock-overview', { token }));
    } catch (requestError) {
      setError(requestError instanceof ShopApiError ? requestError.message : 'Không tải được dữ liệu đề xuất nhập hàng.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { void loadData(); }, [loadData]);

  const ingredients = data?.ingredients ?? [];
  const lowStock = ingredients.filter((item) => item.needsRestock);
  const drafts = data?.drafts ?? [];
  const summary = data?.summary ?? { lowStockCount: 0, draftCount: 0, orderedCount: 0, pendingValue: 0 };
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3000); };
  const openFor = (ingredient: Ingredient) => setModal({
    ingredientId: ingredient._id,
    quantity: Math.max(ingredient.minStockLevel * 2 - ingredient.currentStock, ingredient.minStockLevel || 1),
    unitPrice: ingredient.latestUnitPrice,
    note: ingredient.needsRestock ? `Tồn ${fmtNumber(ingredient.currentStock)}/${fmtNumber(ingredient.minStockLevel)} ${ingredient.unit} - dưới mức tối thiểu` : ''
  });

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !modal) return;
    const ingredient = ingredients.find((item) => item._id === modal.ingredientId);
    if (!ingredient?.supplier || modal.quantity <= 0 || modal.unitPrice < 0) return showToast('Số lượng, đơn giá hoặc nhà cung cấp không hợp lệ.');
    setSaving(true);
    try {
      const created = await shopApi<PurchaseOrder>('/api/purchase-orders', { method: 'POST', token, body: { supplier: ingredient.supplier._id, items: [{ ingredient: ingredient._id, quantity: modal.quantity, unitPrice: modal.unitPrice }], note: modal.note } });
      setModal(null);
      showToast(`Đã tạo đề xuất ${poCode(created._id)} trong cơ sở dữ liệu.`);
      await loadData();
    } catch (requestError) {
      showToast(requestError instanceof ShopApiError ? requestError.message : 'Không thể tạo đề xuất nhập hàng.');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: 'ORDERED' | 'CANCELLED') => {
    if (!token) return;
    try {
      await shopApi(`/api/purchase-orders/${id}/status`, { method: 'PUT', token, body: { status } });
      showToast(status === 'ORDERED' ? `Đã duyệt ${poCode(id)} và chuyển sang đặt hàng.` : `Đã từ chối ${poCode(id)}.`);
      await loadData();
    } catch (requestError) {
      showToast(requestError instanceof ShopApiError ? requestError.message : 'Không thể cập nhật đề xuất.');
    }
  };

  const firstIngredient = lowStock[0] ?? ingredients[0];
  return <AdminLayout route="admin-restock" table="purchase_orders (DRAFT)" title="Đề xuất nhập hàng" subtitle="Nguyên liệu dưới mức tối thiểu và các phiếu nhập đang ở dạng nháp chờ duyệt."
    actions={<><GhostButton icon="receipt_long" onClick={() => navigate('/admin/purchases')}>Phiếu nhập hàng</GhostButton><PrimaryButton icon="add_alert" onClick={() => firstIngredient && openFor(firstIngredient)}>Tạo đề xuất</PrimaryButton></>}
    stats={<><StatCard label="Dưới mức tối thiểu" value={summary.lowStockCount} tone="danger" /><StatCard label="Đề xuất chờ duyệt" value={summary.draftCount} tone="primary" /><StatCard label="Đã đặt hàng" value={summary.orderedCount} /><StatCard label="Giá trị chờ duyệt" value={fmtMoney(summary.pendingValue)} /></>}>
    {toast ? <div className="fixed right-7 top-7 z-[120] rounded-xl bg-stone-900 px-4 py-3 text-xs font-medium text-white shadow-xl">{toast}</div> : null}
    {error ? <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"><span>{error}</span><button type="button" className="font-bold" onClick={() => void loadData()}>Thử lại</button></div> : null}
    {loading ? <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">Đang tải dữ liệu từ cơ sở dữ liệu...</div> : <>
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs"><div className="border-b border-stone-100 bg-stone-50/50 p-4"><h2 className="text-sm font-bold text-stone-800">Nguyên liệu cần nhập (current_stock ≤ min_stock_level)</h2></div><div className="divide-y divide-stone-100 text-xs">{lowStock.length === 0 ? <p className="p-4 text-stone-400">Tất cả nguyên liệu đang trên mức tối thiểu.</p> : null}{lowStock.map((item) => <div key={item._id} className="flex items-center justify-between gap-3 p-4"><div><strong className="text-stone-900">{item.name}</strong><p className="text-stone-500">Tồn <span className="font-bold text-rose-600">{fmtNumber(item.currentStock)}</span> / tối thiểu {fmtNumber(item.minStockLevel)} {item.unit} • {item.supplier?.name || 'Chưa có nhà cung cấp'}</p></div><PrimaryButton icon="add_shopping_cart" onClick={() => openFor(item)}>Đề xuất nhập</PrimaryButton></div>)}</div></div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs"><div className="border-b border-stone-100 bg-stone-50/50 p-4"><h2 className="text-sm font-bold text-stone-800">Đề xuất chờ duyệt ({drafts.length})</h2></div><div className="overflow-x-auto text-xs"><table className="w-full min-w-[1120px] text-left"><thead className="border-b border-stone-100 bg-stone-50 font-semibold text-stone-500"><tr><th className="p-4">Mã phiếu</th><th className="p-4">Nhà cung cấp</th><th className="p-4">Nguyên liệu</th><th className="p-4 text-right">Tổng tiền</th><th className="p-4">Người tạo / Ngày</th><th className="p-4">Ghi chú</th><th className="p-4">Trạng thái</th><th className="p-4 text-right">Duyệt</th></tr></thead><tbody className="divide-y divide-stone-100">{drafts.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-stone-400">Không có đề xuất nào chờ duyệt.</td></tr> : null}{drafts.map((order) => <tr key={order._id} className="hover:bg-stone-50/60"><td className="p-4 font-mono font-bold text-[#800020]">{poCode(order._id)}</td><td className="p-4 font-semibold">{order.supplier?.name}</td><td className="p-4">{order.items.map((item) => <div key={item.ingredient?._id}>{item.ingredient?.name}: <strong>{fmtNumber(item.quantity)}</strong> {item.ingredient?.unit} × {fmtMoney(item.unitPrice)}</div>)}</td><td className="p-4 text-right font-mono font-bold">{fmtMoney(order.totalCost)}</td><td className="p-4">{order.creator.fullName}<span className="block text-[10px] text-stone-400">{fmtDateTime(order.createdAt)}</span></td><td className="max-w-xs p-4 text-stone-500">{order.note || '—'}</td><td className="p-4"><Badge className="bg-stone-100 text-stone-700">Nháp / Đề xuất</Badge></td><td className="whitespace-nowrap p-4 text-right"><button type="button" onClick={() => void updateStatus(order._id, 'ORDERED')} className="mr-1.5 cursor-pointer rounded-lg bg-emerald-600 px-2.5 py-1 font-bold text-white hover:bg-emerald-700">Duyệt</button><button type="button" onClick={() => void updateStatus(order._id, 'CANCELLED')} className="cursor-pointer rounded-lg bg-stone-100 px-2.5 py-1 font-bold text-stone-600 hover:bg-stone-200">Từ chối</button></td></tr>)}</tbody></table></div></div>
    </>}
    {modal ? <Modal title="Tạo đề xuất nhập hàng (phiếu nháp)" onClose={() => setModal(null)}><form onSubmit={handleCreate} className="space-y-3"><Field label="Nguyên liệu" column="purchase_order_items.ingredient_id"><select value={modal.ingredientId} onChange={(event) => { const ingredient = ingredients.find((item) => item._id === event.target.value); if (ingredient) openFor(ingredient); }} className={inputCls}>{ingredients.map((item) => <option key={item._id} value={item._id}>{item.name} ({item.unit}) - {item.supplier?.name}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Số lượng" column="quantity"><input required type="number" min="0.001" step="0.001" value={modal.quantity} onChange={(event) => setModal({ ...modal, quantity: Number(event.target.value) })} className={inputCls} /></Field><Field label="Đơn giá dự kiến" column="unit_price"><input required type="number" min="0" value={modal.unitPrice} onChange={(event) => setModal({ ...modal, unitPrice: Number(event.target.value) })} className={inputCls} /></Field></div><Field label="Lý do / ghi chú" column="purchase_orders.note"><textarea maxLength={500} rows={2} value={modal.note} onChange={(event) => setModal({ ...modal, note: event.target.value })} className={inputCls} /></Field><p className="text-xs text-stone-500">Thành tiền dự kiến: <strong>{fmtMoney(modal.quantity * modal.unitPrice)}</strong></p><FormActions onCancel={() => setModal(null)} submitLabel={saving ? 'Đang tạo...' : 'Tạo đề xuất'} /></form></Modal> : null}
  </AdminLayout>;
}
