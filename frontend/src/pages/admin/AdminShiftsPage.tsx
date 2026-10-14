import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import useAuthStore from '../../store/authStore';
import { shopApi } from '../../lib/shopApi';
import { AdminLayout, inputCls } from './AdminUi';

type ShiftCode = 'MORNING' | 'AFTERNOON' | 'EVENING';
interface Shift { code: ShiftCode; name: string; startTime: string; endTime: string }
interface ShiftResponse { shifts: Shift[] }

const shiftNotes: Record<ShiftCode, string> = {
  MORNING: 'Chuẩn bị mở cửa và phục vụ buổi sáng',
  AFTERNOON: 'Phục vụ giờ trưa và buổi chiều',
  EVENING: 'Phục vụ buổi tối và đóng ca'
};

const durationText = (shift: Shift) => {
  const [startHour, startMinute] = shift.startTime.split(':').map(Number);
  const [endHour, endMinute] = shift.endTime.split(':').map(Number);
  const minutes = endHour * 60 + endMinute - startHour * 60 - startMinute;
  if (!Number.isFinite(minutes) || minutes <= 0) return 'Chưa hợp lệ';
  return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
};

export default function AdminShiftsPage() {
  const token = useAuthStore((state) => state.user?.token);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!token) return;
    let active = true;
    shopApi<ShiftResponse>('/api/work-shifts', { token })
      .then((result) => { if (active) { setShifts(result.shifts); setError(''); } })
      .catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const updateTime = (code: ShiftCode, field: 'startTime' | 'endTime', value: string) => {
    setShifts((current) => current.map((shift) => shift.code === code ? { ...shift, [field]: value } : shift));
    setNotice('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || saving || shifts.length !== 3) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await shopApi<ShiftResponse>('/api/work-shifts', {
        method: 'PUT', token,
        body: { shifts: shifts.map(({ code, startTime, endTime }) => ({ code, startTime, endTime })) }
      });
      setShifts(result.shifts);
      setNotice('Đã lưu khung giờ của ba ca làm việc.');
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };

  const reload = async () => {
    if (!token || loading) return;
    setLoading(true); setError(''); setNotice('');
    try { setShifts((await shopApi<ShiftResponse>('/api/work-shifts', { token })).shifts); }
    catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  return <AdminLayout route="admin-shifts" table="shop_settings" title="24. Quản lý ca làm việc" subtitle="Thiết lập khung giờ chuẩn cho ca sáng, chiều và tối.">
    <div className="space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
        Các khung giờ được lưu trong cài đặt hệ thống với mã <code className="font-mono">shift_morning</code>, <code className="font-mono">shift_afternoon</code> và <code className="font-mono">shift_evening</code>. Lịch phân ca sử dụng mã ca tương ứng.
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      {loading ? <p className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-stone-600">Đang tải khung giờ ca...</p> : <form onSubmit={save} className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-3">{shifts.map((shift) => <section key={shift.code} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-stone-900">{shift.name}</h2><p className="mt-1 text-xs text-stone-500">{shiftNotes[shift.code]}</p></div><span className="rounded-lg bg-[#800020]/10 px-2 py-1 font-mono text-[10px] font-bold text-[#800020]">{shift.code}</span></div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-stone-700">Giờ bắt đầu<input type="time" value={shift.startTime} onChange={(event) => updateTime(shift.code, 'startTime', event.target.value)} required className={`mt-1 ${inputCls}`} /></label>
            <label className="text-xs font-semibold text-stone-700">Giờ kết thúc<input type="time" value={shift.endTime} onChange={(event) => updateTime(shift.code, 'endTime', event.target.value)} required className={`mt-1 ${inputCls}`} /></label>
          </div>
          <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">Thời lượng: <strong className="text-stone-800">{durationText(shift)}</strong></p>
        </section>)}</div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500">Giờ bắt đầu phải trước giờ kết thúc; các ca không được chồng lấn.</p><div className="flex gap-2"><button type="button" onClick={() => void reload()} className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700">Tải lại</button><button disabled={saving || shifts.length !== 3} className="rounded-xl bg-[#800020] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu khung giờ'}</button></div></div>
      </form>}
    </div>
  </AdminLayout>;
}
