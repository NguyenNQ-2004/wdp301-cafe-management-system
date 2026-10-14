import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { formatVnd, shopApi } from '../../lib/shopApi';
import useAuthStore from '../../store/authStore';
import { AdminLayout } from './AdminUi';

type Position = 'MANAGER' | 'BARISTA' | 'CASHIER' | 'SHIPPER';
type Status = 'ACTIVE' | 'INACTIVE' | 'LOCKED';
interface Employee { _id: string; fullName: string; phone: string; position: Position; status: Status; baseSalary: number; hireDate?: string }
interface EmployeeForm { fullName: string; phone: string; password: string; position: Position; status: Status; baseSalary: string; hireDate: string }
const positionNames: Record<Position, string> = { MANAGER: 'Quản lý', BARISTA: 'Pha chế', CASHIER: 'Thu ngân', SHIPPER: 'Giao hàng' };
const statusNames: Record<Status, string> = { ACTIVE: 'Đang làm việc', INACTIVE: 'Ngừng hoạt động', LOCKED: 'Bị khóa' };
const blankForm = (): EmployeeForm => ({ fullName: '', phone: '', password: '', position: 'CASHIER', status: 'ACTIVE', baseSalary: '0', hireDate: '' });
const fetchEmployees = (token: string) => shopApi<Employee[]>('/api/employees', { token });

