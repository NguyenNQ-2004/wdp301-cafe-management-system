import { NumberInput } from '../../components/NumberInput';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { formatVnd, shopApi } from '../../lib/shopApi';
import useAuthStore from '../../store/authStore';
import { AdminLayout, inputCls } from './AdminUi';

type ShiftName = string;
type AttendanceStatus = 'SCHEDULED' | 'PRESENT' | 'ABSENT' | 'COMPLETED';
interface Employee { _id: string; fullName: string; phone: string; position: string }
interface Shift { code: ShiftName; name: string; startTime: string; endTime: string }
interface RecordItem { _id: string; user: Employee | null; workDate: string; shiftName: ShiftName; shiftInfo?: Shift; status: AttendanceStatus; checkInTime?: string; checkOutTime?: string; note?: string }
interface CashTransferInfo {
  required: boolean;
  ready: boolean;
  assignedToMe: boolean;
  expectedCash: number | null;
  source: { _id: string; cashier: string; checkOutTime: string } | null;
  discrepancy: { countedCash: number; expectedCash: number; note: string; reportedAt: string; resolvedAt?: string } | null;
}
interface CashTransferEvent {
  _id: string;
  user: Employee | null;
  startingCash?: number;
  cashTransferExpectedCash?: number;
  cashTransferAcceptedAt?: string;
  cashTransferFrom?: { user?: Employee | null } | null;
  cashTransferDiscrepancy?: { expectedCash: number; countedCash: number; note: string; reportedAt: string; resolvedAt?: string; sourceSchedule?: { user?: Employee | null } } | null;
}
const fallbackShifts: Shift[] = [
  { code: 'MORNING', name: 'Ca sáng', startTime: '07:00', endTime: '12:00' },
  { code: 'AFTERNOON', name: 'Ca chiều', startTime: '12:00', endTime: '17:00' },
  { code: 'EVENING', name: 'Ca tối', startTime: '17:00', endTime: '22:00' }
];
const statusLabels: Record<AttendanceStatus, string> = {
  SCHEDULED: 'Chưa chấm công', PRESENT: 'Đang trong ca', ABSENT: 'Vắng mặt', COMPLETED: 'Đã hoàn thành'
};
const isValidTime = (value?: string): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const resolveShiftForRecord = (record: RecordItem, shifts: Shift[]): Shift => {
  if (record.shiftInfo) return record.shiftInfo;
  return shifts.find((item) => item.code === record.shiftName)
    || fallbackShifts.find((item) => item.code === record.shiftName)
    || { code: record.shiftName || '', name: record.shiftName || 'Ca làm', startTime: '', endTime: '' };
};
const nowInVietnam = () => new Date(Date.now() + 7 * 3600000);
const initialRange = () => {
  const today = nowInVietnam();
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { from: monday.toISOString().slice(0, 10), to: sunday.toISOString().slice(0, 10) };
};
const formatTime = (iso?: string) => {
  if (!iso) return '—';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '—';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms));
};
const differenceMinutes = (record: RecordItem, shift: Shift, field: 'checkInTime' | 'checkOutTime') => {
  const actual = record[field];
  const expectedTime = field === 'checkInTime' ? shift.startTime : shift.endTime;
  if (!actual || !record.workDate || !isValidTime(expectedTime)) return null;
  const [year, month, day] = record.workDate.slice(0, 10).split('-').map(Number);
  const [hour, minute] = expectedTime.split(':').map(Number);
  const expected = Date.UTC(year, month - 1, day, hour - 7, minute);
  const actualMs = Date.parse(actual);
  if (Number.isNaN(expected) || Number.isNaN(actualMs)) return null;
  return Math.round((actualMs - expected) / 60000);
};

