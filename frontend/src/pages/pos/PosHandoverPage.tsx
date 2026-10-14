import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatVnd, shopApi } from '../../lib/shopApi';
import useAuthStore from '../../store/authStore';
import './PosHandoverPage.css';

interface Cashier { _id: string; fullName: string; phone: string; position: string }
interface ShiftRecord {
  _id: string;
  user: Cashier;
  workDate: string;
  shiftName: 'MORNING' | 'AFTERNOON' | 'EVENING';
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
  handoverAt?: string;
}
interface HandoverDetail {
  schedule: ShiftRecord;
  ready: boolean;
  handedOver: boolean;
  handoverAt: string | null;
  openingCash: number | null;
  cashRevenue: number;
  paymentCount: number;
  unattributedCash: number;
  unattributedCount: number;
  expectedCash: number | null;
  actualCash: number | null;
  difference: number | null;
  note: string;
}
const labels = { MORNING: 'Ca sáng', AFTERNOON: 'Ca chiều', EVENING: 'Ca tối' };
const vnToday = () => new Date(Date.now() + 7 * 3600000);
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const initialRange = () => {
  const end = vnToday();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 14);
  return { from: dateKey(start), to: dateKey(end) };
};
const displayDay = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
const displayTime = (iso?: string | null) => iso
  ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
  : '—';
const validMoney = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value));

