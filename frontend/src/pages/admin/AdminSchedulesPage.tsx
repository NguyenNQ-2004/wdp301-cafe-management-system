import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopApi } from '../../lib/shopApi';
import useAuthStore from '../../store/authStore';
import { AdminLayout, inputCls } from './AdminUi';

type ShiftName = 'MORNING' | 'AFTERNOON' | 'EVENING';
type ScheduleStatus = 'SCHEDULED' | 'PRESENT' | 'ABSENT' | 'COMPLETED';
interface Employee { _id: string; fullName: string; phone: string; position: string; status: string }
interface Schedule { _id: string; user: Employee; workDate: string; shiftName: ShiftName; status: ScheduleStatus; note?: string }
interface Shift { code: ShiftName; name: string; startTime: string; endTime: string }
interface FormState { id?: string; originalUserId?: string; userId: string; workDate: string; shiftName: ShiftName; note: string }

const defaultShifts: Shift[] = [
  { code: 'MORNING', name: 'Ca sáng', startTime: '07:00', endTime: '12:00' },
  { code: 'AFTERNOON', name: 'Ca chiều', startTime: '12:00', endTime: '17:00' },
  { code: 'EVENING', name: 'Ca tối', startTime: '17:00', endTime: '22:00' }
];
const weekdays = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
const statusNames: Record<ScheduleStatus, string> = {
  SCHEDULED: 'Đã phân công', PRESENT: 'Đang làm', ABSENT: 'Vắng mặt', COMPLETED: 'Đã hoàn thành'
};
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const mondayOf = (date: Date) => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
};
const fromKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const moveWeek = (key: string, count: number) => {
  const date = fromKey(key);
  date.setDate(date.getDate() + count * 7);
  return dateKey(date);
};

