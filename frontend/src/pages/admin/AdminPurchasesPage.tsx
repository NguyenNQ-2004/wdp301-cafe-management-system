import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopApi, ShopApiError } from '../../lib/shopApi';
import useAuthStore from '../../store/authStore';
import { AdminLayout, Badge, Field, FormActions, GhostButton, Modal, PrimaryButton, StatCard, inputCls } from './AdminUi';

type Status = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
type Supplier = { _id: string; name: string; status: 'ACTIVE' | 'INACTIVE' };
type Ingredient = { _id: string; name: string; unit: string; supplier: Supplier | null; latestUnitPrice: number };
type Item = { ingredient: Ingredient | null; quantity: number; unitPrice: number };
type FormItem = { ingredient: string; quantity: number; unitPrice: number };
type Order = { _id: string; supplier: Supplier | null; creator: { _id: string; fullName: string }; createdAt: string; status: Status; note: string; totalCost: number; items: Item[] };
type ManagementData = { summary: Record<Status, number>; orders: Order[]; suppliers: Supplier[]; ingredients: Ingredient[] };

const META: Record<Status, [string, string]> = { DRAFT: ['Nháp / Đề xuất', 'bg-stone-100 text-stone-700'], ORDERED: ['Đã đặt hàng', 'bg-blue-100 text-blue-700'], RECEIVED: ['Đã nhập kho', 'bg-emerald-100 text-emerald-800'], CANCELLED: ['Đã hủy', 'bg-rose-100 text-rose-700'] };
const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;
const code = (id: string) => `PO-${id.slice(-4).toUpperCase()}`;
const dateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