export default function AdminAttendancePage() {
  const user = useAuthStore((state) => state.user);
  const token = user?.token;
  const isAdmin = user?.role === 'ADMIN';
  const [draft, setDraft] = useState(initialRange);
  const [range, setRange] = useState(initialRange);
  const [employeeId, setEmployeeId] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [shifts, setShifts] = useState<Shift[]>(fallbackShifts);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openingCash, setOpeningCash] = useState<Record<string, string>>({});
  const [cashTransfers, setCashTransfers] = useState<Record<string, CashTransferInfo>>({});
  const [cashTransferEvents, setCashTransferEvents] = useState<CashTransferEvent[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [clockTick, setClockTick] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    const query = new URLSearchParams({ from: range.from, to: range.to });
    if (isAdmin && employeeId) query.set('userId', employeeId);
    Promise.all([
      shopApi<RecordItem[]>(`/api/work-schedules/attendance?${query}`, { token }),
      shopApi<{ shifts: Shift[] }>('/api/work-shifts', { token }),
      isAdmin ? shopApi<Employee[]>('/api/employees', { token }) : Promise.resolve([]),
      shopApi<CashTransferEvent[]>('/api/work-schedules/cash-transfer-events', { token })
    ]).then(async ([history, shiftResponse, staff, transferEvents]) => {
      if (!active) return;
      const rows = Array.isArray(history) ? history : [];
      const pendingCashiers = rows.filter((record) => ['SCHEDULED', 'ABSENT'].includes(record.status) && !record.checkInTime && ['CASHIER', 'MANAGER'].includes(record.user?.position || ''));
      const transferRows = await Promise.all(pendingCashiers.map(async (record) => [record._id, await shopApi<CashTransferInfo>(`/api/work-schedules/${record._id}/cash-transfer`, { token })] as const));
      if (!active) return;
      setCashTransfers(Object.fromEntries(transferRows));
      setRecords(rows);
      setCashTransferEvents(Array.isArray(transferEvents) ? transferEvents : []);
      setShifts(Array.isArray(shiftResponse?.shifts) && shiftResponse.shifts.length ? shiftResponse.shifts : fallbackShifts);
      setEmployees(Array.isArray(staff) ? staff : []);
      setError('');
    }).catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, isAdmin, range, employeeId, reloadKey]);

  // CC1: tổng hợp ca được phân, đang làm, hoàn thành và vắng mặt.
  const summary = useMemo(() => ({
    assigned: records.length,
    present: records.filter((item) => item.status === 'PRESENT').length,
    completed: records.filter((item) => item.status === 'COMPLETED').length,
    absent: records.filter((item) => item.status === 'ABSENT').length
  }), [records]);
  const applyRange = (event: FormEvent) => {
    event.preventDefault();
    const days = (Date.parse(`${draft.to}T00:00:00Z`) - Date.parse(`${draft.from}T00:00:00Z`)) / 86400000;
    if (!Number.isFinite(days) || days < 0 || days > 30) {
      setError('Chọn khoảng ngày hợp lệ, tối đa 31 ngày.');
      return;
    }
    setError('');
    setRange({ ...draft });
  };
  // CC2 CC3: Admin ghi vào/ra/vắng rồi đối chiếu giờ thực tế; người nhận két phải tự xác nhận riêng.
  const changeAttendance = async (record: RecordItem, action: 'CHECK_IN' | 'CHECK_OUT' | 'ABSENT') => {
    if (!token || busyId) return;
    const recordsCash = action === 'CHECK_IN' && ['CASHIER', 'MANAGER'].includes(record.user?.position || '');
    const opening = openingCash[record._id] ?? '';
    if (recordsCash && (!/^\d+$/.test(opening) || !Number.isSafeInteger(Number(opening)))) {
      setError('Tiền đầu ca phải là số nguyên không âm.');
      return;
    }
    const transfer = cashTransfers[record._id];
    if (recordsCash && transfer?.required) {
      setError('Thu ngân nhận két cần tự đăng nhập tài khoản của mình để đếm và xác nhận.');
      return;
    }
    setBusyId(record._id);
    setError('');
    setNotice('');
    try {
      if (action === 'ABSENT') await shopApi(`/api/work-schedules/${record._id}/absence`, { method: 'PATCH', token });
      else await shopApi(`/api/work-schedules/${record._id}/shift-action`, { method: 'PUT', token, body: { action, ...(recordsCash ? { cash: Number(opening) } : {}) } });
      setNotice(action === 'CHECK_IN' ? 'Đã ghi nhận giờ vào ca.' : action === 'CHECK_OUT' ? 'Đã ghi nhận giờ ra ca.' : 'Đã đánh dấu vắng mặt.');
      setReloadKey((key) => key + 1);
    } catch (err) { setError((err as Error).message); }
    finally { setBusyId(null); }
  };

  const localNow = new Date(clockTick + 7 * 3600000);
  const today = localNow.toISOString().slice(0, 10);
  const content = <div className="mx-auto max-w-7xl space-y-5">
    <form onSubmit={applyRange} className="flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4">
      <label className="text-xs font-semibold text-stone-700">Từ ngày<input type="date" required value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} className={`mt-1 ${inputCls}`} /></label>
      <label className="text-xs font-semibold text-stone-700">Đến ngày<input type="date" required value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} className={`mt-1 ${inputCls}`} /></label>
      {isAdmin && <label className="text-xs font-semibold text-stone-700">Nhân viên<select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className={`mt-1 ${inputCls}`}><option value="">Tất cả nhân viên</option>{employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.fullName} · {employee.phone}</option>)}</select></label>}
      <button className="rounded-xl bg-[#800020] px-5 py-2 text-sm font-bold text-white">Xem lịch sử</button>
      <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold">Làm mới</button>
    </form>

    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {([['Ca được phân', summary.assigned], ['Đang trong ca', summary.present], ['Hoàn thành', summary.completed], ['Vắng mặt', summary.absent]] as const).map(([label, value]) => <div key={label} className="rounded-2xl border border-stone-200 bg-white p-4"><p className="text-xs font-semibold text-stone-500">{label}</p><strong className="mt-1 block text-2xl text-stone-900">{value}</strong></div>)}
    </div>

    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    {cashTransferEvents.length > 0 && <section className="rounded-2xl border border-stone-200 bg-white p-4 text-sm">
      <h2 className="mb-2 font-bold text-stone-900">Thông báo nhận két giữa hai thu ngân</h2>
      <div className="space-y-2">{cashTransferEvents.slice(0, 10).map(event => {
        const mismatch = event.cashTransferDiscrepancy && !event.cashTransferDiscrepancy.resolvedAt;
        return <div key={event._id} className={`rounded-lg p-3 ${mismatch ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'}`}>
          <strong>{event.cashTransferFrom?.user?.fullName || event.cashTransferDiscrepancy?.sourceSchedule?.user?.fullName || 'Thu ngân giao két'} → {event.user?.fullName || 'Thu ngân nhận két'}</strong>
          <span className="ml-2">{mismatch ? `Chênh lệch: giao ${formatVnd(event.cashTransferDiscrepancy!.expectedCash)}, đếm ${formatVnd(event.cashTransferDiscrepancy!.countedCash)}. ${event.cashTransferDiscrepancy!.note}` : `Đã đối chiếu khớp ${formatVnd(event.startingCash ?? event.cashTransferExpectedCash ?? 0)} và vào ca.${event.cashTransferDiscrepancy?.resolvedAt ? ` Trước đó báo chênh lệch: đếm ${formatVnd(event.cashTransferDiscrepancy.countedCash)}. ${event.cashTransferDiscrepancy.note}` : ''}`}</span>
        </div>;
      })}</div>
    </section>}
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
      <table className="w-full min-w-[940px] text-left text-sm">
        <thead><tr className="bg-stone-50 text-stone-700"><th className="p-3">Ngày</th>{isAdmin && <th className="p-3">Nhân viên</th>}<th className="p-3">Ca theo lịch</th><th className="p-3">Vào thực tế</th><th className="p-3">Ra thực tế</th><th className="p-3">Đối chiếu</th><th className="p-3">Trạng thái</th><th className="p-3">Thao tác</th></tr></thead>
        <tbody>{records.map((record) => {
          const shift = resolveShiftForRecord(record, shifts);
          const hasTimeWindow = isValidTime(shift.startTime) && isValidTime(shift.endTime);
          const late = differenceMinutes(record, shift, 'checkInTime');
          const early = differenceMinutes(record, shift, 'checkOutTime');
          const workDay = (record.workDate || '').slice(0, 10);
          const canAdminCheckIn = isAdmin && workDay <= today && ['SCHEDULED', 'ABSENT'].includes(record.status) && !record.checkInTime;
          const canAdminCheckOut = isAdmin && record.status === 'PRESENT' && workDay <= today && !record.checkOutTime;
          const transfer = cashTransfers[record._id];
          const counted = openingCash[record._id] ?? '';
          const isCashier = ['CASHIER', 'MANAGER'].includes(record.user?.position || '');
          return <tr key={record._id} className="border-t border-stone-100 align-top">
            <td className="p-3 font-semibold">{workDay ? workDay.split('-').reverse().join('/') : '—'}</td>
            {isAdmin && <td className="p-3"><strong className="block">{record.user?.fullName || 'Nhân viên đã xóa'}</strong><span className="text-xs text-stone-500">{record.user?.phone}</span></td>}
            <td className="p-3">{shift.name}<span className="block text-xs text-stone-500">{hasTimeWindow ? `${shift.startTime}–${shift.endTime}` : 'Chưa rõ khung giờ'}</span></td>
            <td className="p-3">{formatTime(record.checkInTime)}</td>
            <td className="p-3">{formatTime(record.checkOutTime)}</td>
            <td className="p-3 text-xs">{late !== null && late > 0 && <span className="block text-amber-700">Vào trễ {late} phút</span>}{early !== null && early < 0 && <span className="block text-amber-700">Ra sớm {-early} phút</span>}{(late === null || late <= 0) && (early === null || early >= 0) && <span className="text-stone-500">—</span>}</td>
            <td className="p-3"><span className={`rounded-lg px-2 py-1 text-xs font-semibold ${record.status === 'ABSENT' ? 'bg-red-50 text-red-700' : record.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{statusLabels[record.status]}</span>{record.note && <p className="mt-2 text-xs text-stone-500">{record.note}</p>}</td>
            <td className="p-3">
              {canAdminCheckIn && <div className="space-y-2">
                {isCashier && transfer?.required ? <p className="max-w-xs rounded-lg bg-blue-50 p-2 text-xs text-blue-900">{record.user?.fullName} cần đăng nhập tài khoản của mình để đếm và xác nhận nhận {formatVnd(transfer.expectedCash || 0)} từ {transfer.source?.cashier}. {!transfer.assignedToMe ? 'Thu ngân trước chưa chỉ định người nhận.' : ''} {transfer.discrepancy && !transfer.discrepancy.resolvedAt ? `Đã báo chênh lệch ${formatVnd(transfer.discrepancy.countedCash)}.` : ''}</p> : <>
                  {isCashier && <label className="block text-xs font-semibold text-stone-600">Tiền đầu ca thực đếm (đ)<NumberInput type="number" min="0" step="1" placeholder="Nhập số vừa đếm" value={counted} onChange={(event) => setOpeningCash((current) => ({ ...current, [record._id]: event.target.value }))} className="mt-1 w-36 rounded-lg border border-stone-200 px-2 py-1" /></label>}
                  <button disabled={busyId === record._id || (isCashier && (!transfer || !/^\d+$/.test(counted)))} onClick={() => void changeAttendance(record, 'CHECK_IN')} className="rounded-lg bg-[#800020] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Ghi nhận vào ca</button>
                </>}
              </div>}
              {canAdminCheckOut && <button disabled={busyId === record._id} onClick={() => void changeAttendance(record, 'CHECK_OUT')} className="rounded-lg bg-[#800020] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Ghi nhận kết thúc ca</button>}
              {isAdmin && record.status === 'SCHEDULED' && workDay < today && <button disabled={busyId === record._id} onClick={() => void changeAttendance(record, 'ABSENT')} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">Đánh dấu vắng</button>}
            </td>
          </tr>;
        })}</tbody>
      </table>
      {!loading && records.length === 0 && <p className="p-8 text-center text-sm text-stone-500">Không có lịch phân ca trong khoảng ngày này.</p>}
      {loading && <p className="p-8 text-center text-sm text-stone-500">Đang tải lịch sử chấm công...</p>}
    </div>
    <p className="text-xs text-stone-500">Đối chiếu giờ dự kiến theo khung giờ ca hiện tại của cửa hàng. Thời gian thực tế hiển thị theo giờ Việt Nam.</p>
  </div>;

  return <AdminLayout route="admin-attendance" table="work_schedules" title="26. Chấm công nhân sự" subtitle="Admin ghi nhận giờ vào, giờ ra và theo dõi đối chiếu với ca đã phân.">{content}</AdminLayout>;
}
