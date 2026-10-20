import React, { useEffect, useState } from 'react';
import type { PageRoute } from '../types';
import { useDb } from '../data/DbContext';
import useAuthStore from '../../store/authStore';
import { shopApi } from '../../lib/shopApi';
import {
  USER_STATUS_LABEL,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  fmtNumber,
  getSettingNumber,
  initials,
  pointsToMoney,
  userCode
} from '../data/dbUtils';

interface ProfilePageProps {
  onNavigate: (route: PageRoute) => void;
  onShowToast?: (message: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate, onShowToast }) => {
  const { db, session, refresh } = useDb();
  const account = useAuthStore(state => state.user);
  const user = db.users.find(u => u.id === session.customerId);
  const [activeTab, setActiveTab] = useState<'info' | 'loyalty' | 'security'>('info');

  // Các trường khớp bảng users
  const [formData, setFormData] = useState({ full_name: '', email: '', birthday: '', address: '' });
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name,
        email: user.email ?? '',
        birthday: user.birthday ?? '',
        address: user.address ?? ''
      });
    }
  }, [user?.id]);

  if (!user) {
    return <div className="p-10 text-center text-stone-500">Vui lòng đăng nhập để xem hồ sơ.</div>;
  }

  // Lịch sử điểm: loyalty_transactions của khách, tính số dư lùi dần từ users.total_points hiện tại
  const history = db.loyalty_transactions
    .filter(l => l.customer_id === user.id)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id));
  let running = user.total_points;
  const historyWithBalance = history.map(h => {
    const balanceAfter = running;
    running -= h.points_change;
    return { ...h, balanceAfter };
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account?.token) return;
    try {
      const updated = await shopApi<{ fullName: string; address?: string }>('/api/auth/profile', { method: 'PUT', token: account.token, body: { fullName: formData.full_name.trim(), email: formData.email.trim() || null, birthday: formData.birthday || null, address: formData.address.trim() || null } });
      useAuthStore.getState().login({ ...account, ...updated });
      await refresh();
      onShowToast?.('Đã cập nhật thông tin cá nhân thành công!');
    } catch (error) { onShowToast?.((error as Error).message); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword.length < 6) {
      onShowToast?.('Mật khẩu mới tối thiểu 6 ký tự.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      onShowToast?.('Mật khẩu xác nhận không khớp! Vui lòng kiểm tra lại.');
      return;
    }
    if (!account?.token) return;
    try {
      await shopApi('/api/auth/change-password', { method: 'PUT', token: account.token, body: { oldPassword: passwordData.oldPassword, newPassword: passwordData.newPassword } });
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      onShowToast?.('Đổi mật khẩu tài khoản thành công!');
    } catch (error) { onShowToast?.((error as Error).message); }
  };

  const pointsStep = getSettingNumber(db, 'points_step', 10);

  return (
    <div className="min-h-screen bg-stone-50 pb-20 pt-4">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex items-center gap-2 text-xs text-stone-500 py-2 font-medium">
          <button onClick={() => onNavigate('home')} className="hover:text-primary transition-colors">Trang chủ</button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-stone-800 font-semibold">Tài khoản cá nhân</span>
          <button onClick={() => { useAuthStore.getState().logout(); onNavigate('home'); }} className="ml-auto rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-700">Đăng xuất</button>
        </div>

        {/* User Card */}
        <section className="bg-white rounded-3xl border border-stone-200 shadow-xs p-6 sm:p-7 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-2xl ring-4 ring-primary/20 shadow-md">
                {initials(user.full_name)}
              </div>
              <div className="space-y-0.5">
                <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">{user.full_name}</h1>
                <p className="text-xs text-stone-500 font-mono flex items-center gap-2">
                  <span>{user.phone}</span>
                  <span>•</span>
                  <span>Mã KH: {userCode(user.id)}</span>
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
                    {USER_STATUS_LABEL[user.status]}
                  </span>
                  <span className="text-xs text-stone-400">Tham gia từ: {fmtDate(user.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="sm:text-right bg-stone-50 sm:bg-transparent p-4 sm:p-0 rounded-2xl border sm:border-0 border-stone-100">
              <span className="text-xs text-stone-400 font-bold uppercase tracking-wider block">Điểm tích lũy</span>
              <p className="text-3xl font-black text-primary font-mono">
                {fmtNumber(user.total_points)} <span className="text-sm font-semibold">điểm</span>
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                Tương đương <strong>{fmtMoney(pointsToMoney(db, user.total_points))}</strong> giảm trừ
              </p>
            </div>
          </div>

          <div className="flex border-b border-stone-100 mt-6 pt-2 gap-2 text-xs font-bold overflow-x-auto">
            {([
              { id: 'info', label: 'Thông tin cá nhân', icon: 'person' },
              { id: 'loyalty', label: 'Lịch sử điểm', icon: 'loyalty' },
              { id: 'security', label: 'Đổi mật khẩu', icon: 'lock' }
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === 'info' && (
          <section className="bg-white rounded-3xl border border-stone-200 shadow-xs p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Thông tin cá nhân</h2>
              <p className="text-xs text-stone-500">Địa chỉ được dùng làm địa chỉ giao hàng mặc định.</p>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={formData.full_name}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl outline-none focus:border-primary text-stone-900 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    disabled
                    value={user.phone}
                    className="w-full px-3.5 py-2.5 border border-stone-200 bg-stone-50 rounded-xl outline-none text-stone-500 font-mono"
                    title="Số điện thoại được lưu trong hồ sơ để liên hệ và giao hàng."
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Gmail / Email đăng nhập *</label>
                  <input
                    type="email"
                    required
                    maxLength={254}
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl outline-none focus:border-primary text-stone-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Ngày sinh</label>
                  <input
                    type="date"
                    value={formData.birthday}
                    onChange={e => setFormData({ ...formData, birthday: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl outline-none focus:border-primary text-stone-900 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Địa chỉ</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl outline-none focus:border-primary text-stone-900"
                />
              </div>
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-container transition-colors shadow-xs flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Lưu thay đổi hồ sơ
                </button>
              </div>
            </form>
          </section>
        )}

        {activeTab === 'loyalty' && (
          <section className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-stone-100">
              <h2 className="font-bold text-stone-900 text-base">Lịch sử tích & đổi điểm</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Mỗi {fmtMoney(getSettingNumber(db, 'points_earn_unit', 1000))} được 1 điểm khi đơn hoàn thành. Đổi điểm theo bậc {pointsStep} điểm ={' '}
                {fmtMoney(pointsToMoney(db, pointsStep))}.
              </p>
            </div>
            <div className="divide-y divide-stone-100 text-xs">
              {historyWithBalance.length === 0 && <p className="p-6 text-center text-stone-400">Chưa có giao dịch điểm.</p>}
              {historyWithBalance.map(item => {
                const plus = item.points_change > 0;
                const order = db.orders.find(o => o.id === item.order_id);
                return (
                  <article key={item.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-stone-50/70 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${plus ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        <span className="material-symbols-outlined text-lg">{plus ? 'add_circle' : 'remove_circle'}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-stone-900 truncate">
                          {plus ? 'Tích điểm' : 'Đổi điểm'} {order ? `đơn ${order.order_code}` : '(điều chỉnh bởi cửa hàng)'}
                        </p>
                        <p className="text-[10px] text-stone-400 mt-0.5">{fmtDateTime(item.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className={`text-sm font-bold font-mono ${plus ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {plus ? `+${item.points_change}` : item.points_change}
                      </p>
                      <p className="text-[10px] text-stone-400">Số dư: {fmtNumber(item.balanceAfter)} điểm</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'security' && (
          <section className="bg-white rounded-3xl border border-stone-200 shadow-xs p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Đổi mật khẩu</h2>
              <p className="text-xs text-stone-500">Mật khẩu được băm và lưu vào users.password_hash.</p>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md text-xs">
              {([
                { key: 'oldPassword', label: 'Mật khẩu hiện tại', placeholder: 'Nhập mật khẩu hiện tại' },
                { key: 'newPassword', label: 'Mật khẩu mới', placeholder: 'Tối thiểu 6 ký tự' },
                { key: 'confirmPassword', label: 'Xác nhận mật khẩu mới', placeholder: 'Nhập lại mật khẩu mới' }
              ] as const).map(f => (
                <div key={f.key}>
                  <label className="font-bold text-stone-700 block mb-1">{f.label}</label>
                  <input
                    type="password"
                    required
                    value={passwordData[f.key]}
                    onChange={e => setPasswordData({ ...passwordData, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl outline-none focus:border-primary text-stone-900"
                  />
                </div>
              ))}
              <button type="submit" className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-container transition-colors shadow-xs">
                Cập nhật mật khẩu mới
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
};