export default function PosHandoverPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const token = user?.token;
  const canConfirm = user?.role === 'STAFF' && ['CASHIER', 'MANAGER'].includes(user.position || '');
  const [draft, setDraft] = useState(initialRange);
  const [range, setRange] = useState(initialRange);
  const [reloadKey, setReloadKey] = useState(0);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<HandoverDetail | null>(null);
  const [actualCash, setActualCash] = useState('');
  const [openingCash, setOpeningCash] = useState('0');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    shopApi<ShiftRecord[]>(`/api/shift-handovers?from=${range.from}&to=${range.to}`, { token })
      .then((rows) => {
        if (!active) return;
        setShifts(rows);
        setSelectedId((current) => rows.some((row) => row._id === current) ? current : rows[0]?._id || null);
        setError('');
      })
      .catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, range, reloadKey]);

  useEffect(() => {
    if (!token || !selectedId) { setDetail(null); return; }
    let active = true;
    setLoadingDetail(true);
    setDetail(null);
    shopApi<HandoverDetail>(`/api/shift-handovers/${selectedId}`, { token })
      .then((value) => {
        if (!active) return;
        setDetail(value);
        setActualCash(value.actualCash === null ? '' : String(value.actualCash));
        setOpeningCash(value.openingCash === null ? '0' : String(value.openingCash));
        setNote(value.note);
        setError('');
      })
      .catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoadingDetail(false); });
    return () => { active = false; };
  }, [token, selectedId, reloadKey]);

  const applyRange = (event: FormEvent) => {
    event.preventDefault();
    const days = (Date.parse(`${draft.to}T00:00:00Z`) - Date.parse(`${draft.from}T00:00:00Z`)) / 86400000;
    if (!Number.isFinite(days) || days < 0 || days > 30) { setError('Chọn tối đa 31 ngày hợp lệ.'); return; }
    setError('');
    setRange({ ...draft });
  };
  const confirm = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !detail?.ready || !selectedId || busy || !canConfirm) return;
    if (!validMoney(actualCash) || (detail.openingCash === null && !validMoney(openingCash))) {
      setError('Tiền đầu ca và tiền thực tế phải là số nguyên không âm.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const saved = await shopApi<HandoverDetail>(`/api/shift-handovers/${selectedId}/confirm`, {
        method: 'POST', token,
        body: { actualCash: Number(actualCash), ...(detail.openingCash === null ? { openingCash: Number(openingCash) } : {}), note: note.trim() }
      });
      setDetail(saved);
      setNotice('Đã lưu biên bản bàn giao. Bạn có thể in phiếu K80.');
      setReloadKey((key) => key + 1);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  const expectedPreview = detail?.expectedCash ?? (detail?.openingCash === null && validMoney(openingCash) ? Number(openingCash) + detail.cashRevenue : null);
  const differencePreview = expectedPreview !== null && validMoney(actualCash) ? Number(actualCash) - expectedPreview : null;

  return <div className="min-h-[calc(100vh-5rem)] bg-[#fafafa] px-4 py-8 md:px-6">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><button onClick={() => navigate(user?.role === 'ADMIN' ? '/admin' : '/cashier')} className="text-sm font-semibold text-primary">← Quay lại</button><h1 className="mt-3 text-3xl font-bold text-slate-950">Bàn giao ca thu ngân</h1><p className="mt-2 text-sm text-slate-600">Đối chiếu tiền trong két sau khi đã check-out. Giao dịch tính theo người xác nhận thu tiền tại quầy.</p></div>
        <button onClick={() => setReloadKey((key) => key + 1)} className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-primary">Làm mới</button>
      </div>
      <form onSubmit={applyRange} className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-blue-100 bg-white p-4">
        <label className="text-xs font-semibold text-slate-700">Từ ngày<input type="date" required value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} className="mt-1 block rounded-lg border border-blue-100 p-2" /></label>
        <label className="text-xs font-semibold text-slate-700">Đến ngày<input type="date" required value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} className="mt-1 block rounded-lg border border-blue-100 p-2" /></label>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Xem ca</button>
      </form>
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}

      <div className="mt-6 grid gap-5 lg:grid-cols-[310px_1fr]">
        <aside className="rounded-xl border border-blue-100 bg-white p-4">
          <h2 className="text-lg font-bold">Ca làm trong kỳ</h2>
          {loading && <p className="mt-4 text-sm text-slate-500">Đang tải...</p>}
          {!loading && shifts.length === 0 && <p className="mt-4 text-sm text-slate-500">Không có ca thu ngân trong khoảng ngày này.</p>}
          <div className="mt-4 space-y-2">{shifts.map((shift) => <button key={shift._id} type="button" onClick={() => { setSelectedId(shift._id); setNotice(''); }} className={`block w-full rounded-xl border p-3 text-left text-sm ${selectedId === shift._id ? 'border-primary bg-red-50' : 'border-blue-100 hover:bg-slate-50'}`}>
            <strong className="block">{displayDay(shift.workDate)} · {labels[shift.shiftName]}</strong>
            {user?.role === 'ADMIN' && <span className="mt-1 block text-xs text-slate-600">{shift.user?.fullName || 'Nhân viên đã xóa'}</span>}
            <span className="mt-1 block text-xs text-slate-500">{shift.handoverAt ? 'Đã bàn giao' : shift.status === 'COMPLETED' ? 'Chờ bàn giao' : 'Chưa check-out'}</span>
          </button>)}</div>
        </aside>

        <main className="space-y-5">
          {loadingDetail && <p className="rounded-xl border border-blue-100 bg-white p-5 text-sm text-slate-600">Đang tải chi tiết ca...</p>}
          {!loadingDetail && selectedId && detail && <>
            <section className="rounded-xl border border-blue-100 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-xl font-bold">{labels[detail.schedule.shiftName]} · {displayDay(detail.schedule.workDate)}</h2><p className="mt-1 text-sm text-slate-600">{detail.schedule.user?.fullName} · {detail.schedule.user?.phone}</p></div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${detail.handedOver ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{detail.handedOver ? 'Đã bàn giao' : 'Chưa bàn giao'}</span>
              </div>
              <p className="mt-3 text-xs text-slate-500">Vào ca: {displayTime(detail.schedule.checkInTime)} · Ra ca: {displayTime(detail.schedule.checkOutTime)}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Tiền đầu ca</span><strong className="mt-1 block">{detail.openingCash === null ? 'Chưa ghi nhận' : formatVnd(detail.openingCash)}</strong></div>
                <div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Tiền mặt bán hàng ({detail.paymentCount})</span><strong className="mt-1 block">{formatVnd(detail.cashRevenue)}</strong></div>
                <div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Tiền hệ thống</span><strong className="mt-1 block">{expectedPreview === null ? '—' : formatVnd(expectedPreview)}</strong></div>
                <div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Chênh lệch</span><strong className={`mt-1 block ${differencePreview !== null && differencePreview !== 0 ? 'text-red-700' : 'text-emerald-700'}`}>{differencePreview === null ? '—' : formatVnd(differencePreview)}</strong></div>
              </div>
              {detail.unattributedCount > 0 && <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{detail.unattributedCount} giao dịch tiền mặt ({formatVnd(detail.unattributedCash)}) chưa ghi người thu tiền trong khoảng ca; chưa tính vào doanh thu ca. Cần kiểm tra thủ công nếu két có chênh lệch.</p>}
            </section>

            {!detail.handedOver && !detail.ready && <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Cần check-in và check-out ca này trước khi bàn giao. {canConfirm && <button onClick={() => navigate('/my-attendance')} className="ml-1 font-bold underline">Mở chấm công</button>}</div>}
            {detail.ready && canConfirm && <form onSubmit={confirm} className="rounded-xl border border-blue-100 bg-white p-5">
              <h3 className="text-lg font-bold">Kiểm đếm tiền trong két</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {detail.openingCash === null && <label className="text-sm font-semibold">Tiền đầu ca (đ)<input type="number" min="0" step="1" required value={openingCash} onChange={(event) => setOpeningCash(event.target.value)} className="mt-1 block w-full rounded-lg border border-blue-100 p-2.5" /></label>}
                <label className="text-sm font-semibold">Tiền thực tế cuối ca (đ)<input type="number" min="0" step="1" required value={actualCash} onChange={(event) => setActualCash(event.target.value)} className="mt-1 block w-full rounded-lg border border-blue-100 p-2.5" /></label>
              </div>
              <label className="mt-4 block text-sm font-semibold">Ghi chú chênh lệch<textarea maxLength={500} rows={3} required={differencePreview !== null && differencePreview !== 0} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi lý do nếu số tiền thực tế khác hệ thống" className="mt-1 block w-full rounded-lg border border-blue-100 p-2.5" /></label>
              <button disabled={busy} className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Đang lưu...' : 'Xác nhận bàn giao'}</button>
            </form>}

            {detail.handedOver && <div className="rounded-xl border border-blue-100 bg-white p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">Phiếu bàn giao K80</h3><button onClick={() => window.print()} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">In phiếu K80</button></div>
              <div id="handover-print" className="mx-auto w-[76mm] border border-dashed border-stone-300 bg-white p-3 text-[11px] text-black">
                <div className="text-center"><strong className="block text-sm">AURA CAFÉ</strong><span>BIÊN BẢN BÀN GIAO CA</span><span className="mt-1 block">#{String(detail.schedule._id).slice(-8).toUpperCase()}</span></div>
                <div className="my-3 border-t border-dashed border-black" />
                <div>Ca: {labels[detail.schedule.shiftName]} · {displayDay(detail.schedule.workDate)}</div>
                <div>Thu ngân: {detail.schedule.user?.fullName}</div>
                <div>Giờ vào: {displayTime(detail.schedule.checkInTime)}</div>
                <div>Giờ ra: {displayTime(detail.schedule.checkOutTime)}</div>
                <div>Lập phiếu: {displayTime(detail.handoverAt)}</div>
                <div className="my-3 border-t border-dashed border-black" />
                <div className="flex justify-between"><span>Tiền đầu ca</span><strong>{formatVnd(detail.openingCash || 0)}</strong></div>
                <div className="flex justify-between"><span>Thu tiền mặt ({detail.paymentCount})</span><strong>{formatVnd(detail.cashRevenue)}</strong></div>
                <div className="flex justify-between"><span>Theo hệ thống</span><strong>{formatVnd(detail.expectedCash || 0)}</strong></div>
                <div className="flex justify-between"><span>Thực tế trong két</span><strong>{formatVnd(detail.actualCash || 0)}</strong></div>
                <div className="mt-1 flex justify-between border-t border-dashed border-black pt-1"><span>Chênh lệch</span><strong>{formatVnd(detail.difference || 0)}</strong></div>
                {detail.unattributedCount > 0 && <p className="mt-2">Chưa gán người thu: {detail.unattributedCount} giao dịch · {formatVnd(detail.unattributedCash)}</p>}
                {detail.note && <p className="mt-2 break-words">Ghi chú: {detail.note}</p>}
                <div className="mt-7 grid grid-cols-2 gap-2 text-center"><span>Người bàn giao<br />(ký tên)</span><span>Người nhận ca<br />(ký tên)</span></div>
              </div>
            </div>}
          </>}
        </main>
      </div>
    </div>
  </div>;
}
