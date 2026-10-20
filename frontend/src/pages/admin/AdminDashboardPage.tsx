import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import { AdminLayout } from './AdminUi';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (!user) {
    navigate('/');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });

    try {
      await axios.put(
        'http://localhost:5000/api/auth/change-password',
        { oldPassword, newPassword },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setMessage({ text: 'Đổi mật khẩu thành công.', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setIsChangingPassword(false);
    } catch (error: any) {
      setMessage({ text: error.response?.data?.message || 'Đổi mật khẩu thất bại.', type: 'error' });
    }
  };

  return (
    <AdminLayout
      route="admin"
      table="dashboard"
      title="Tổng quan hệ thống"
      subtitle="Trung tâm điều hành cửa hàng Aura Café."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/cashier')}
            className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
          >
            <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
            POS Thu ngân
          </button>
          <button
            type="button"
            onClick={() => navigate('/barista')}
            className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100"
          >
            <span className="material-symbols-outlined text-[16px]">soup_kitchen</span>
            KDS Pha chế
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100"
          >
            <span className="material-symbols-outlined text-[14px]">logout</span>
            Đăng xuất
          </button>
        </div>
      }
      beforeStats={
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-900 to-primary px-6 py-6 text-white shadow-md sm:px-8">
          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-300"></span>
                Quản trị tập trung
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Xin chào, {user.fullName}!</h2>
              <p className="mt-1 max-w-2xl text-sm text-white/85">
                Theo dõi vận hành và xử lý các việc cần ưu tiên của cửa hàng từ một nơi.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/reports')}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#800020] transition-colors hover:bg-rose-50"
            >
              Xem báo cáo vận hành
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </section>
      }
    >
      <div className="space-y-5">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <span className="material-symbols-outlined">priority_high</span>
              </div>
              <div>
                <h2 className="font-bold text-stone-900">Điều hành nhanh</h2>
                <p className="mt-0.5 text-xs text-stone-500">Kiểm tra đơn hàng, tồn kho và các đề xuất cần xử lý.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => navigate('/admin/orders')} className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:border-[#800020] hover:text-[#800020]">Đơn hàng</button>
              <button type="button" onClick={() => navigate('/admin/inventory')} className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:border-[#800020] hover:text-[#800020]">Tồn kho</button>
              <button type="button" onClick={() => navigate('/admin/restock')} className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:border-[#800020] hover:text-[#800020]">Đề xuất nhập hàng</button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#800020]">
                <span className="material-symbols-outlined">lock</span>
              </div>
              <div>
                <h2 className="font-bold text-stone-900">Bảo mật tài khoản</h2>
                <p className="mt-0.5 text-xs text-stone-500">Đổi mật khẩu quản trị khi cần thiết.</p>
              </div>
            </div>
            {!isChangingPassword && (
              <button
                type="button"
                onClick={() => setIsChangingPassword(true)}
                className="rounded-lg bg-[#800020] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#68001a]"
              >
                Đổi mật khẩu
              </button>
            )}
          </div>

          {message.text && (
            <div className={`mt-4 rounded-xl border px-3 py-2 text-xs ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
              {message.text}
            </div>
          )}

          {isChangingPassword && (
            <form onSubmit={handleChangePassword} className="mt-5 grid gap-3 border-t border-stone-100 pt-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="text-xs font-semibold text-stone-700">
                Mật khẩu hiện tại
                <input type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} required className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none transition focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15" />
              </label>
              <label className="text-xs font-semibold text-stone-700">
                Mật khẩu mới
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none transition focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15" />
              </label>
              <div className="flex gap-2">
                <button type="submit" className="rounded-xl bg-[#800020] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#68001a]">Lưu</button>
                <button type="button" onClick={() => setIsChangingPassword(false)} className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-bold text-stone-600 transition-colors hover:bg-stone-50">Hủy</button>
              </div>
            </form>
          )}
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
