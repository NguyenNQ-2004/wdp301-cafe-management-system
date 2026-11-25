import { NumberInput } from '../../components/NumberInput';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import CashierWorkHeader from '../../components/CashierWorkHeader';
import { AdminLayout, Badge, Field, GhostButton, PrimaryButton, StatCard, inputCls } from './AdminUi';
import { shopApi } from '../../lib/shopApi';
import useAuthStore from '../../store/authStore';
type Ingredient = { _id: string; name: string; unit: string; currentStock: number; minStockLevel: number; isActive?: boolean };
type RequestRow = { _id: string; requester?: { fullName: string }; reviewer?: { fullName: string }; status: string; reason: string; note: string; reviewNote?: string; createdAt: string; updatedAt: string; history?: { actor?: { fullName: string }; action: string; at: string; note?: string }[]; items: { ingredient: Ingredient | null; quantity: number; itemNote?: string }[] };
const labels: Record<string, string> = { DRAFT: 'Bản nháp', PENDING_APPROVAL: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', CANCELLED: 'Đã hủy' };
// K-DX: AdminRestockRequestsPage — Hiển thị danh sách và thao tác đề xuất theo vai trò.
export default function AdminRestockRequestsPage({ cashier = false }: { cashier?: boolean }) {
  const [editing, setEditing] = useState<RequestRow | null>(null);
  // K-DX: wrap — Chọn bố cục cho thu ngân hoặc quản trị viên.
  const wrap = (children: ReactNode) => cashier
    ? <><CashierWorkHeader currentRoute="pos-restock" /><main className="min-h-screen bg-[#f8f9fa] p-4 sm:p-6"><div className="mx-auto max-w-6xl space-y-5"><div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs"><h1 className="text-xl font-bold text-stone-900 sm:text-2xl">Đề xuất nhập hàng</h1><p className="mt-1 text-xs text-stone-500">Kiểm tra nguyên liệu sắp hết và gửi đề xuất đến quản lý.</p></div>{children}</div></main></>
    : <AdminLayout title="Đề xuất nhập hàng" activePath="/admin/restock-requests" subtitle="Theo dõi nguyên liệu cần nhập và xét duyệt đề xuất của thu ngân." actions={<Link to="/admin/purchases" className="rounded-xl bg-[#800020] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#68001a]">Xem phiếu nhập hàng →</Link>}>{children}</AdminLayout>;
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
  // K-DX: create — Gửi dữ liệu tạo đề xuất nhập hàng.
  const create = async (event: FormEvent) => {
    event.preventDefault(); if (busy || !token) return;
    setBusy(true); setError('');
    try { await shopApi(`/api/restock-requests${editing ? '/' + editing._id : ''}`, { method: editing ? 'PUT' : 'POST', token, body: { status, reason, note, items: [{ ingredient, quantity }, ...(editing?.items.slice(1).map(item => ({ ingredient: item.ingredient?._id, quantity: item.quantity })) || [])], ...(editing ? { expectedUpdatedAt: editing.updatedAt } : {}) } }); setEditing(null); setQuantity(''); setReason(''); setNote(''); setRevision(value => value + 1); }
    catch (failure) { setError((failure as Error).message); } finally { setBusy(false); }
  };
  // K-DX: Gửi, hủy, duyệt và từ chối đề xuất qua cùng API chuyển trạng thái.
  // API kiểm tra quyền, trạng thái hiện tại và quyền sở hữu khi thu ngân thao tác.
  // K-DX: transition — Gửi yêu cầu chuyển trạng thái đề xuất.
  const transition = async (id: string, action: string) => {
    if (busy || !token) return; setBusy(true); setError('');
    try { await shopApi(`/api/restock-requests/${id}/transition`, { method: 'POST', token, body: { action, reviewNote: reviewNotes[id] || '' } }); setRevision(value => value + 1); }
    catch (failure) { setError((failure as Error).message); } finally { setBusy(false); }
  };
  const lowStock = ingredients.filter(item => item.currentStock <= item.minStockLevel);
  const visibleRows = rows.filter(row => filter === 'ALL' || row.status === filter);
  const statusClasses: Record<string, string> = {
    DRAFT: 'bg-stone-100 text-stone-700',
    PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-rose-100 text-rose-700',
    CANCELLED: 'bg-stone-100 text-stone-500',
  };

  return wrap(
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {loading ? (
        <div role="status" className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">Đang tải đề xuất...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <StatCard label="Dưới mức tối thiểu" value={lowStock.length} hint="Nguyên liệu cần bổ sung" tone={lowStock.length ? 'danger' : 'success'} />
            <StatCard label="Bản nháp" value={rows.filter(row => row.status === 'DRAFT').length} hint="Chưa gửi duyệt" />
            <StatCard label="Chờ duyệt" value={rows.filter(row => row.status === 'PENDING_APPROVAL').length} hint="Cần xử lý" tone="warning" />
            <StatCard label="Đã duyệt" value={rows.filter(row => row.status === 'APPROVED').length} hint="Đã xác nhận" tone="success" />
          </div>

          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 p-5">
              <div>
                <h2 className="text-base font-bold text-stone-900">Nguyên liệu cần nhập</h2>
                <p className="mt-1 text-xs text-stone-500">Các nguyên liệu có tồn kho bằng hoặc dưới mức tối thiểu.</p>
              </div>
              <Badge className={lowStock.length ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'}>{lowStock.length} nguyên liệu</Badge>
            </div>
            {lowStock.length ? (
              <div className="grid gap-3 p-4 md:grid-cols-2 lg:p-5">
                {lowStock.map(item => (
                  <div key={item._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/40 p-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900">{item.name}</p>
                      <p className="mt-1 text-xs text-stone-600">Tồn <strong className="text-rose-700">{item.currentStock.toLocaleString('vi-VN')} {item.unit}</strong> · Tối thiểu {item.minStockLevel.toLocaleString('vi-VN')} {item.unit}</p>
                    </div>
                    {cashier && <button type="button" onClick={() => { setIngredient(item._id); setQuantity(''); document.getElementById('restock-request-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-[#800020] transition-colors hover:bg-rose-50">Đề xuất nhập</button>}
                  </div>
                ))}
              </div>
            ) : <p className="px-5 py-7 text-center text-sm text-stone-500">Tất cả nguyên liệu đang trên mức tối thiểu.</p>}
          </section>

          {cashier && (
            <form id="restock-request-form" onSubmit={create} className="scroll-mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
              <div className="border-b border-stone-100 px-5 py-4">
                <h2 className="text-base font-bold text-stone-900">{editing ? 'Sửa đề xuất' : 'Tạo đề xuất nhập hàng'}</h2>
                <p className="mt-1 text-xs text-stone-500">Chọn nguyên liệu và số lượng cần bổ sung để quản lý xét duyệt.</p>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Nguyên liệu">
                  <select required className={inputCls} value={ingredient} onChange={event => setIngredient(event.target.value)}>
                    <option value="">Chọn nguyên liệu</option>
                    {ingredients.map(item => <option key={item._id} value={item._id}>{item.name} ({item.unit})</option>)}
                  </select>
                </Field>
                <Field label="Số lượng cần nhập">
                  <NumberInput className={inputCls} type="number" min="0.000001" max="1000000000" step="any" required value={quantity} onChange={event => setQuantity(event.target.value === '' ? '' : Number(event.target.value))} />
                </Field>
                <Field label="Lý do">
                  <input className={inputCls} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Ví dụ: Sắp dưới mức tối thiểu" />
                </Field>
                <Field label="Ghi chú">
                  <input className={inputCls} maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="Thông tin thêm cho quản lý" />
                </Field>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-3 border-t border-stone-100 bg-stone-50/60 px-5 py-4">
                <Field label="Trạng thái khi lưu" className="w-full min-w-44 sm:w-auto">
                  <select aria-label="Trạng thái khi tạo" className={inputCls} value={status} onChange={event => setStatus(event.target.value)}>
                    <option value="DRAFT">Lưu nháp</option>
                    <option value="PENDING_APPROVAL">Gửi duyệt</option>
                  </select>
                </Field>
                <div className="flex flex-wrap gap-2">
                  {editing && <GhostButton onClick={() => { setEditing(null); setIngredient(''); setReason(''); setNote(''); }}>Bỏ chỉnh sửa</GhostButton>}
                  <PrimaryButton type="submit" disabled={busy}>{busy ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo đề xuất'}</PrimaryButton>
                </div>
              </div>
            </form>
          )}

          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-5">
              <div>
                <h2 className="text-base font-bold text-stone-900">{cashier ? 'Lịch sử đề xuất của tôi' : 'Lịch sử đề xuất'}</h2>
                <p className="mt-1 text-xs text-stone-500">{visibleRows.length} đề xuất trong bộ lọc hiện tại</p>
              </div>
              <select aria-label="Lọc trạng thái" value={filter} onChange={event => setFilter(event.target.value)} className={`${inputCls} w-full sm:w-48`}>
                <option value="ALL">Tất cả trạng thái</option>
                {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            {visibleRows.length ? (
              <div className="divide-y divide-stone-100">
                {visibleRows.map(row => (
                  <article key={row._id} className="space-y-3 p-5 transition-colors hover:bg-stone-50/60">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="font-mono text-sm text-[#800020]">#{row._id.slice(-6).toUpperCase()}</strong>
                          <Badge className={statusClasses[row.status] || statusClasses.DRAFT}>{labels[row.status] || row.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-stone-500">{row.requester?.fullName || 'Tài khoản'} · {new Date(row.createdAt).toLocaleString('vi-VN')}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {row.items.map((item, index) => (
                        <span key={index} className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-700">
                          <strong className="text-stone-900">{item.ingredient?.name || 'Nguyên liệu đã xóa'}</strong> · {item.quantity.toLocaleString('vi-VN')} {item.ingredient?.unit}
                        </span>
                      ))}
                    </div>
                    {(row.reason || row.note || row.reviewer) && (
                      <div className="grid gap-2 rounded-xl bg-stone-50 p-3 text-xs text-stone-600 sm:grid-cols-2">
                        {row.reason && <p><span className="font-bold text-stone-800">Lý do:</span> {row.reason}</p>}
                        {row.note && <p><span className="font-bold text-stone-800">Ghi chú:</span> {row.note}</p>}
                        {row.reviewer && <p className="sm:col-span-2"><span className="font-bold text-stone-800">Xét duyệt:</span> {row.reviewer.fullName} · {row.reviewNote || '—'}</p>}
                      </div>
                    )}
                    {!cashier && row.status === 'PENDING_APPROVAL' && (
                      <input aria-label={`Ghi chú xét duyệt ${row._id}`} maxLength={500} className={inputCls} placeholder="Ghi chú xét duyệt (nếu có)" value={reviewNotes[row._id] || ''} onChange={event => setReviewNotes({ ...reviewNotes, [row._id]: event.target.value })} />
                    )}
                    <div className="flex flex-wrap gap-2">
                      {cashier && ['DRAFT', 'REJECTED'].includes(row.status) && (
                        <GhostButton disabled={busy} onClick={() => { setEditing(row); setIngredient(row.items[0]?.ingredient?._id || ''); setQuantity(row.items[0]?.quantity || 1); setReason(row.reason); setNote(row.note); setStatus(row.status === 'DRAFT' ? 'DRAFT' : 'PENDING_APPROVAL'); document.getElementById('restock-request-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>Sửa đề xuất</GhostButton>
                      )}
                      {(cashier ? row.status === 'DRAFT' ? [['submit', 'Gửi duyệt'], ['cancel', 'Hủy']] : row.status === 'PENDING_APPROVAL' ? [['cancel', 'Hủy']] : [] : row.status === 'PENDING_APPROVAL' ? [['approve', 'Xác nhận'], ['reject', 'Từ chối']] : []).map(([action, label]) => (
                        <button type="button" key={action} disabled={busy} onClick={() => void transition(row._id, action)} className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${action === 'approve' || action === 'submit' ? 'bg-[#800020] text-white hover:bg-[#68001a]' : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100'}`}>{label}</button>
                      ))}
                    </div>
                    {!!row.history?.length && (
                      <details className="rounded-xl border border-stone-100 bg-stone-50/70 px-3 py-2 text-xs text-stone-600">
                        <summary className="cursor-pointer font-semibold text-stone-700">Lịch sử xử lý ({row.history.length})</summary>
                        <div className="mt-3 space-y-2 border-t border-stone-200 pt-3">
                          {row.history.map((entry, index) => <p key={index}>{new Date(entry.at).toLocaleString('vi-VN')} · {entry.actor?.fullName || 'Tài khoản'} · {({ create: 'Tạo đề xuất', edit: 'Sửa', resubmit: 'Sửa và gửi duyệt', submit: 'Gửi duyệt', approve: 'Xác nhận', reject: 'Từ chối', cancel: 'Hủy' } as Record<string, string>)[entry.action] || entry.action}{entry.note ? ' · ' + entry.note : ''}</p>)}
                        </div>
                      </details>
                    )}
                  </article>
                ))}
              </div>
            ) : <p className="px-5 py-10 text-center text-sm text-stone-500">Chưa có đề xuất trong trạng thái này.</p>}
          </section>
        </>
      )}
    </div>
  );
}
