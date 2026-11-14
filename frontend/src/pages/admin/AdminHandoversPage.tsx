import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AdminLayout, inputCls } from './AdminUi';
import { formatVnd, shopApi } from '../../lib/shopApi';
import useAuthStore from '../../store/authStore';

interface ShiftInfo {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface Handover {
  _id: string;
  user: { _id: string; fullName: string; phone: string } | null;
  workDate: string;
  shiftName: string;
  shiftInfo?: ShiftInfo;
  handoverAt?: string;
  startingCash?: number;
  endingCashSystem?: number;
  endingCashActual?: number;
  handoverCashSales?: number;
  handoverNote?: string;
  handoverStatus?: 'SUBMITTED' | 'CONFIRMED' | 'REJECTED';
  reviewerNote?: string;
  reviewedBy?: { fullName: string; phone: string };
  resubmittedAt?: string;
}

const initialRange = () => {
  const now = new Date(Date.now() + 7 * 3600000);
  const from = new Date(now);
  from.setUTCDate(now.getUTCDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
};

const shiftLabel = (name: string) => ({ MORNING: 'Ca sáng', AFTERNOON: 'Ca chiều', EVENING: 'Ca tối' })[name] || name || 'Ca làm';
const time = (value?: string) => {
  if (!value) return '—';
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return '—';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(ms));
};

export default function AdminHandoversPage() {
  const token = useAuthStore(state => state.user?.token);
  const [draft, setDraft] = useState(initialRange);
  const [range, setRange] = useState(initialRange);
  const [rows, setRows] = useState<Handover[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  // Review modal state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    setError('');
    shopApi<Handover[]>(`/api/shift-handovers?from=${range.from}&to=${range.to}`, { token })
      .then(data => { if (active) setRows(Array.isArray(data) ? data.filter(row => row && row.handoverAt) : []); })
      .catch(err => { if (active) { setRows([]); setError(err.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, range, revision]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const days = (Date.parse(draft.to) - Date.parse(draft.from)) / 86400000;
    if (!Number.isFinite(days) || days < 0 || days > 30) { setError('Chọn khoảng từ 1 đến 31 ngày.'); return; }
    setRange({ ...draft });
    setRevision(value => value + 1);
  };

  const handleConfirm = async (id: string) => {
    if (!token || reviewing) return;
    setReviewing(true);
    try {
      await shopApi(`/api/shift-handovers/${id}/review`, {
        method: 'POST',
        token,
        body: { action: 'CONFIRM' }
      });
      setRevision(v => v + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setReviewing(false);
    }
  };

  const handleRejectSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !rejectingId || !rejectReason.trim() || reviewing) return;
    setReviewing(true);
    try {
      await shopApi(`/api/shift-handovers/${rejectingId}/review`, {
        method: 'POST',
        token,
        body: { action: 'REJECT', reviewerNote: rejectReason.trim() }
      });
      setRejectingId(null);
      setRejectReason('');
      setRevision(v => v + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setReviewing(false);
    }
  };

  const visible = rows.filter(row =>
    `${row.user?.fullName || ''} ${row.user?.phone || ''}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi').trim())
  );

  return (
    <AdminLayout title="Biên bản bàn giao ca" subtitle="Kiểm tra, duyệt hoặc yêu cầu giải trình biên bản bàn giao ca của nhân viên thu ngân." activePath="/admin/handovers">
      <form onSubmit={submit} className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-4">
        <label className="text-xs font-semibold">Từ ngày<input className={inputCls} type="date" required value={draft.from} onChange={event => setDraft({ ...draft, from: event.target.value })} /></label>
        <label className="text-xs font-semibold">Đến ngày<input className={inputCls} type="date" required value={draft.to} onChange={event => setDraft({ ...draft, to: event.target.value })} /></label>
        <button className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">Xem lịch sử</button>
        <label className="min-w-52 flex-1 text-xs font-semibold">Thu ngân<input className={inputCls} placeholder="Tên hoặc số điện thoại" value={search} onChange={event => setSearch(event.target.value)} /></label>
      </form>

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}

      <section aria-label="Lịch sử biên bản bàn giao" className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        {loading ? (
          <p role="status" className="p-8 text-center text-stone-500">Đang tải biên bản...</p>
        ) : visible.length === 0 ? (
          <p className="p-10 text-center text-stone-500">Chưa có biên bản bàn giao trong khoảng ngày đã chọn.</p>
        ) : (
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="bg-stone-50 text-left text-xs text-stone-500">
              <tr>
                {['Ca làm', 'Thu ngân', 'Đầu ca', 'Thu tiền mặt', 'Hệ thống', 'Thực tế', 'Chênh lệch', 'Ghi chú', 'Trạng thái', 'Thao tác'].map(label => (
                  <th key={label} className="px-4 py-3">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(row => {
                const difference = (row.endingCashActual ?? 0) - (row.endingCashSystem ?? 0);
                const status = row.handoverStatus || 'SUBMITTED';
                const workDay = (row.workDate || '').slice(0, 10);
                const shiftTitle = row.shiftInfo?.name || shiftLabel(row.shiftName);
                const shiftHours = row.shiftInfo?.startTime && row.shiftInfo?.endTime ? ` (${row.shiftInfo.startTime}–${row.shiftInfo.endTime})` : '';
                return (
                  <tr key={row._id} className="border-t border-stone-100">
                    <td className="px-4 py-4">
                      <strong>{shiftTitle}{shiftHours} · {workDay ? workDay.split('-').reverse().join('/') : '—'}</strong>
                      <small className="mt-1 block text-stone-500">Chốt {time(row.handoverAt)}</small>
                      {row.resubmittedAt && <small className="block text-amber-600 font-medium">Đã gửi lại {time(row.resubmittedAt)}</small>}
                    </td>
                    <td className="px-4 py-4">{row.user?.fullName || 'Nhân viên đã xóa'}<small className="block text-stone-500">{row.user?.phone}</small></td>
                    {[row.startingCash, row.handoverCashSales, row.endingCashSystem, row.endingCashActual].map((value, index) => (
                      <td key={index} className="px-4 py-4 text-right tabular-nums">{value == null ? '—' : formatVnd(value)}</td>
                    ))}
                    <td className={`px-4 py-4 font-semibold ${difference < 0 ? 'text-red-700' : difference > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {difference === 0 ? 'Khớp' : `${difference > 0 ? 'Thừa +' : 'Thiếu '}${formatVnd(Math.abs(difference))}`}
                    </td>
                    <td className="max-w-64 whitespace-normal break-words px-4 py-4">
                      <div>{row.handoverNote || '—'}</div>
                      {row.reviewerNote && (
                        <div className="mt-1 rounded bg-stone-100 p-1.5 text-xs text-stone-700">
                          <strong>Admin:</strong> {row.reviewerNote}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {status === 'CONFIRMED' ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Đã duyệt</span>
                      ) : status === 'REJECTED' ? (
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Đã từ chối</span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Chờ duyệt</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {status === 'SUBMITTED' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={reviewing}
                            onClick={() => handleConfirm(row._id)}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Duyệt
                          </button>
                          <button
                            type="button"
                            disabled={reviewing}
                            onClick={() => { setRejectingId(row._id); setRejectReason(''); }}
                            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-stone-400">Hoàn tất</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      <p className="mt-4 text-xs text-stone-500">Chênh lệch = Thực tế − (Đầu ca + Thu tiền mặt).</p>

      {/* Rejection Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleRejectSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-800">Từ chối biên bản bàn giao</h3>
            <p className="mt-1 text-xs text-slate-500">Vui lòng nhập lý do từ chối để nhân viên thu ngân kiểm tra lại và giải trình bổ sung.</p>
            <textarea
              required
              rows={4}
              maxLength={500}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối biên bản (bắt buộc)..."
              className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-red-500 focus:outline-none"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={reviewing}
                onClick={() => setRejectingId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={reviewing || !rejectReason.trim()}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {reviewing ? 'Đang lưu...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}
