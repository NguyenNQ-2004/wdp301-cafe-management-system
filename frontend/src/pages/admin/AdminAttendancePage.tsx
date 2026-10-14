import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopApi } from '../../lib/shopApi';
import useAuthStore from '../../store/authStore';
import { AdminLayout, inputCls } from './AdminUi';

type ShiftName = 'MORNING' | 'AFTERNOON' | 'EVENING';
type AttendanceStatus = 'SCHEDULED' | 'PRESENT' | 'ABSENT' | 'COMPLETED';
interface Employee { _id: string; fullName: string; phone: string; position: string }
interface RecordItem { _id: string; user: Employee | null; workDate: string; shiftName: ShiftName; status: AttendanceStatus; checkInTime?: string; checkOutTime?: string; note?: string }
interface Shift { code: ShiftName; name: string; startTime: string; endTime: string }
const fallbackShifts: Shift[] = [
  { code: 'MORNING', name: 'Ca sáng', startTime: '07:00', endTime: '12:00' },
  { code: 'AFTERNOON', name: 'Ca chiều', startTime: '12:00', endTime: '17:00' },
  { code: 'EVENING', name: 'Ca tối', startTime: '17:00', endTime: '22:00' }
];
const statusLabels: Record<AttendanceStatus, string> = {
  SCHEDULED: 'Chưa chấm công', PRESENT: 'Đang trong ca', ABSENT: 'Vắng mặt', COMPLETED: 'Đã hoàn thành'
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
const nextDayKey = (key: string) => {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};
const formatTime = (iso?: string) => iso
  ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
  : '—';
const differenceMinutes = (record: RecordItem, shift: Shift, field: 'checkInTime' | 'checkOutTime') => {
  const actual = record[field];
  if (!actual) return null;
  const [year, month, day] = record.workDate.slice(0, 10).split('-').map(Number);
  const [hour, minute] = (field === 'checkInTime' ? shift.startTime : shift.endTime).split(':').map(Number);
  const expected = Date.UTC(year, month - 1, day, hour - 7, minute);
  return Math.round((Date.parse(actual) - expected) / 60000);
};

export default function AdminAttendancePage() {
  const navigate = useNavigate();
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
      isAdmin ? shopApi<Employee[]>('/api/employees', { token }) : Promise.resolve([])
    ]).then(([history, shiftResponse, staff]) => {
      if (!active) return;
      setRecords(history);
      setShifts(shiftResponse.shifts);
      setEmployees(staff);
      setError('');
    }).catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, isAdmin, range, employeeId, reloadKey]);

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
  const changeAttendance = async (record: RecordItem, action: 'CHECK_IN' | 'CHECK_OUT' | 'ABSENT') => {
    if (!token || busyId) return;
    const recordsCash = action === 'CHECK_IN' && ['CASHIER', 'MANAGER'].includes(user?.position || '');
    const opening = openingCash[record._id] ?? '0';
    if (recordsCash && (!/^\d+$/.test(opening) || !Number.isSafeInteger(Number(opening)))) {
      setError('Tiền đầu ca phải là số nguyên không âm.');
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
  const vietnamHour = localNow.getUTCHours();
  const vietnamMinute = vietnamHour * 60 + localNow.getUTCMinutes();
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
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
      <table className="w-full min-w-[940px] text-left text-sm">
        <thead><tr className="bg-stone-50 text-stone-700"><th className="p-3">Ngày</th>{isAdmin && <th className="p-3">Nhân viên</th>}<th className="p-3">Ca theo lịch</th><th className="p-3">Vào thực tế</th><th className="p-3">Ra thực tế</th><th className="p-3">Đối chiếu</th><th className="p-3">Trạng thái</th><th className="p-3">Thao tác</th></tr></thead>
        <tbody>{records.map((record) => {
          const shift = shifts.find((item) => item.code === record.shiftName) || fallbackShifts.find((item) => item.code === record.shiftName)!;
          const late = differenceMinutes(record, shift, 'checkInTime');
          const early = differenceMinutes(record, shift, 'checkOutTime');
          const workDay = record.workDate.slice(0, 10);
          const [startHour, startMinute] = shift.startTime.split(':').map(Number);
          const [endHour, endMinute] = shift.endTime.split(':').map(Number);
          const canCheckIn = workDay === today && vietnamMinute >= startHour * 60 + startMinute - 60 && vietnamMinute <= endHour * 60 + endMinute;
          const canCheckOut = workDay === today || (nextDayKey(workDay) === today && vietnamHour < 6);
          return <tr key={record._id} className="border-t border-stone-100 align-top">
            <td className="p-3 font-semibold">{workDay.split('-').reverse().join('/')}</td>
            {isAdmin && <td className="p-3"><strong className="block">{record.user?.fullName || 'Nhân viên đã xóa'}</strong><span className="text-xs text-stone-500">{record.user?.phone}</span></td>}
            <td className="p-3">{shift.name}<span className="block text-xs text-stone-500">{shift.startTime}–{shift.endTime}</span></td>
            <td className="p-3">{formatTime(record.checkInTime)}</td>
            <td className="p-3">{formatTime(record.checkOutTime)}</td>
            <td className="p-3 text-xs">{late !== null && late > 0 && <span className="block text-amber-700">Vào trễ {late} phút</span>}{early !== null && early < 0 && <span className="block text-amber-700">Ra sớm {-early} phút</span>}{(late === null || late <= 0) && (early === null || early >= 0) && <span className="text-stone-500">—</span>}</td>
            <td className="p-3"><span className={`rounded-lg px-2 py-1 text-xs font-semibold ${record.status === 'ABSENT' ? 'bg-red-50 text-red-700' : record.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{statusLabels[record.status]}</span>{record.note && <p className="mt-2 text-xs text-stone-500">{record.note}</p>}</td>
            <td className="p-3">
              {!isAdmin && record.status === 'SCHEDULED' && canCheckIn && <div className="space-y-2">
                {['CASHIER', 'MANAGER'].includes(user?.position || '') && <label className="block text-xs font-semibold text-stone-600">Tiền đầu ca (đ)<input type="number" min="0" step="1" value={openingCash[record._id] ?? '0'} onChange={(event) => setOpeningCash((current) => ({ ...current, [record._id]: event.target.value }))} className="mt-1 w-28 rounded-lg border border-stone-200 px-2 py-1" /></label>}
                <button disabled={busyId === record._id} onClick={() => void changeAttendance(record, 'CHECK_IN')} className="rounded-lg bg-[#800020] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Check-in</button>
              </div>}
              {!isAdmin && record.status === 'PRESENT' && canCheckOut && <button disabled={busyId === record._id} onClick={() => void changeAttendance(record, 'CHECK_OUT')} className="rounded-lg bg-[#800020] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Check-out</button>}
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

  if (isAdmin) return <AdminLayout route="admin-attendance" table="work_schedules" title="26. Chấm công nhân sự" subtitle="Theo dõi giờ vào, giờ ra và đối chiếu với ca đã phân.">{content}</AdminLayout>;
  return <div className="mx-auto w-full max-w-7xl p-4 md:p-8"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Chấm công của tôi</h1><p className="text-sm text-stone-600">Check-in và check-out theo ca đã được phân.</p></div><button onClick={() => navigate('/my-schedule')} className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold">Xem lịch phân ca</button></div>{content}</div>;
}