export default function AdminUsersPage() {
  const token = useAuthStore((state) => state.user?.token);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(blankForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try { setEmployees(await fetchEmployees(token)); setError(''); }
    catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => {
    if (!token) return;
    let active = true;
    fetchEmployees(token)
      .then((result) => { if (active) { setEmployees(result); setError(''); } })
      .catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const visible = useMemo(() => employees.filter((employee) => {
    const query = search.trim().toLocaleLowerCase('vi');
    return (!query || `${employee.fullName} ${employee.phone}`.toLocaleLowerCase('vi').includes(query))
      && (positionFilter === 'ALL' || employee.position === positionFilter)
      && (statusFilter === 'ALL' || employee.status === statusFilter);
  }), [employees, search, positionFilter, statusFilter]);

  const startCreate = () => { setEditingId(null); setForm(blankForm()); setError(''); setFormOpen(true); };
  const startEdit = (employee: Employee) => {
    setEditingId(employee._id);
    setForm({ fullName: employee.fullName, phone: employee.phone, password: '', position: employee.position, status: employee.status, baseSalary: String(employee.baseSalary), hireDate: employee.hireDate?.slice(0, 10) || '' });
    setError(''); setFormOpen(true);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || saving) return;
    const salary = Number(form.baseSalary);
    if (!Number.isSafeInteger(salary) || salary < 0) { setError('Lương cơ bản phải là số nguyên không âm.'); return; }
    if ((!editingId || form.password) && form.password.length < 8) { setError('Mật khẩu mới cần ít nhất 8 ký tự.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      const employee = await shopApi<Employee>(editingId ? `/api/employees/${editingId}` : '/api/employees', {
        method: editingId ? 'PUT' : 'POST', token,
        body: { fullName: form.fullName.trim(), phone: form.phone.trim(), position: form.position, status: form.status,
          baseSalary: salary, hireDate: form.hireDate || null, ...(form.password ? { password: form.password } : {}) }
      });
      setEmployees((current) => editingId ? current.map((item) => item._id === employee._id ? employee : item) : [employee, ...current]);
      setNotice(editingId ? 'Đã cập nhật nhân viên.' : 'Đã tạo tài khoản nhân viên.');
      setFormOpen(false); setEditingId(null); setForm(blankForm());
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };

  const changeStatus = async (employee: Employee) => {
    if (!token || busyId) return;
    setBusyId(employee._id); setError(''); setNotice('');
    try {
      const status: Status = employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const updated = await shopApi<Employee>(`/api/employees/${employee._id}`, { method: 'PUT', token, body: { status } });
      setEmployees((current) => current.map((item) => item._id === updated._id ? updated : item));
      setNotice(`${employee.fullName}: ${statusNames[status].toLocaleLowerCase('vi')}.`);
    } catch (err) { setError((err as Error).message); }
    finally { setBusyId(null); }
  };

  return <AdminLayout route="admin-employees" table="users" title="23. Quản lý nhân viên" subtitle="Tài khoản, vị trí, lương cơ bản và trạng thái làm việc của nhân viên.">
    <div className="mx-auto max-w-7xl">
    <div className="flex justify-end"><button onClick={startCreate} className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white">+ Thêm nhân viên</button></div>
    {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-5 rounded-lg bg-emerald-50 p-4 text-emerald-800">{notice}</p>}

    {formOpen && <form onSubmit={save} className="mt-6 rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">{editingId ? 'Sửa nhân viên' : 'Thêm nhân viên'}</h2><button type="button" onClick={() => setFormOpen(false)} className="text-sm font-semibold text-slate-600">Đóng</button></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm font-semibold">Họ và tên<input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} required maxLength={100} className="mt-1 block w-full rounded-lg border border-blue-100 p-2.5" /></label>
        <label className="text-sm font-semibold">Số điện thoại<input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} required inputMode="numeric" pattern="[0-9]{9,15}" maxLength={15} className="mt-1 block w-full rounded-lg border border-blue-100 p-2.5" /></label>
        <label className="text-sm font-semibold">Vị trí<select value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: event.target.value as Position }))} className="mt-1 block w-full rounded-lg border border-blue-100 p-2.5">{Object.entries(positionNames).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
        <label className="text-sm font-semibold">Lương cơ bản (đ)<input type="number" min="0" step="1" value={form.baseSalary} onChange={(event) => setForm((current) => ({ ...current, baseSalary: event.target.value }))} required className="mt-1 block w-full rounded-lg border border-blue-100 p-2.5" /></label>
        <label className="text-sm font-semibold">Ngày vào làm<input type="date" value={form.hireDate} onChange={(event) => setForm((current) => ({ ...current, hireDate: event.target.value }))} className="mt-1 block w-full rounded-lg border border-blue-100 p-2.5" /></label>
        <label className="text-sm font-semibold">Trạng thái<select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Status }))} className="mt-1 block w-full rounded-lg border border-blue-100 p-2.5">{Object.entries(statusNames).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
        <label className="text-sm font-semibold">{editingId ? 'Mật khẩu mới (để trống nếu giữ nguyên)' : 'Mật khẩu đăng nhập'}<input type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required={!editingId} minLength={8} maxLength={72} className="mt-1 block w-full rounded-lg border border-blue-100 p-2.5" /></label>
      </div>
      <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-blue-100 px-4 py-2.5 font-semibold">Hủy</button><button disabled={saving} className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo nhân viên'}</button></div>
    </form>}

    <div className="mt-7 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
      <input aria-label="Tìm nhân viên" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên hoặc số điện thoại" className="rounded-lg border border-blue-100 bg-white p-2.5" />
      <select aria-label="Lọc vị trí" value={positionFilter} onChange={(event) => setPositionFilter(event.target.value)} className="rounded-lg border border-blue-100 bg-white p-2.5"><option value="ALL">Mọi vị trí</option>{Object.entries(positionNames).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select>
      <select aria-label="Lọc trạng thái" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-blue-100 bg-white p-2.5"><option value="ALL">Mọi trạng thái</option>{Object.entries(statusNames).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select>
      <button onClick={() => void refresh()} disabled={loading} className="rounded-lg border border-blue-100 bg-white px-4 py-2.5 font-semibold text-primary disabled:opacity-50">Làm mới</button>
    </div>
    <div className="mt-5 overflow-x-auto rounded-xl border border-blue-100 bg-white shadow-sm">
      <table className="min-w-[900px] w-full text-left text-sm"><thead className="bg-blue-50 text-slate-700"><tr><th className="p-4">Nhân viên</th><th className="p-4">Vị trí</th><th className="p-4">Lương cơ bản</th><th className="p-4">Ngày vào làm</th><th className="p-4">Trạng thái</th><th className="p-4">Thao tác</th></tr></thead><tbody>
        {visible.map((employee) => <tr key={employee._id} className="border-t border-blue-100"><td className="p-4"><strong className="block">{employee.fullName}</strong><span className="text-slate-500">{employee.phone}</span></td><td className="p-4">{positionNames[employee.position]}</td><td className="p-4">{formatVnd(employee.baseSalary)}</td><td className="p-4">{employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('vi-VN') : '—'}</td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${employee.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : employee.status === 'LOCKED' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{statusNames[employee.status]}</span></td><td className="p-4"><div className="flex gap-2"><button onClick={() => startEdit(employee)} className="rounded-lg border border-blue-200 px-3 py-1.5 font-semibold text-primary">Sửa</button><button disabled={busyId === employee._id} onClick={() => void changeStatus(employee)} className="rounded-lg border border-blue-200 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-50">{employee.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt'}</button></div></td></tr>)}
      </tbody></table>
      {!loading && visible.length === 0 && <p className="p-8 text-center text-slate-600">Không tìm thấy nhân viên phù hợp.</p>}
      {loading && <p className="p-8 text-center text-slate-600">Đang tải nhân viên...</p>}
    </div>
    <p className="mt-3 text-sm text-slate-500">Hiển thị {visible.length} / {employees.length} nhân viên</p>
    </div>
  </AdminLayout>;
}
