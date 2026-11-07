import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import useAuthStore from '../../store/authStore';
import { shopApi } from '../../lib/shopApi';
import { AdminLayout, inputCls } from './AdminUi';

interface Shift { _id: string; code: string; name: string; startTime: string; endTime: string }
interface ShiftResponse { shifts: Shift[] }
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const monday = (date = new Date()) => { const d=new Date(date); d.setDate(d.getDate()-(d.getDay()+6)%7); return dateKey(d); };
const moveWeek = (key: string, offset: number) => { const d=new Date(`${key}T12:00:00`); d.setDate(d.getDate()+offset*7); return dateKey(d); };

export default function AdminShiftsPage() {
  const token=useAuthStore(state=>state.user?.token);
  const [weekStart,setWeekStart]=useState(()=>monday());
  const [shifts,setShifts]=useState<Shift[]>([]);
  const [form,setForm]=useState<{ id?: string; shiftName: string; startTime: string; endTime: string } | null>(null);
  const [revision,setRevision]=useState(0);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const readOnly=weekStart<monday();
  useEffect(()=>{
    if(!token) return;
    let active=true; setLoading(true); setForm(null); setError(''); setNotice('');
    shopApi<ShiftResponse>(`/api/work-shifts?weekStart=${weekStart}`,{token})
      .then(data=>{if(active)setShifts(data.shifts);})
      .catch((err:Error)=>{if(active)setError(err.message);})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[token,weekStart,revision]);
  const save=async(event:FormEvent)=>{
    event.preventDefault(); if(!token||!form||busy||readOnly)return;
    setBusy(true);setError('');
    try{
      await shopApi(form.id?`/api/work-shifts/${form.id}`:'/api/work-shifts',{
        token,method:form.id?'PUT':'POST',body:{weekStart,shiftName:form.shiftName,startTime:form.startTime,endTime:form.endTime}
      });
      setForm(null);setRevision(x=>x+1);
    }catch(err){setError((err as Error).message);}finally{setBusy(false);}
  };
  const remove=async(shift:Shift)=>{
    if(!token||busy||!window.confirm(`Xóa ca ${shift.name} trong tuần này?`))return;
    setBusy(true);setError('');
    try{await shopApi(`/api/work-shifts/${shift._id}`,{token,method:'DELETE'});setRevision(x=>x+1);}
    catch(err){setError((err as Error).message);}finally{setBusy(false);}
  };
  const copy=async()=>{
    if(!token||busy||readOnly||shifts.length)return;
    setBusy(true);setError('');
    try{const result=await shopApi<ShiftResponse>('/api/work-shifts/copy',{token,method:'POST',body:{weekStart}});setShifts(result.shifts);setNotice('Đã sao chép các ca của tuần gần nhất.');}
    catch(err){setError((err as Error).message);}finally{setBusy(false);}
  };
  return <AdminLayout route="admin-shifts" table="work_shifts" title="Quản lý ca làm việc" subtitle="Mỗi tuần có khung giờ riêng; tuần đã qua chỉ được xem.">
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4">
        <h2 className="font-bold">Tuần từ {weekStart}</h2>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={()=>setWeekStart(moveWeek(weekStart,-1))} className="rounded-lg border px-3 py-2">← Tuần trước</button>
          <button disabled={busy} onClick={()=>setWeekStart(monday())} className="rounded-lg border px-3 py-2">Tuần này</button>
          <button disabled={busy} onClick={()=>setWeekStart(moveWeek(weekStart,1))} className="rounded-lg border px-3 py-2">Tuần sau →</button>
        </div>
      </div>
      {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      {notice&&<p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
      {readOnly&&<p className="text-sm text-stone-600">Tuần đã qua được giữ nguyên để tra cứu lịch sử.</p>}
      {!readOnly&&<div className="flex gap-3">
        <button disabled={busy||loading} onClick={()=>setForm({shiftName:'',startTime:'07:00',endTime:'12:00'})} className="rounded-xl bg-[#800020] px-4 py-2 font-semibold text-white">Thêm ca</button>
        <button disabled={busy||loading||shifts.length>0} onClick={()=>void copy()} className="rounded-xl border bg-white px-4 py-2 disabled:opacity-40">Sao chép tuần gần nhất</button>
      </div>}
      {form&&!readOnly&&<form onSubmit={save} className="space-y-4 rounded-2xl border bg-white p-5">
        <h2 className="font-bold">{form.id?'Sửa ca':'Thêm ca'} · {weekStart}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <label>Tên ca<input required maxLength={50} value={form.shiftName} onChange={e=>setForm({...form,shiftName:e.target.value})} className={inputCls}/></label>
          <label>Bắt đầu<input required type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})} className={inputCls}/></label>
          <label>Kết thúc<input required type="time" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})} className={inputCls}/></label>
        </div>
        <div className="flex gap-3"><button disabled={busy} className="rounded-xl bg-[#800020] px-4 py-2 text-white">{busy?'Đang lưu…':'Lưu ca'}</button><button type="button" onClick={()=>setForm(null)}>Hủy</button></div>
      </form>}
      {loading?<p>Đang tải ca làm…</p>:<div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-left text-sm"><thead className="bg-stone-50"><tr><th className="p-4">Tên ca</th><th>Bắt đầu</th><th>Kết thúc</th><th>Thao tác</th></tr></thead>
          <tbody>{shifts.map(shift=><tr key={shift._id} className="border-t"><td className="p-4 font-semibold">{shift.name}</td><td>{shift.startTime}</td><td>{shift.endTime}</td><td className="space-x-4">{!readOnly&&<><button disabled={busy} onClick={()=>setForm({id:shift._id,shiftName:shift.name,startTime:shift.startTime,endTime:shift.endTime})}>Sửa</button><button disabled={busy} onClick={()=>void remove(shift)} className="text-red-700">Xóa</button></>}</td></tr>)}</tbody>
        </table>{!shifts.length&&<p className="p-8 text-center text-stone-500">Tuần này chưa có ca. Thêm ca hoặc sao chép tuần trước để phân công nhân viên.</p>}
      </div>}
    </div>
  </AdminLayout>;
}