export default function AdminPurchasesPage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.user?.token);
  const [data, setData] = useState<ManagementData | null>(null);
  const [filter, setFilter] = useState<'ALL' | Status>('ALL');
  const [detail, setDetail] = useState<Order | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [initialStatus, setInitialStatus] = useState<'DRAFT' | 'ORDERED'>('DRAFT');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      setData(await shopApi<ManagementData>('/api/purchase-orders/management-overview', { token }));
    } catch (requestError) {
      setError(requestError instanceof ShopApiError ? requestError.message : 'Không tải được dữ liệu phiếu nhập hàng.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { void loadData(); }, [loadData]);

  const orders = data?.orders ?? [];
  const suppliers = data?.suppliers ?? [];
  const ingredients = data?.ingredients ?? [];
  const summary = data?.summary ?? { DRAFT: 0, ORDERED: 0, RECEIVED: 0, CANCELLED: 0 };
  const visible = filter === 'ALL' ? orders : orders.filter((order) => order.status === filter);
  const supplierIngredients = ingredients.filter((ingredient) => ingredient.supplier?._id === supplierId);
  const draftTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const itemForIngredient = (ingredient: Ingredient): FormItem => ({ ingredient: ingredient._id, quantity: 1, unitPrice: ingredient.latestUnitPrice });
  const openCreate = () => {
    const firstSupplier = suppliers[0];
    const firstIngredient = ingredients.find((ingredient) => ingredient.supplier?._id === firstSupplier?._id);
    setSupplierId(firstSupplier?._id || '');
    setItems(firstIngredient ? [itemForIngredient(firstIngredient)] : []);
    setInitialStatus('DRAFT');
    setNote('');
    setCreateOpen(true);
  };
  const changeSupplier = (nextSupplierId: string) => {
    const firstIngredient = ingredients.find((ingredient) => ingredient.supplier?._id === nextSupplierId);
    setSupplierId(nextSupplierId);
    setItems(firstIngredient ? [itemForIngredient(firstIngredient)] : []);
  };
  const updateItem = (index: number, patch: Partial<FormItem>) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));

  const createOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !supplierId || items.length === 0) return;
    setSaving(true);
    try {
      const created = await shopApi<Order>('/api/purchase-orders', { method: 'POST', token, body: { supplier: supplierId, items, note } });
      if (initialStatus === 'ORDERED') await shopApi(`/api/purchase-orders/${created._id}/status`, { method: 'PUT', token, body: { status: 'ORDERED' } });
      setCreateOpen(false);
      setMessage('Đã tạo phiếu nhập hàng trong cơ sở dữ liệu.');
      await loadData();
    } catch (requestError) {
      setMessage(requestError instanceof ShopApiError ? requestError.message : 'Không thể tạo phiếu nhập hàng.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (order: Order, next: Status) => {
    if (!token) return;
    const warning = next === 'RECEIVED' ? `Xác nhận đã nhận hàng cho ${code(order._id)}? Tồn kho sẽ được cập nhật.` : next === 'CANCELLED' ? `Hủy ${code(order._id)}?` : '';
    if (warning && !window.confirm(warning)) return;
    try {
      await shopApi(`/api/purchase-orders/${order._id}/status`, { method: 'PUT', token, body: { status: next } });
      setDetail(null);
      setMessage(next === 'RECEIVED' ? 'Đã nhập hàng vào kho và ghi lịch sử tồn kho.' : next === 'ORDERED' ? 'Đã chuyển phiếu sang trạng thái đặt hàng.' : 'Đã hủy phiếu nhập.');
      await loadData();
    } catch (requestError) {
      setMessage(requestError instanceof ShopApiError ? requestError.message : 'Không thể cập nhật trạng thái phiếu nhập.');
    }
  };

  return <AdminLayout route="admin-purchases" table="purchase_orders, purchase_order_items" title="Phiếu nhập hàng" subtitle="Tạo phiếu đặt hàng nhà cung cấp, theo dõi trạng thái và nhập kho khi nhận hàng."
    actions={<><GhostButton icon="storefront" onClick={() => navigate('/admin/suppliers')}>Nhà cung cấp</GhostButton><PrimaryButton icon="add" onClick={openCreate}>Tạo phiếu nhập</PrimaryButton></>}
    stats={<><StatCard label="Nháp / Đề xuất" value={summary.DRAFT} /><StatCard label="Đã đặt hàng" value={summary.ORDERED} /><StatCard label="Đã nhập kho" value={summary.RECEIVED} /><StatCard label="Đã hủy" value={summary.CANCELLED} /></>}>
    {message ? <button type="button" onClick={() => setMessage('')} className="mb-3 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-xs text-stone-600">{message}</button> : null}
    {error ? <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"><span>{error}</span><button type="button" className="font-bold" onClick={() => void loadData()}>Thử lại</button></div> : null}
    {loading ? <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">Đang tải dữ liệu từ cơ sở dữ liệu...</div> : <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white"><div className="flex items-center justify-between border-b border-stone-100 px-5 py-4"><h2 className="font-bold">Danh sách phiếu nhập</h2><select aria-label="Lọc trạng thái" className={`${inputCls} w-auto min-w-40`} value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="ALL">Tất cả trạng thái</option>{Object.entries(META).map(([key, value]) => <option key={key} value={key}>{value[0]}</option>)}</select></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-xs"><thead className="border-b bg-stone-50 text-stone-500"><tr>{['Mã phiếu', 'Nhà cung cấp', 'Người tạo', 'Ngày tạo', 'Số dòng', 'Tổng tiền', 'Trạng thái', 'Thao tác'].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr></thead><tbody className="divide-y">{visible.map((order) => <tr key={order._id}><td className="px-5 py-4 font-mono font-bold">{code(order._id)}</td><td className="px-5 py-4 font-semibold">{order.supplier?.name || 'Nhà cung cấp đã xóa'}</td><td className="px-5 py-4">{order.creator.fullName}</td><td className="px-5 py-4 text-stone-500">{dateTime(order.createdAt)}</td><td className="px-5 py-4 text-center">{order.items.length}</td><td className="px-5 py-4 text-right font-mono font-bold">{money(order.totalCost)}</td><td className="px-5 py-4"><Badge className={META[order.status][1]}>{META[order.status][0]}</Badge></td><td className="px-5 py-4"><div className="flex justify-end gap-3 font-bold"><button type="button" onClick={() => setDetail(order)} className="text-[#a8071f]">Xem</button>{order.status === 'DRAFT' ? <button type="button" onClick={() => void changeStatus(order, 'ORDERED')} className="text-blue-700">Đặt hàng</button> : null}{order.status === 'ORDERED' ? <button type="button" onClick={() => void changeStatus(order, 'RECEIVED')} className="text-emerald-700">Nhập kho</button> : null}{['DRAFT', 'ORDERED'].includes(order.status) ? <button type="button" onClick={() => void changeStatus(order, 'CANCELLED')} className="text-rose-700">Hủy</button> : null}</div></td></tr>)}</tbody></table></div>
    </section>}
    {createOpen ? <Modal title="Tạo phiếu nhập hàng" onClose={() => setCreateOpen(false)} wide><form onSubmit={createOrder} className="space-y-4 text-xs"><div className="grid gap-4 sm:grid-cols-2"><Field label="Nhà cung cấp"><select required className={inputCls} value={supplierId} onChange={(event) => changeSupplier(event.target.value)}>{suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}</select></Field><Field label="Trạng thái ban đầu"><select className={inputCls} value={initialStatus} onChange={(event) => setInitialStatus(event.target.value as typeof initialStatus)}><option value="DRAFT">Nháp / Đề xuất</option><option value="ORDERED">Đã đặt hàng</option></select></Field></div><div className="space-y-2"><div className="flex justify-between font-bold"><span>Nguyên liệu</span><button type="button" className="text-[#a8071f]" disabled={supplierIngredients.length === 0} onClick={() => supplierIngredients[0] && setItems((current) => [...current, itemForIngredient(supplierIngredients[0])])}>+ Thêm dòng</button></div>{items.map((item, index) => <div key={index} className="grid grid-cols-[1fr_100px_120px_32px] gap-2"><select aria-label={`Nguyên liệu ${index + 1}`} className={inputCls} value={item.ingredient} onChange={(event) => { const ingredient = ingredients.find((entry) => entry._id === event.target.value); updateItem(index, { ingredient: event.target.value, unitPrice: ingredient?.latestUnitPrice || 0 }); }}>{supplierIngredients.map((ingredient) => <option key={ingredient._id} value={ingredient._id}>{ingredient.name}</option>)}</select><input aria-label={`Số lượng ${index + 1}`} required min="0.001" step="0.001" type="number" className={inputCls} value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} /><input aria-label={`Đơn giá ${index + 1}`} required min="0" type="number" className={inputCls} value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: Number(event.target.value) })} /><button aria-label="Xóa dòng" type="button" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}</div><Field label="Ghi chú"><textarea maxLength={500} className={inputCls} value={note} onChange={(event) => setNote(event.target.value)} /></Field><div className="text-right font-bold">Tổng tiền: <span className="font-mono text-[#a8071f]">{money(draftTotal)}</span></div><FormActions onCancel={() => setCreateOpen(false)} submitLabel={saving ? 'Đang tạo...' : 'Tạo phiếu nhập'} /></form></Modal> : null}
    {detail ? <Modal title={`Chi tiết ${code(detail._id)}`} onClose={() => setDetail(null)} wide><div className="space-y-4 text-xs"><div className="grid grid-cols-2 gap-3 rounded-xl bg-stone-50 p-4"><div><span className="text-stone-500">Nhà cung cấp</span><p className="font-bold">{detail.supplier?.name}</p></div><div><span className="text-stone-500">Trạng thái</span><p><Badge className={META[detail.status][1]}>{META[detail.status][0]}</Badge></p></div><div><span className="text-stone-500">Người tạo</span><p>{detail.creator.fullName}</p></div><div><span className="text-stone-500">Ngày tạo</span><p>{dateTime(detail.createdAt)}</p></div></div>{detail.items.map((item, index) => <div key={`${item.ingredient?._id}-${index}`} className="flex justify-between border-b p-3"><b>{item.ingredient?.name || 'Nguyên liệu đã xóa'}</b><span className="font-mono">{item.quantity.toLocaleString('vi-VN')} × {money(item.unitPrice)}</span></div>)}<div className="text-right font-bold">Tổng tiền: {money(detail.totalCost)}</div>{detail.note ? <p className="text-stone-500">Ghi chú: {detail.note}</p> : null}<GhostButton className="ml-auto" onClick={() => setDetail(null)}>Đóng</GhostButton></div></Modal> : null}
  </AdminLayout>;
}
