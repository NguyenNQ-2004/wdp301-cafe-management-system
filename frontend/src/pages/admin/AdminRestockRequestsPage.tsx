import { NumberInput } from '../../components/NumberInput';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { PosHeader } from '../../interface/pages/pos/PosHeader';
import { AdminLayout, inputCls } from './AdminUi';
import { shopApi } from '../../lib/shopApi';
import useAuthStore from '../../store/authStore';
type Ingredient = { _id: string; name: string; unit: string; currentStock: number; minStockLevel: number; isActive?: boolean };
type RequestRow = { _id: string; requester?: { fullName: string }; reviewer?: { fullName: string }; status: string; reason: string; note: string; reviewNote?: string; createdAt: string; updatedAt: string; history?: { actor?: { fullName: string }; action: string; at: string; note?: string }[]; items: { ingredient: Ingredient | null; quantity: number; itemNote?: string }[] };
const labels: Record<string, string> = { DRAFT: 'Bản nháp', PENDING_APPROVAL: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', CANCELLED: 'Đã hủy' };
export default function AdminRestockRequestsPage({ cashier = false }: { cashier?: boolean }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState<RequestRow | null>(null);
  const wrap = (children: ReactNode) => cashier ? <><PosHeader currentRoute="pos-restock" onNavigate={route => navigate(({ 'pos-create': '/cashier', 'pos-orders': '/cashier/orders', 'pos-shift': '/cashier/handover?mode=close', 'pos-handover': '/cashier/handover?mode=handover', 'pos-restock': '/cashier/restock-requests' } as Record<string, string>)[route] || '/cashier')} /><main className="mx-auto max-w-6xl p-6"><h1 className="mb-5 text-2xl font-bold">Đề xuất nhập hàng</h1>{children}</main></> : <AdminLayout title="Đề xuất nhập hàng" activePath="/admin/restock-requests" subtitle="Xem lịch sử và xác nhận hoặc từ chối đề xuất của thu ngân." actions={<Link to="/admin/purchases">Phiếu nhập hàng →</Link>}>{children}</AdminLayout>;
  const token = useAuthStore(state => state.user?.token);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredient, setIngredient] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('PENDING_APPROVAL');
  const [filter, setFilter] = useState('ALL');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!token) return;
    let active = true; setLoading(true); setRows([]);
    Promise.all([shopApi<RequestRow[]>('/api/restock-requests', { token }), shopApi<Ingredient[]>('/api/ingredients', { token })])
      .then(([requests, stock]) => { if (active) { setRows(requests); setIngredients(stock.filter(item => item.isActive !== false)); setError(''); } })
      .catch(failure => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, revision]);
  const create = async (event: FormEvent) => {
    event.preventDefault(); if (busy || !token) return;
    setBusy(true); setError('');
    try { await shopApi(`/api/restock-requests${editing ? '/' + editing._id : ''}`, { method: editing ? 'PUT' : 'POST', token, body: { status, reason, note, items: [{ ingredient, quantity }, ...(editing?.items.slice(1).map(item => ({ ingredient: item.ingredient?._id, quantity: item.quantity })) || [])], ...(editing ? { expectedUpdatedAt: editing.updatedAt } : {}) } }); setEditing(null); setQuantity(''); setReason(''); setNote(''); setRevision(value => value + 1); }
    catch (failure) { setError((failure as Error).message); } finally { setBusy(false); }
  };
  const transition = async (id: string, action: string) => {
    if (busy || !token) return; setBusy(true); setError('');
    try { await shopApi(`/api/restock-requests/${id}/transition`, { method: 'POST', token, body: { action, reviewNote: reviewNotes[id] || '' } }); setRevision(value => value + 1); }
    catch (failure) { setError((failure as Error).message); } finally { setBusy(false); }
  };
  const lowStock = ingredients.filter(item => item.currentStock <= item.minStockLevel);
  return wrap(<>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p role="status">Đang tải đề xuất...</p> : <>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Dưới mức tối thiểu', lowStock.length], ['Bản nháp', rows.filter(row => row.status === 'DRAFT').length], ['Chờ duyệt', rows.filter(row => row.status === 'PENDING_APPROVAL').length], ['Đã duyệt', rows.filter(row => row.status === 'APPROVED').length]].map(([label, count]) => <div key={label} className="rounded-xl border border-stone-200 bg-white p-4"><span className="text-xs text-stone-500">{label}</span><strong className="mt-1 block text-2xl text-primary">{count}</strong></div>)}</div>
      <section className="mb-5 rounded-xl border border-stone-200 bg-white p-4"><h2 className="font-bold">Nguyên liệu cần nhập</h2>{lowStock.length ? lowStock.map(item => <div key={item._id} className="flex justify-between gap-3 border-t border-stone-100 py-3 text-sm"><span>{item.name} · tồn {item.currentStock} / tối thiểu {item.minStockLevel} {item.unit}</span>{cashier && <button type="button" onClick={() => { setIngredient(item._id); setQuantity(''); }} className="font-semibold text-primary">Đề xuất nhập</button>}</div>) : <p className="mt-3 text-sm text-stone-500">Tất cả nguyên liệu đang trên mức tối thiểu.</p>}</section>
      {cashier && <form onSubmit={create} className="mb-5 space-y-3 rounded-xl border border-stone-200 bg-white p-4"><h2 className="font-bold">{editing ? "Sửa đề xuất" : "Tạo đề xuất"}</h2><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Nguyên liệu<select required className={inputCls} value={ingredient} onChange={event => setIngredient(event.target.value)}><option value="">Chọn nguyên liệu</option>{ingredients.map(item => <option key={item._id} value={item._id}>{item.name} ({item.unit})</option>)}</select></label><label className="text-xs font-semibold">Số lượng<NumberInput className={inputCls} type="number" min="0.000001" max="1000000000" step="any" required value={quantity} onChange={event => setQuantity(event.target.value === '' ? '' : Number(event.target.value))} /></label><label className="text-xs font-semibold">Lý do<input className={inputCls} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label><label className="text-xs font-semibold">Ghi chú<input className={inputCls} maxLength={500} value={note} onChange={event => setNote(event.target.value)} /></label></div><div className="flex gap-3"><select aria-label="Trạng thái khi tạo" className={inputCls} value={status} onChange={event => setStatus(event.target.value)}><option value="DRAFT">Lưu nháp</option><option value="PENDING_APPROVAL">Gửi duyệt</option></select><button disabled={busy} className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo đề xuất'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setIngredient(''); setReason(''); setNote(''); }}>Bỏ chỉnh sửa</button>}</div></form>}
      <section className="rounded-xl border border-stone-200 bg-white p-4"><div className="mb-3 flex justify-between gap-3"><h2 className="font-bold">{cashier ? "Lịch sử đề xuất của tôi" : "Lịch sử đề xuất"}</h2><select aria-label="Lọc trạng thái" value={filter} onChange={event => setFilter(event.target.value)} className="rounded-lg border border-stone-200 p-2 text-xs"><option value="ALL">Tất cả trạng thái</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        {rows.filter(row => filter === 'ALL' || row.status === filter).map(row => <article key={row._id} className="space-y-2 border-t border-stone-200 py-4 text-sm"><div className="flex justify-between"><strong>#{row._id.slice(-6).toUpperCase()} · {row.requester?.fullName}</strong><span className="font-semibold text-primary">{labels[row.status]}</span></div><p className="text-xs text-stone-500">{new Date(row.createdAt).toLocaleString('vi-VN')}</p>{row.items.map((item, index) => <p key={index}>{item.ingredient?.name || 'Nguyên liệu đã xóa'}: <strong>{item.quantity}</strong> {item.ingredient?.unit}</p>)}{row.reason && <p>Lý do: {row.reason}</p>}{row.note && <p>Ghi chú: {row.note}</p>}{row.reviewer && <p>Xét duyệt: {row.reviewer.fullName} · {row.reviewNote || '—'}</p>}
          {!cashier && row.status === 'PENDING_APPROVAL' && <input aria-label={`Ghi chú xét duyệt ${row._id}`} maxLength={500} className={inputCls} placeholder="Ghi chú xét duyệt" value={reviewNotes[row._id] || ''} onChange={event => setReviewNotes({ ...reviewNotes, [row._id]: event.target.value })} />}
          <div className="flex flex-wrap gap-2">{cashier && ['DRAFT', 'REJECTED'].includes(row.status) && <button type="button" disabled={busy} onClick={() => { setEditing(row); setIngredient(row.items[0]?.ingredient?._id || ''); setQuantity(row.items[0]?.quantity || 1); setReason(row.reason); setNote(row.note); setStatus(row.status === 'DRAFT' ? 'DRAFT' : 'PENDING_APPROVAL'); }} className="rounded-lg border px-3 py-2 text-primary">Sửa đề xuất</button>}{(cashier ? row.status === 'DRAFT' ? [['submit', 'Gửi duyệt'], ['cancel', 'Hủy']] : row.status === 'PENDING_APPROVAL' ? [['cancel', 'Hủy']] : [] : row.status === 'PENDING_APPROVAL' ? [['approve', 'Xác nhận'], ['reject', 'Từ chối']] : []).map(([action, label]) => <button type="button" key={action} disabled={busy} onClick={() => void transition(row._id, action)} className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50">{label}</button>)}</div>
          {!!row.history?.length && <details><summary>Lịch sử xử lý</summary>{row.history.map((entry, index) => <p key={index} className="text-xs text-stone-500">{new Date(entry.at).toLocaleString('vi-VN')} · {entry.actor?.fullName || 'Tài khoản'} · {({ create: 'Tạo đề xuất', edit: 'Sửa', resubmit: 'Sửa và gửi duyệt', submit: 'Gửi duyệt', approve: 'Xác nhận', reject: 'Từ chối', cancel: 'Hủy' } as Record<string, string>)[entry.action] || entry.action}{entry.note ? ' · ' + entry.note : ''}</p>)}</details>}
        </article>)}
        {!rows.some(row => filter === 'ALL' || row.status === filter) && <p className="py-6 text-center text-sm text-stone-500">Chưa có đề xuất trong trạng thái này.</p>}
      </section>
    </>}
  </>);
}
