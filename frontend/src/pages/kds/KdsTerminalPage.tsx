import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import axios from 'axios';

const BaristaDashboard: React.FC = () => {
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
            <span>Menu & Đặt hàng</span>
          </button>
        </div>

        {/* Chuyển nhanh giữa các phân hệ */}
        <div className="flex items-center gap-2">
          {user.role === 'STAFF' && <button onClick={() => navigate('/my-schedule')} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-amber-700 border border-amber-200">Lịch của tôi</button>}
          {user.role === 'ADMIN' && (
            <button
              onClick={() => navigate('/admin')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 cursor-pointer transition-colors"
            >
              Quản trị Admin
            </button>
          )}
          {(user.role === 'ADMIN' || user.position === 'CASHIER') && (
            <button
              onClick={() => navigate('/cashier')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer transition-colors"
            >
              POS Thu ngân
            </button>
          )}
          <button
            onClick={() => navigate('/barista')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white cursor-pointer shadow-sm"
          >
            KDS Pha chế
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">logout</span>
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-900 to-yellow-800 p-6 sm:p-8 rounded-2xl text-white mb-8 shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            KDS Barista Kitchen System • Trạm Pha Chế
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Barista: {user.fullName}</h1>
          <p className="text-white/80 text-sm mt-1 max-w-xl">
            Theo dõi danh sách món order từ POS & Online theo thời gian thực, cập nhật tiến độ pha chế và hoàn tất đơn.
          </p>
        </div>
      </div>

      {/* Grid: Quick Actions KDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div 
          onClick={() => navigate('/menu')}
          className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-high shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[24px]">coffee_maker</span>
          </div>
          <h3 className="font-bold text-base text-on-surface mb-1">Công Thức & Menu Món</h3>
          <p className="text-secondary text-xs leading-relaxed">
            Xem thành phần định lượng, tiêu chuẩn pha chế từng món trong menu của Aura Café.
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-amber-600 group-hover:underline">
            <span>Mở Menu tra cứu</span>
            <span className="material-symbols-outlined text-[16px] ml-1">east</span>
          </div>
        </div>

        <div 
          onClick={() => navigate('/orders')}
          className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-high shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[24px]">pending_actions</span>
          </div>
          <h3 className="font-bold text-base text-on-surface mb-1">Hàng Đợi Pha Chế (KDS)</h3>
          <p className="text-secondary text-xs leading-relaxed">
            Danh sách order đang chờ làm theo thứ tự ưu tiên thời gian đặt món.
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-orange-600 group-hover:underline">
            <span>Xem hàng đợi</span>
            <span className="material-symbols-outlined text-[16px] ml-1">east</span>
          </div>
        </div>

        <div 
          onClick={() => navigate('/')}
          className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-high shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[24px]">store</span>
          </div>
          <h3 className="font-bold text-base text-on-surface mb-1">Trang Chủ Cửa Hàng</h3>
          <p className="text-secondary text-xs leading-relaxed">
            Trở lại trang chủ cửa hàng xem hình ảnh thương hiệu và đánh giá từ khách.
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-emerald-600 group-hover:underline">
            <span>Về Trang chủ</span>
            <span className="material-symbols-outlined text-[16px] ml-1">east</span>
          </div>
        </div>
      </div>

      {/* Thông tin nhân viên & Đổi mật khẩu */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-high shadow-sm">
          <h3 className="font-bold text-base text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
            Thông tin Barista ca trực
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
              <span className="text-secondary">Chức vụ:</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold text-xs">
                {user.role} {user.position && `(${user.position})`}
              </span>
            </div>
          </div>
        </div>

        {/* Form Đổi mật khẩu */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-high shadow-sm">
          <h3 className="font-bold text-base text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">lock_reset</span>
            Đổi mật khẩu tài khoản
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
                Thay đổi mật khẩu ca làm việc khi cần thiết để bảo vệ tài khoản cá nhân.
              </p>
              <button
                onClick={() => setIsChangingPassword(true)}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
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
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-container-high bg-surface text-on-surface focus:outline-none focus:ring-1 focus:ring-amber-500"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-surface-container-high bg-surface text-on-surface focus:outline-none focus:ring-1 focus:ring-amber-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
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

export default BaristaDashboard;
