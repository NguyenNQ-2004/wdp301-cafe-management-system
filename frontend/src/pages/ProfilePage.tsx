import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import axios from 'axios';

const CustomerDashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (!user) {
    navigate('/');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg({ text: '', type: '' });

    try {
      await axios.put(
        'http://localhost:5000/api/auth/change-password',
        { oldPassword, newPassword },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setMsg({ text: 'Đổi mật khẩu thành công!', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setIsChangingPassword(false);
    } catch (err: any) {
      setMsg({ text: err.response?.data?.message || 'Đổi mật khẩu thất bại', type: 'error' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Top Breadcrumb & Quick Nav liên kết với Homepage */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface hover:bg-surface-container text-on-surface text-sm font-medium transition-colors cursor-pointer border border-surface-container-high"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Về Trang chủ Aura Café</span>
          </button>
          <button
            onClick={() => navigate('/menu')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface hover:bg-surface-container text-on-surface text-sm font-medium transition-colors cursor-pointer border border-surface-container-high"
          >
            <span className="material-symbols-outlined text-[18px]">restaurant_menu</span>
            <span>Khám phá Menu & Đặt món</span>
          </button>
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface hover:bg-surface-container text-on-surface text-sm font-medium transition-colors cursor-pointer border border-surface-container-high"
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            <span>Đơn hàng của tôi</span>
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          <span>Đăng xuất</span>
        </button>
      </div>

      {/* Member Card Hero */}
      <div className="bg-gradient-to-r from-amber-950 via-primary to-amber-900 p-6 sm:p-8 rounded-2xl text-white mb-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-semibold mb-3">
              <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
              Thẻ Hội Viên • Aura Privilege Club
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">{user.fullName}</h1>
            <p className="text-white/80 text-sm mt-1">
              Số điện thoại định danh: <span className="font-mono font-semibold">{user.phone}</span>
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur p-4 rounded-xl border border-white/10 self-start md:self-auto">
            <div className="w-12 h-12 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-bold text-lg shadow-sm">
              <span className="material-symbols-outlined text-[24px]">stars</span>
            </div>
            <div>
              <div className="text-xs text-white/80">Hạng Hội Viên</div>
              <div className="text-lg font-bold text-amber-300">SILVER MEMBER</div>
              <div className="text-xs text-white/90">120 Điểm tích lũy</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div
          onClick={() => navigate('/menu')}
          className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-high shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[24px]">local_cafe</span>
          </div>
          <h3 className="font-bold text-base text-on-surface mb-1">Đặt đồ uống ngay</h3>
          <p className="text-secondary text-xs leading-relaxed">
            Hơn 45 loại cà phê và thức uống cao cấp sẵn sàng phục vụ.
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-primary group-hover:underline">
            <span>Khám phá Menu</span>
            <span className="material-symbols-outlined text-[16px] ml-1">east</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/orders')}
          className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-high shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[24px]">shopping_bag</span>
          </div>
          <h3 className="font-bold text-base text-on-surface mb-1">Lịch sử đơn hàng</h3>
          <p className="text-secondary text-xs leading-relaxed">
            Xem lại các đơn hàng đã đặt và theo dõi tiến độ giao nhận.
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-blue-600 group-hover:underline">
            <span>Xem chi tiết</span>
            <span className="material-symbols-outlined text-[16px] ml-1">east</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/')}
          className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-high shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[24px]">home</span>
          </div>
          <h3 className="font-bold text-base text-on-surface mb-1">Trang chủ Aura Café</h3>
          <p className="text-secondary text-xs leading-relaxed">
            Quay về trang chủ xem không gian quán và ưu đãi đặc quyền hôm nay.
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-emerald-600 group-hover:underline">
            <span>Về Trang chủ</span>
            <span className="material-symbols-outlined text-[16px] ml-1">east</span>
          </div>
        </div>
      </div>

      {/* Thông tin hồ sơ & Đổi mật khẩu */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-high shadow-sm">
          <h3 className="font-bold text-base text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">person</span>
            Thông tin tài khoản
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-surface-container-high">
              <span className="text-secondary">Họ và tên:</span>
              <span className="font-semibold text-on-surface">{user.fullName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-surface-container-high">
              <span className="text-secondary">Số điện thoại:</span>
              <span className="font-semibold text-on-surface">{user.phone}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-surface-container-high">
              <span className="text-secondary">Vai trò:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold text-xs">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Đổi mật khẩu */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-high shadow-sm">
          <h3 className="font-bold text-base text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">lock_reset</span>
            Đổi mật khẩu bảo vệ tài khoản
          </h3>

          {msg.text && (
            <div className={`p-3 rounded-lg text-xs mb-4 ${
              msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {msg.text}
            </div>
          )}

          {!isChangingPassword ? (
            <div>
              <p className="text-secondary text-xs mb-4">
                Bạn có thể cập nhật mật khẩu mới bất cứ lúc nào để tăng cường an toàn cho tài khoản.
              </p>
              <button
                onClick={() => setIsChangingPassword(true)}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Đổi mật khẩu
              </button>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-container-high bg-surface text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-container-high bg-surface text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  Xác nhận đổi
                </button>
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(false)}
                  className="px-4 py-2 rounded-lg border border-surface-container-high text-secondary hover:bg-surface text-xs font-medium transition-colors cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
