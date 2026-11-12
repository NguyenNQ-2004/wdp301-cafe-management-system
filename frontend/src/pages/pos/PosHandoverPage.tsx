import CashierWorkHeader from '../../components/CashierWorkHeader';
import { NumberInput } from '../../components/NumberInput';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatVnd, shopApi } from '../../lib/shopApi';
import useAuthStore from '../../store/authStore';
import './PosHandoverPage.css';

interface Cashier { _id: string; fullName: string; phone: string; position: string }
interface CodRemittance { _id: string; user: Cashier; endingCashSystem: number; endingCashActual: number; checkOutTime?: string; note?: string }
interface ShiftInfo { code: string; name: string; startTime: string; endTime: string }
interface ShiftRecord {
  _id: string;
  user: Cashier;
  workDate: string;
  shiftName: string;
  shiftInfo?: ShiftInfo;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
  handoverAt?: string;
}
interface PaymentMethodSummary {
  count: number;
  sales: number;
}
interface HandoverSummary {
  cashSales: number;
  codReceipts?: number;
  paymentCount: number;
  nonCashSales: number;
  totalSales: number;
  successfulOrderCount: number;
  methods: {
    CASH: PaymentMethodSummary;
    BANK_TRANSFER: PaymentMethodSummary;
    VNPAY: PaymentMethodSummary;
    MOMO: PaymentMethodSummary;
  };
}
interface HandoverDetail {
  schedule: ShiftRecord;
  ready: boolean;
  handedOver: boolean;
  handoverAt: string | null;
  status?: 'SUBMITTED' | 'CONFIRMED' | 'REJECTED' | null;
  handoverId?: string | null;
  reviewedBy?: { fullName: string; phone: string } | null;
  reviewedAt?: string | null;
  reviewerNote?: string | null;
  resubmittedAt?: string | null;
  openingCash: number | null;
  cashRevenue: number;
  cashRefunds?: number;
  codReceipts: number;
  paymentCount: number;
  unattributedCash: number;
  unattributedCount: number;
  expectedCash: number | null;
  actualCash: number | null;
  difference: number | null;
  note: string;
  summary?: HandoverSummary;
}

const labels: Record<string, string> = { MORNING: 'Ca sáng', AFTERNOON: 'Ca chiều', EVENING: 'Ca tối' };
const shiftTimes: Record<string, string> = { MORNING: '06:30 – 12:30', AFTERNOON: '12:30 – 17:30', EVENING: '17:30 – 22:30' };
const vnToday = () => new Date(Date.now() + 7 * 3600000);
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const initialRange = () => {
  const end = vnToday();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 14);
  return { from: dateKey(start), to: dateKey(end) };
};
const displayDay = (iso?: string) => iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';
const displayTime = (iso?: string | null) => {
  if (!iso) return '—';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '—';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms));
};
const formatShiftTitle = (shiftName: string, shiftInfo?: ShiftInfo) => shiftInfo?.name || labels[shiftName] || shiftName;
const formatShiftHours = (shiftName: string, shiftInfo?: ShiftInfo) =>
  shiftInfo?.startTime && shiftInfo?.endTime
    ? `${shiftInfo.startTime} – ${shiftInfo.endTime}`
    : shiftTimes[shiftName] || '';
const validMoney = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value));