export default function AdminSchedulesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const token = user?.token;
  const isAdmin = user?.role === 'ADMIN';
  const [weekStart, setWeekStart] = useState(() => dateKey(mondayOf(new Date())));
  const [reloadKey, setReloadKey] = useState(0);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>(defaultShifts);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<FormState | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = fromKey(weekStart);
    date.setDate(date.getDate() + index);
    return { key: dateKey(date), label: weekdays[index], display: `${date.getDate()}/${date.getMonth() + 1}` };
  }), [weekStart]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    const requests: [Promise<Schedule[]>, Promise<{ shifts: Shift[] }>, Promise<Employee[]>] = [
      shopApi<Schedule[]>(`/api/work-schedules?weekStart=${weekStart}`, { token }),
      shopApi<{ shifts: Shift[] }>('/api/work-shifts', { token }),
      isAdmin ? shopApi<Employee[]>('/api/employees', { token }) : Promise.resolve([])
    ];
    Promise.all(requests)
      .then(([weekSchedules, shiftResponse, staff]) => {
        if (!active) return;
        setSchedules(weekSchedules);
        setShifts(shiftResponse.shifts);
        setEmployees(staff);
        setError('');
      })
      .catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, isAdmin, weekStart, reloadKey]);

  const visible = useMemo(() => employeeFilter
    ? schedules.filter((schedule) => schedule.user?._id === employeeFilter)
    : schedules, [schedules, employeeFilter]);
  const activeEmployees = employees.filter((employee) => employee.status === 'ACTIVE');
  const options = form?.originalUserId && !activeEmployees.some((employee) => employee._id === form.originalUserId)
    ? [...activeEmployees, ...employees.filter((employee) => employee._id === form.originalUserId)]
    : activeEmployees;

  const openCreate = (workDate: string, shiftName: ShiftName) => {
    const selected = activeEmployees.find((employee) => employee._id === employeeFilter);
    setForm({ userId: selected?._id || activeEmployees[0]?._id || '', workDate, shiftName, note: '' });
    setError('');
    setNotice('');
  };
  const openEdit = (schedule: Schedule) => {
    setForm({
      id: schedule._id, originalUserId: schedule.user._id, userId: schedule.user._id,
      workDate: schedule.workDate.slice(0, 10), shiftName: schedule.shiftName, note: schedule.note || ''
    });
    setError('');
    setNotice('');
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !form || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const body = {
        workDate: form.workDate, shiftName: form.shiftName, note: form.note,
        ...(!form.id || form.userId !== form.originalUserId ? { userId: form.userId } : {})
      };
      await shopApi<Schedule>(form.id ? `/api/work-schedules/${form.id}` : '/api/work-schedules', {
        token, method: form.id ? 'PUT' : 'POST', body
      });
      setForm(null);
      setNotice(form.id ? 'Đã cập nhật phân ca.' : 'Đã phân ca cho nhân viên.');
      setReloadKey((key) => key + 1);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };
  const remove = async (schedule: Schedule) => {
    if (!token || busy || !window.confirm(`Bỏ phân ca của ${schedule.user.fullName}?`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await shopApi(`/api/work-schedules/${schedule._id}`, { method: 'DELETE', token });
      setNotice('Đã bỏ phân ca.');
      setReloadKey((key) => key + 1);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  const content = <div className="mx-auto max-w-[1500px] space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">Tuần làm việc</div>
        <div className="mt-1 text-lg font-bold text-stone-900">{days[0].display} – {days[6].display}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {isAdmin && <select aria-label="Lọc nhân viên" value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} className={inputCls}>
          <option value="">Tất cả nhân viên</option>
          {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.fullName} · {employee.phone}</option>)}
        </select>}
        <button type="button" onClick={() => setWeekStart(moveWeek(weekStart, -1))} className="rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold">← Tuần trước</button>
        <button type="button" onClick={() => setWeekStart(dateKey(mondayOf(new Date())))} className="rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold">Tuần này</button>
        <button type="button" onClick={() => setWeekStart(moveWeek(weekStart, 1))} className="rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold">Tuần sau →</button>
      </div>
    </div>

    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}

    {isAdmin && form && <form onSubmit={save} className="rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="text-lg font-bold text-stone-900">{form.id ? 'Sửa phân ca' : 'Phân ca mới'}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="text-xs font-semibold text-stone-700">Nhân viên
          <select required value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} className={`mt-1 ${inputCls}`}>
            <option value="">Chọn nhân viên</option>
            {options.map((employee) => <option key={employee._id} value={employee._id}>{employee.fullName} · {employee.phone}{employee.status !== 'ACTIVE' ? ' (ngừng hoạt động)' : ''}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-stone-700">Ngày làm việc<input type="date" required min={days[0].key} max={days[6].key} value={form.workDate} onChange={(event) => setForm({ ...form, workDate: event.target.value })} className={`mt-1 ${inputCls}`} /></label>
        <label className="text-xs font-semibold text-stone-700">Ca làm
          <select value={form.shiftName} onChange={(event) => setForm({ ...form, shiftName: event.target.value as ShiftName })} className={`mt-1 ${inputCls}`}>
            {shifts.map((shift) => <option key={shift.code} value={shift.code}>{shift.name} · {shift.startTime}–{shift.endTime}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-stone-700">Ghi chú<input value={form.note} maxLength={300} onChange={(event) => setForm({ ...form, note: event.target.value })} className={`mt-1 ${inputCls}`} /></label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={() => setForm(null)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold">Hủy</button>
        <button disabled={busy || !form.userId} className="rounded-xl bg-[#800020] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Đang lưu...' : 'Lưu phân ca'}</button>
      </div>
    </form>}

    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
      <table className="w-full min-w-[1100px] table-fixed text-left text-sm">
        <thead><tr className="bg-stone-50 text-stone-700">
          <th className="w-36 border-b border-r border-stone-200 p-3">Ca làm</th>
          {days.map((day) => <th key={day.key} className="border-b border-r border-stone-200 p-3 last:border-r-0">{day.label}<span className="block text-xs font-normal text-stone-500">{day.display}</span></th>)}
        </tr></thead>
        <tbody>{shifts.map((shift) => <tr key={shift.code}>
          <th className="align-top border-r border-b border-stone-200 p-3 font-semibold text-stone-900">{shift.name}<span className="mt-1 block text-xs font-normal text-stone-500">{shift.startTime}–{shift.endTime}</span></th>
          {days.map((day) => {
            const items = visible.filter((schedule) => schedule.workDate.slice(0, 10) === day.key && schedule.shiftName === shift.code);
            return <td key={day.key} className="h-32 align-top border-r border-b border-stone-200 p-2 last:border-r-0">
              <div className="space-y-2">{items.map((schedule) => <div key={schedule._id} className="rounded-xl border border-[#800020]/15 bg-[#800020]/5 p-2">
                <strong className="block text-xs text-stone-900">{isAdmin ? schedule.user?.fullName || 'Nhân viên đã xóa' : shift.name}</strong>
                {isAdmin && <span className="text-[11px] text-stone-500">{schedule.user?.position || ''}</span>}
                <span className="block text-[11px] text-[#800020]">{statusNames[schedule.status]}</span>
                {schedule.note && <p className="mt-1 break-words text-[11px] text-stone-600">{schedule.note}</p>}
                {isAdmin && schedule.user && schedule.status === 'SCHEDULED' && <div className="mt-2 flex gap-2 text-[11px] font-semibold">
                  <button type="button" onClick={() => openEdit(schedule)} className="text-[#800020]">Sửa</button>
                  <button type="button" disabled={busy} onClick={() => void remove(schedule)} className="text-red-600 disabled:opacity-50">Bỏ ca</button>
                </div>}
              </div>)}</div>
              {isAdmin && <button type="button" onClick={() => openCreate(day.key, shift.code)} disabled={activeEmployees.length === 0} className="mt-2 text-xs font-semibold text-[#800020] disabled:text-stone-400">+ Phân ca</button>}
              {!isAdmin && items.length === 0 && <span className="text-xs text-stone-400">Không có ca</span>}
            </td>;
          })}
        </tr>)}</tbody>
      </table>
    </div>
    {loading && <p className="text-sm text-stone-500">Đang tải lịch làm việc...</p>}
    {isAdmin && !loading && activeEmployees.length === 0 && <p className="text-sm text-stone-500">Cần có nhân viên đang hoạt động trước khi phân ca.</p>}
  </div>;

  if (isAdmin) return <AdminLayout route="admin-schedules" table="work_schedules" title="25. Lịch phân ca nhân viên" subtitle="Phân công theo tuần; khung giờ lấy từ cài đặt ca làm.">{content}</AdminLayout>;
  return <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Lịch làm việc của tôi</h1><p className="text-sm text-stone-600">Các ca được quản trị viên phân công theo tuần.</p></div><button onClick={() => navigate('/')} className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold">Về trang chủ</button></div>
    {content}
  </div>;
}