export default function PosHandoverPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawMode = searchParams.get('mode');
  const currentMode = rawMode === 'handover' ? 'handover' : 'close';

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
  const [resubmitCash, setResubmitCash] = useState('');
  const [resubmitNote, setResubmitNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingCod, setPendingCod] = useState<CodRemittance[]>([]);
  const [codCash, setCodCash] = useState<Record<string, string>>({});
  const [codNote, setCodNote] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token || !canConfirm) return;
    let active = true;
    shopApi<CodRemittance[]>('/api/work-schedules/cod-remittances', { token })
      .then(rows => { if (active) setPendingCod(rows); })
      .catch((err: Error) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [token, canConfirm, reloadKey]);

  const receiveCod = async (row: CodRemittance) => {
    const amount = codCash[row._id] ?? String(row.endingCashActual);
    if (!token || busy || !validMoney(amount)) { setError('Nhập số tiền COD thực nhận hợp lệ.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await shopApi(`/api/work-schedules/${row._id}/confirm-cod`, { method: 'POST', token, body: { cash: Number(amount), note: codNote[row._id]?.trim() || '' } });
      setNotice(`Đã xác nhận nhận ${formatVnd(Number(amount))} COD từ ${row.user?.fullName || 'shipper'}.`);
      setReloadKey(key => key + 1);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    shopApi<ShiftRecord[]>(`/api/shift-handovers?from=${range.from}&to=${range.to}`, { token })
      .then((raw) => {
        if (!active) return;
        const rows = Array.isArray(raw) ? raw : [];
        setShifts(rows);
        const queryScheduleId = searchParams.get('scheduleId');
        if (queryScheduleId && rows.some((row) => row._id === queryScheduleId)) {
          setSelectedId(queryScheduleId);
        } else {
          setSelectedId((current) => rows.some((row) => row._id === current) ? current : rows[0]?._id || null);
        }
        setError('');
      })
      .catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, range, reloadKey, searchParams]);

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
      setNotice('Đã chốt két và hoàn tất bàn giao ca.');
      setSearchParams({ mode: 'handover', scheduleId: selectedId });
      setReloadKey((key) => key + 1);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  const handleResubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !selectedId || !resubmitNote.trim() || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await shopApi(`/api/shift-handovers/${selectedId}/resubmit`, {
        method: 'POST',
        token,
        body: {
          note: resubmitNote.trim(),
          ...(resubmitCash.trim() && validMoney(resubmitCash) ? { actualCash: Number(resubmitCash) } : {})
        }
      });
      setNotice('Đã gửi lại biên bản giải trình cho Admin.');
      setResubmitNote('');
      setResubmitCash('');
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const expectedPreview = detail?.expectedCash ?? (detail?.openingCash === null && validMoney(openingCash) ? Number(openingCash) + detail.cashRevenue + detail.codReceipts - (detail.cashRefunds || 0) : null);
  const differencePreview = expectedPreview !== null && validMoney(actualCash) ? Number(actualCash) - expectedPreview : null;
  const isDiff = differencePreview !== null && differencePreview !== 0;

  // Breakdown numbers from detail.summary or fallback to cashRevenue
  const cashSales = detail?.summary?.cashSales ?? detail?.cashRevenue ?? 0;
  const nonCashSales = detail?.summary?.nonCashSales ?? 0;
  const totalSales = detail?.summary?.totalSales ?? (cashSales + nonCashSales);
  const orderCount = detail?.summary?.successfulOrderCount ?? detail?.paymentCount ?? 0;
  const methods = detail?.summary?.methods ?? {
    CASH: { count: detail?.paymentCount ?? 0, sales: cashSales },
    BANK_TRANSFER: { count: 0, sales: 0 },
    VNPAY: { count: 0, sales: 0 },
    MOMO: { count: 0, sales: 0 }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#f8fafc] text-slate-800">
      <CashierWorkHeader currentRoute={currentMode === 'close' ? 'pos-shift' : 'pos-handover'} onNavigate={route => {
        if (route === 'pos-shift' || route === 'pos-handover') setSearchParams({ mode: route === 'pos-shift' ? 'close' : 'handover', ...(selectedId ? { scheduleId: selectedId } : {}) });
        else navigate(route === 'pos-orders' ? '/cashier/orders' : route === 'pos-restock' ? '/cashier/restock-requests' : '/cashier');
      }} />

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 space-y-6">
        <div className="flex justify-end"><button type="button" onClick={() => setReloadKey(key => key + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">↻ Làm mới dữ liệu</button></div>
        {/* Flash Notifications */}
        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            <span className="material-symbols-outlined text-red-600">error</span>
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            <span>{notice}</span>
          </div>
        )}

        {canConfirm && pendingCod.length > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <h2 className="font-bold text-amber-950">COD shipper chờ thu ngân nhận ({pendingCod.length})</h2>
            <p className="text-xs text-amber-900">Kiểm đếm tiền thực nhận trước khi xác nhận. Khoản này sẽ vào két của ca thu ngân hiện tại.</p>
            {pendingCod.map(row => (
              <div key={row._id} className="grid gap-2 rounded-lg bg-white p-3 text-sm md:grid-cols-[1fr_130px_1fr_auto] md:items-end">
                <div><strong>{row.user?.fullName || 'Shipper'}</strong><div className="text-xs text-slate-600">Hệ thống: {formatVnd(row.endingCashSystem)} · Shipper khai nộp: {formatVnd(row.endingCashActual)}</div></div>
                <label className="text-xs font-semibold">Thực nhận<NumberInput className="mt-1 w-full rounded border p-2" type="number" min="0" step="1" value={codCash[row._id] ?? String(row.endingCashActual)} onChange={event => setCodCash({ ...codCash, [row._id]: event.target.value })} /></label>
                <label className="text-xs font-semibold">Ghi chú chênh lệch<input className="mt-1 w-full rounded border p-2" maxLength={500} value={codNote[row._id] ?? ''} onChange={event => setCodNote({ ...codNote, [row._id]: event.target.value })} /></label>
                <button type="button" disabled={busy} onClick={() => void receiveCod(row)} className="rounded bg-primary px-3 py-2 font-bold text-white disabled:opacity-50">Xác nhận nhận COD</button>
              </div>
            ))}
          </section>
        )}

        {/* Top Shift Info Banner Matching SWP Shift Banner Card */}
        {detail && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-primary border border-red-100">
                <span className="material-symbols-outlined text-[24px]">calendar_today</span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {formatShiftTitle(detail.schedule.shiftName, detail.schedule.shiftInfo)}
                    {formatShiftHours(detail.schedule.shiftName, detail.schedule.shiftInfo) && ` (${formatShiftHours(detail.schedule.shiftName, detail.schedule.shiftInfo)})`}
                  </h2>
                  <span className={`rounded-md px-2.5 py-0.5 text-xs font-bold ${
                    detail.handedOver
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : detail.ready
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {detail.handedOver ? 'Đã bàn giao' : detail.ready ? 'Chờ bàn giao' : 'Đang làm việc'}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    Lịch #{String(detail.schedule._id).slice(-6).toUpperCase()}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Ngày: {displayDay(detail.schedule.workDate)}</span>
                  <span>•</span>
                  <span>Vào ca: {displayTime(detail.schedule.checkInTime)}</span>
                  {detail.schedule.checkOutTime && (
                    <>
                      <span>•</span>
                      <span>Ra ca: {displayTime(detail.schedule.checkOutTime)}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{detail.schedule.user?.fullName || 'Thu ngân'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 divide-x divide-slate-100">
              <div className="text-right">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">DOANH THU TIỀN MẶT</div>
                <div className="mt-0.5 text-xl font-extrabold text-emerald-700">{formatVnd(detail.cashRevenue)}</div>
              </div>
              <div className="pl-6 text-right">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">GIAO DỊCH TRONG CA</div>
                <div className="mt-0.5 text-xl font-extrabold text-slate-900">{orderCount} đơn</div>
              </div>
            </div>
          </div>
        )}

        {/* Date Filter Bar */}
        <form onSubmit={applyRange} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <label className="text-xs font-bold text-slate-700">
            Từ ngày
            <input type="date" required value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} className="mt-1 block rounded-lg border border-slate-200 p-2 text-xs font-medium" />
          </label>
          <label className="text-xs font-bold text-slate-700">
            Đến ngày
            <input type="date" required value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} className="mt-1 block rounded-lg border border-slate-200 p-2 text-xs font-medium" />
          </label>
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-red-800 transition-colors">
            Lọc ca làm
          </button>
        </form>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Shift Sidebar */}
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs self-start">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 mb-3">Danh sách ca trong kỳ</h3>
            {loading && <p className="text-xs text-slate-500 py-3">Đang tải danh sách ca...</p>}
            {!loading && shifts.length === 0 && (
              <p className="text-xs text-slate-500 py-3">Không có ca thu ngân nào trong khoảng ngày này.</p>
            )}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {shifts.map((shift) => (
                <button
                  key={shift._id}
                  type="button"
                  onClick={() => {
                    setSelectedId(shift._id);
                    setSearchParams({ mode: currentMode, scheduleId: shift._id });
                    setNotice('');
                  }}
                  className={`block w-full rounded-xl border p-3 text-left transition-all ${
                    selectedId === shift._id
                      ? 'border-primary bg-red-50/70 shadow-xs'
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-sm font-bold text-slate-900">{formatShiftTitle(shift.shiftName, shift.shiftInfo)}</strong>
                    <span className="text-xs text-slate-500">{displayDay(shift.workDate)}</span>
                  </div>
                  {user?.role === 'ADMIN' && (
                    <span className="mt-1 block text-xs font-medium text-slate-600">{shift.user?.fullName}</span>
                  )}
                  <span className={`mt-1.5 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    shift.handoverAt
                      ? 'bg-emerald-50 text-emerald-700'
                      : shift.status === 'COMPLETED'
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {shift.handoverAt ? 'Đã bàn giao' : shift.status === 'COMPLETED' ? 'Chờ bàn giao' : 'Đang làm việc'}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {/* Main Area: Switch based on currentMode */}
          <main className="space-y-6">
            {loadingDetail && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Đang tải thông tin chi tiết ca...
              </div>
            )}

            {/* ========================================================
                 BRANCH 1: MÀN CHỐT CA (currentMode === 'close')
                 ======================================================== */}
            {!loadingDetail && currentMode === 'close' && (
              <>
                {!selectedId || !detail ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                    <span className="material-symbols-outlined text-[48px] text-slate-300">event_busy</span>
                    <h3 className="mt-3 text-lg font-bold text-slate-800">Không có ca nào đang chọn để chốt két</h3>
                    <p className="mt-1 text-sm text-slate-500">Hãy chọn một ca từ danh sách bên trái để thực hiện kiểm đếm và chốt ca.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* LEFT COLUMN: DOANH THU & TIỀN MẶT HỆ THỐNG */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span className="material-symbols-outlined text-primary text-[22px]">payments</span>
                        <h3 className="text-base font-extrabold text-slate-900">Doanh thu theo phương thức thanh toán</h3>
                      </div>

                      {/* Big Highlight Revenue Banner */}
                      <div className="rounded-xl bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 p-5 text-center">
                        <div className="text-xs font-bold uppercase tracking-wider text-primary">TỔNG DOANH THU ĐÃ THU</div>
                        <div className="mt-1 text-3xl font-black text-primary">{formatVnd(totalSales)}</div>
                      </div>

                      {/* Payment Breakdown Table */}
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                            <th className="py-2.5 text-left">PHƯƠNG THỨC</th>
                            <th className="py-2.5 text-center">SỐ GIAO DỊCH</th>
                            <th className="py-2.5 text-right">SỐ TIỀN</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="py-3 flex items-center gap-2 font-semibold text-slate-700">
                              <span className="material-symbols-outlined text-emerald-600 text-[18px]">payments</span>
                              <span>Tiền mặt</span>
                            </td>
                            <td className="py-3 text-center font-bold text-slate-600">{methods.CASH.count}</td>
                            <td className="py-3 text-right font-extrabold text-emerald-700">{formatVnd(methods.CASH.sales)}</td>
                          </tr>
                          <tr>
                            <td className="py-3 flex items-center gap-2 font-semibold text-slate-700">
                              <span className="material-symbols-outlined text-blue-600 text-[18px]">account_balance</span>
                              <span>Chuyển khoản (QR)</span>
                            </td>
                            <td className="py-3 text-center font-bold text-slate-600">{methods.BANK_TRANSFER.count}</td>
                            <td className="py-3 text-right font-extrabold text-slate-800">{formatVnd(methods.BANK_TRANSFER.sales)}</td>
                          </tr>
                          <tr>
                            <td className="py-3 flex items-center gap-2 font-semibold text-slate-700">
                              <span className="material-symbols-outlined text-sky-600 text-[18px]">qr_code_scanner</span>
                              <span>VNPAY</span>
                            </td>
                            <td className="py-3 text-center font-bold text-slate-600">{methods.VNPAY.count}</td>
                            <td className="py-3 text-right font-extrabold text-slate-800">{formatVnd(methods.VNPAY.sales)}</td>
                          </tr>
                          <tr>
                            <td className="py-3 flex items-center gap-2 font-semibold text-slate-700">
                              <span className="material-symbols-outlined text-pink-600 text-[18px]">account_balance_wallet</span>
                              <span>Ví MoMo</span>
                            </td>
                            <td className="py-3 text-center font-bold text-slate-600">{methods.MOMO.count}</td>
                            <td className="py-3 text-right font-extrabold text-slate-800">{formatVnd(methods.MOMO.sales)}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Sub-box: Tiền mặt hệ thống (ENDING_CASH_SYSTEM) */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                          TIỀN MẶT HỆ THỐNG (ENDING_CASH_SYSTEM)
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-lg bg-white p-2.5 border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Tiền đầu ca</span>
                            <strong className="text-xs font-bold text-slate-800 block mt-0.5">
                              {formatVnd(detail.openingCash ?? (validMoney(openingCash) ? Number(openingCash) : 0))}
                            </strong>
                          </div>
                          <div className="rounded-lg bg-white p-2.5 border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">+ Thu tiền mặt</span>
                            <strong className="text-xs font-bold text-emerald-700 block mt-0.5">
                              {formatVnd(cashSales)}
                            </strong>
                          </div>
                          <div className="rounded-lg bg-white p-2.5 border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">+ COD nhận từ shipper</span>
                            <strong className="text-xs font-bold text-emerald-700 block mt-0.5">{formatVnd(detail.codReceipts || 0)}</strong>
                          </div>
                          <div className="rounded-lg bg-white p-2.5 border border-red-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-primary block uppercase">− Hoàn tiền mặt: {formatVnd(detail.cashRefunds || 0)} · = Phải có trong két</span>
                            <strong className="text-xs font-black text-primary block mt-0.5">
                              {expectedPreview !== null ? formatVnd(expectedPreview) : '—'}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {detail.unattributedCount > 0 && (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                          ⚠️ {detail.unattributedCount} giao dịch tiền mặt ({formatVnd(detail.unattributedCash)}) chưa ghi nhận người thu tại quầy trong khung giờ ca; chưa tính vào doanh thu ca.
                        </p>
                      )}
                    </div>

                    {/* RIGHT COLUMN: FORM XÁC NHẬN SỐ LIỆU CUỐI CA */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span className="material-symbols-outlined text-primary text-[22px]">fact_check</span>
                        <h3 className="text-base font-extrabold text-slate-900">Xác nhận số liệu cuối ca</h3>
                      </div>

                      {detail.handedOver ? (
                        detail.status === 'REJECTED' ? (
                          <div className="rounded-xl border border-red-200 bg-red-50/70 p-6 text-left space-y-4">
                            <div className="flex items-center gap-2 text-red-900 font-extrabold text-sm">
                              <span className="material-symbols-outlined text-[24px] text-red-600">error</span>
                              <span>Biên bản đã bị Admin từ chối</span>
                            </div>
                            <div className="rounded-lg bg-white p-3 text-xs border border-red-200 text-red-800">
                              <strong>Lý do từ chối:</strong> {detail.reviewerNote || 'Không có lý do chi tiết'}
                            </div>
                            <form onSubmit={handleResubmit} className="space-y-3 pt-1">
                              <h5 className="text-xs font-bold text-slate-800">Bổ sung giải trình và gửi lại biên bản:</h5>
                              <div>
                                <label className="text-[11px] font-semibold text-slate-600 block">Số tiền thực tế kiểm đếm lại (nếu có cập nhật)</label>
                                <NumberInput
                                  type="number"
                                  min="0"
                                  step="1000"
                                  placeholder={String(detail.actualCash || 0)}
                                  value={resubmitCash}
                                  onChange={(e) => setResubmitCash(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-slate-600 block">Nội dung giải trình *</label>
                                <textarea
                                  required
                                  rows={3}
                                  maxLength={500}
                                  value={resubmitNote}
                                  onChange={(e) => setResubmitNote(e.target.value)}
                                  placeholder="Nhập giải trình lý do chênh lệch hoặc kết quả đếm lại..."
                                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-red-500 focus:outline-none"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={busy || !resubmitNote.trim()}
                                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                <span>{busy ? 'Đang gửi lại...' : 'Gửi lại biên bản cho Admin'}</span>
                              </button>
                            </form>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 text-center space-y-3">
                            <span className="material-symbols-outlined text-[40px] text-emerald-600">verified</span>
                            <h4 className="text-base font-extrabold text-emerald-900">
                              {detail.status === 'CONFIRMED' ? 'Biên bản đã được Admin phê duyệt' : 'Ca làm việc đã được chốt két hoàn tất'}
                            </h4>
                            <p className="text-xs text-emerald-700">
                              {detail.status === 'CONFIRMED'
                                ? 'Biên bản bàn giao ca đã được quản trị viên duyệt xác nhận.'
                                : 'Biên bản bàn giao đã gửi lên hệ thống và đang chờ Admin duyệt.'}
                            </p>
                            {detail.reviewerNote && (
                              <p className="text-xs text-stone-600 bg-white/70 rounded p-2 border border-emerald-100">
                                <strong>Ghi chú Admin:</strong> {detail.reviewerNote}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => setSearchParams({ mode: 'handover', scheduleId: selectedId })}
                              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                              <span>Xem biên bản bàn giao</span>
                            </button>
                          </div>
                        )
                      ) : !detail.ready ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center space-y-3">
                          <span className="material-symbols-outlined text-[36px] text-amber-600">schedule</span>
                          <h4 className="text-base font-extrabold text-amber-900">Chưa đủ điều kiện chốt ca</h4>
                          <p className="text-xs text-amber-800">Cần check-in trước khi chốt két. Khi bàn giao, hệ thống sẽ đồng thời kết thúc ca đang làm.</p>
                          {canConfirm && (
                            <button
                              type="button"
                              onClick={() => navigate('/my-attendance')}
                              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2 text-xs font-bold text-white hover:bg-amber-800 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                              <span>Mở màn hình chấm công</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <form onSubmit={confirm} className="space-y-4">
                          <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                              Tiền két đầu ca
                              <span className="ml-1 text-[10px] text-slate-400 font-normal">opening_cash</span>
                            </label>
                            <div className="mt-1 relative rounded-lg border border-slate-200">
                              <NumberInput
                                type="number"
                                min="0"
                                step="1000"
                                required
                                readOnly={detail.openingCash !== null}
                                value={detail.openingCash !== null ? detail.openingCash : openingCash}
                                onChange={(e) => setOpeningCash(e.target.value)}
                                className={`w-full rounded-lg p-2.5 pr-8 text-sm font-bold ${
                                  detail.openingCash !== null ? 'bg-slate-50 text-slate-600' : 'bg-white text-slate-900'
                                }`}
                              />
                              <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">đ</span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {detail.openingCash !== null ? 'Ghi nhận tự động từ tiền bắt đầu ca.' : 'Nhập số tiền mặt có trong két khi nhận ca.'}
                            </p>
                          </div>

                          <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                              Tiền mặt thực tế cuối ca
                              <span className="ml-1 text-[10px] text-slate-400 font-normal">actual_cash</span>
                            </label>
                            <div className="mt-1 relative rounded-lg border border-slate-200">
                              <NumberInput
                                type="number"
                                min="0"
                                step="1000"
                                required
                                value={actualCash}
                                onChange={(e) => setActualCash(e.target.value)}
                                placeholder="0"
                                className="w-full rounded-lg p-2.5 pr-8 text-sm font-extrabold text-slate-900 focus:border-primary focus:outline-none"
                              />
                              <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">đ</span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-400">Nhập tổng số tiền mặt kiểm đếm thực tế trong két.</p>
                          </div>

                          {/* Difference Box matching SWP Diff Box */}
                          <div className={`flex items-center justify-between rounded-xl p-3.5 border font-bold text-sm ${
                            differencePreview === null
                              ? 'bg-slate-50 border-slate-200 text-slate-600'
                              : differencePreview === 0
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : differencePreview > 0
                              ? 'bg-blue-50 border-blue-200 text-blue-800'
                              : 'bg-red-50 border-red-200 text-red-800'
                          }`}>
                            <span>
                              {differencePreview === null
                                ? 'Chưa nhập số tiền'
                                : differencePreview === 0
                                ? '✓ Khớp két'
                                : differencePreview > 0
                                ? '▲ Thừa tiền'
                                : '▼ Thiếu tiền'}
                            </span>
                            <span className="text-base font-black">
                              {differencePreview !== null ? `${differencePreview > 0 ? '+' : ''}${formatVnd(differencePreview)}` : '—'}
                            </span>
                          </div>

                          <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                              Ghi chú bàn giao
                              <span className="ml-1 text-[10px] text-slate-400 font-normal">note</span>
                            </label>
                            <textarea
                              rows={3}
                              maxLength={500}
                              required={isDiff}
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              placeholder={isDiff ? 'Két đang lệch so với hệ thống, bắt buộc nhập ghi chú giải trình...' : 'Nhập ghi chú bàn giao nếu có...'}
                              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs font-medium focus:border-primary focus:outline-none"
                            />
                            {isDiff && (
                              <p className="mt-1 text-[11px] font-bold text-red-600">
                                * Két đang lệch so với hệ thống, bắt buộc nhập ghi chú giải trình trước khi chốt.
                              </p>
                            )}
                          </div>

                          <button
                            type="submit"
                            disabled={busy || !canConfirm}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-extrabold text-white shadow-xs hover:bg-red-800 transition-colors disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[18px]">verified_user</span>
                            <span>{busy ? 'Đang lưu biên bản...' : 'Chốt ca và hoàn tất bàn giao'}</span>
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ========================================================
                 BRANCH 2: BIÊN BẢN BÀN GIAO CA (currentMode === 'handover')
                 ======================================================== */}
            {!loadingDetail && currentMode === 'handover' && (
              <>
                {!selectedId || !detail || !detail.handedOver ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-4">
                    <span className="material-symbols-outlined text-[48px] text-amber-400">assignment_late</span>
                    <h3 className="text-lg font-bold text-slate-800">Chưa có ca nào được chốt két để bàn giao</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                      Hãy thực hiện kiểm đếm và chốt ca làm việc trước khi xuất hoặc in biên bản bàn giao.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearchParams({ mode: 'close', ...(selectedId ? { scheduleId: selectedId } : {}) })}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-red-800 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">calculate</span>
                      <span>Đến màn hình chốt ca</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Status Alert Banner */}
                    {detail.status === 'REJECTED' ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                        <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
                          <span className="material-symbols-outlined text-red-600 text-[20px]">warning</span>
                          <span>Biên bản này đã bị Admin từ chối phê duyệt.</span>
                        </div>
                        <p className="mt-1 text-xs text-red-700"><strong>Lý do từ chối:</strong> {detail.reviewerNote || 'Không có lý do chi tiết'}</p>
                        <p className="mt-1 text-xs text-red-600">Vui lòng chuyển sang tab "Chốt ca" để gửi lại giải trình bổ sung cho Admin.</p>
                      </div>
                    ) : detail.status === 'CONFIRMED' ? (
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
                        <span className="material-symbols-outlined text-[18px] text-emerald-600">verified</span>
                        <span>Biên bản đã được Quản trị viên (Admin) phê duyệt xác nhận.</span>
                        {detail.reviewerNote && <span className="ml-2 font-normal text-emerald-700">({detail.reviewerNote})</span>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
                        <span className="material-symbols-outlined text-[18px] text-amber-600">hourglass_top</span>
                        <span>Biên bản bàn giao ca đã gửi đến Admin (Đang chờ duyệt).</span>
                      </div>
                    )}

                    {/* 5 Handover Metrics Strip matching SWP */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">TIỀN ĐẦU CA</span>
                        <strong className="mt-1 block text-base font-extrabold text-slate-800">{formatVnd(detail.openingCash || 0)}</strong>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">DOANH THU TIỀN MẶT</span>
                        <strong className="mt-1 block text-base font-extrabold text-emerald-700">{formatVnd(cashSales)}</strong>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">COD NHẬN TỪ SHIPPER</span>
                        <strong className="mt-1 block text-base font-extrabold text-emerald-700">{formatVnd(detail.codReceipts || 0)}</strong>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">DOANH THU KHÔNG TIỀN MẶT</span>
                        <strong className="mt-1 block text-base font-extrabold text-blue-700">{formatVnd(nonCashSales)}</strong>
                      </div>
                      <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">TỔNG DOANH THU</span>
                        <strong className="mt-1 block text-base font-black text-primary">{formatVnd(totalSales)}</strong>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">ĐƠN HOÀN THÀNH</span>
                        <strong className="mt-1 block text-base font-extrabold text-slate-800">{orderCount} đơn</strong>
                      </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Left: Reconciliation Card & Breakdown */}
                      <div className="space-y-6">
                        {/* Reconciliation Card matching SWP handover-reconciliation-card */}
                        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                          <div>
                            <span className="text-[11px] font-bold uppercase text-slate-400 block">Tiền két hệ thống</span>
                            <strong className="text-lg font-black text-slate-900 block mt-0.5">{formatVnd(detail.expectedCash || 0)}</strong>
                          </div>
                          <span className="material-symbols-outlined text-slate-300 text-[28px]">compare_arrows</span>
                          <div>
                            <span className="text-[11px] font-bold uppercase text-slate-400 block">Tiền két thực tế</span>
                            <strong className="text-lg font-black text-slate-900 block mt-0.5">{formatVnd(detail.actualCash || 0)}</strong>
                          </div>
                          <div className={`rounded-xl px-3 py-1.5 text-center font-bold text-xs ${
                            detail.difference === 0
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : (detail.difference || 0) > 0
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}>
                            <span className="block text-[10px] uppercase">
                              {detail.difference === 0 ? 'Khớp két' : (detail.difference || 0) > 0 ? 'Thừa tiền' : 'Thiếu tiền'}
                            </span>
                            <span className="text-sm font-extrabold block">
                              {(detail.difference || 0) > 0 ? '+' : ''}{formatVnd(detail.difference || 0)}
                            </span>
                          </div>
                        </div>

                        {/* Breakdown Table */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                            Chi tiết doanh thu theo hình thức thanh toán
                          </h4>
                          <table className="w-full text-xs">
                            <tbody className="divide-y divide-slate-100">
                              <tr className="py-2.5">
                                <td className="py-2.5 font-semibold text-slate-700 flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-emerald-600 text-[16px]">payments</span>
                                  <span>Tiền mặt</span>
                                </td>
                                <td className="py-2.5 text-center text-slate-500">{methods.CASH.count} giao dịch</td>
                                <td className="py-2.5 text-right font-extrabold text-emerald-700">{formatVnd(methods.CASH.sales)}</td>
                              </tr>
                              <tr className="py-2.5">
                                <td className="py-2.5 font-semibold text-slate-700 flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-blue-600 text-[16px]">account_balance</span>
                                  <span>Chuyển khoản (QR)</span>
                                </td>
                                <td className="py-2.5 text-center text-slate-500">{methods.BANK_TRANSFER.count} giao dịch</td>
                                <td className="py-2.5 text-right font-extrabold text-slate-800">{formatVnd(methods.BANK_TRANSFER.sales)}</td>
                              </tr>
                              <tr className="py-2.5">
                                <td className="py-2.5 font-semibold text-slate-700 flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-sky-600 text-[16px]">qr_code_scanner</span>
                                  <span>VNPAY</span>
                                </td>
                                <td className="py-2.5 text-center text-slate-500">{methods.VNPAY.count} giao dịch</td>
                                <td className="py-2.5 text-right font-extrabold text-slate-800">{formatVnd(methods.VNPAY.sales)}</td>
                              </tr>
                              <tr className="py-2.5">
                                <td className="py-2.5 font-semibold text-slate-700 flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-pink-600 text-[16px]">account_balance_wallet</span>
                                  <span>Ví MoMo</span>
                                </td>
                                <td className="py-2.5 text-center text-slate-500">{methods.MOMO.count} giao dịch</td>
                                <td className="py-2.5 text-right font-extrabold text-slate-800">{formatVnd(methods.MOMO.sales)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {detail.note && (
                          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Ghi chú bàn giao</span>
                            <p className="mt-1 text-xs font-medium text-slate-700 break-words">{detail.note}</p>
                          </div>
                        )}
                      </div>

                      {/* Right: Printable K80 Receipt Preview */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h4 className="text-sm font-extrabold text-slate-900">Phiếu biên bản bàn giao ca (K80)</h4>
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-800 transition-colors shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[16px]">print</span>
                            <span>In phiếu K80</span>
                          </button>
                        </div>

                        <div id="handover-print" className="mx-auto w-[76mm] border border-dashed border-stone-300 bg-white p-4 text-[11px] text-black">
                          <div className="text-center">
                            <strong className="block text-sm font-extrabold">AURA CAFÉ</strong>
                            <span className="text-xs font-semibold">BIÊN BẢN BÀN GIAO CA</span>
                            <span className="mt-1 block text-[10px] font-mono text-stone-500">#{String(detail.schedule._id).slice(-8).toUpperCase()}</span>
                          </div>
                          <div className="my-2.5 border-t border-dashed border-black" />
                          <div className="space-y-0.5">
                            <div>Ca: {formatShiftTitle(detail.schedule.shiftName, detail.schedule.shiftInfo)} · {displayDay(detail.schedule.workDate)}</div>
                            <div>Thu ngân: {detail.schedule.user?.fullName}</div>
                            <div>Giờ vào: {displayTime(detail.schedule.checkInTime)}</div>
                            <div>Giờ ra: {displayTime(detail.schedule.checkOutTime)}</div>
                            <div>Lập phiếu: {displayTime(detail.handoverAt)}</div>
                          </div>
                          <div className="my-2.5 border-t border-dashed border-black" />
                          <div className="space-y-1">
                            <div className="flex justify-between"><span>Tiền đầu ca</span><strong>{formatVnd(detail.openingCash || 0)}</strong></div>
                            <div className="flex justify-between"><span>Thu tiền mặt ({methods.CASH.count})</span><strong>{formatVnd(cashSales)}</strong></div>
                            <div className="flex justify-between"><span>Nhận COD từ shipper</span><strong>{formatVnd(detail.codReceipts || 0)}</strong></div>
                            <div className="flex justify-between"><span>Hoàn tiền mặt</span><strong>−{formatVnd(detail.cashRefunds || 0)}</strong></div>
                            <div className="flex justify-between"><span>Theo hệ thống</span><strong>{formatVnd(detail.expectedCash || 0)}</strong></div>
                            <div className="flex justify-between"><span>Thực tế trong két</span><strong>{formatVnd(detail.actualCash || 0)}</strong></div>
                            <div className="mt-1 flex justify-between border-t border-dashed border-black pt-1">
                              <span>Chênh lệch</span>
                              <strong>{(detail.difference || 0) > 0 ? '+' : ''}{formatVnd(detail.difference || 0)}</strong>
                            </div>
                          </div>
                          {detail.unattributedCount > 0 && (
                            <p className="mt-2 text-[10px] text-stone-600">Chưa gán người thu: {detail.unattributedCount} đơn · {formatVnd(detail.unattributedCash)}</p>
                          )}
                          {detail.note && <p className="mt-2 text-[10px] break-words">Ghi chú: {detail.note}</p>}
                          <div className="mt-6 grid grid-cols-2 gap-2 text-center text-[10px]">
                            <span>Người bàn giao<br />(ký tên)</span>
                            <span>Người nhận ca<br />(ký tên)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
