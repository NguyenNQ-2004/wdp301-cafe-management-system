import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import axios from 'axios';

const AdminDashboard: React.FC = () => {
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

        {/* Chuyển nhanh giữa các phân hệ cho Admin */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary font-medium hidden sm:inline">Phân hệ:</span>
          <button
            onClick={() => navigate('/admin')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white cursor-pointer shadow-sm"
          >
            Quản trị Admin
          </button>
          <button
            onClick={() => navigate('/cashier')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer transition-colors"
          >
            POS Thu ngân
          </button>
          <button
            onClick={() => navigate('/barista')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 cursor-pointer transition-colors"
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
      <div className="bg-gradient-to-r from-red-900 to-primary p-6 sm:p-8 rounded-2xl text-white mb-8 shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            Hệ thống Quản trị Tập trung • Aura Central Admin
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Xin chào, {user.fullName}!</h1>
          <p className="text-white/80 text-sm mt-1 max-w-xl">
            Quản lý toàn diện thực đơn, doanh thu ca bán, chuỗi cung ứng và nhân sự chuỗi cà phê Aura.
          </p>
        </div>
      </div>

      {/* Grid: Quick Actions & Operations Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div 
          onClick={() => navigate('/menu')}
          className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-high shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[24px]">coffee</span>
          </div>
          <h3 className="font-bold text-base text-on-surface mb-1">Quản lý Menu & Đồ uống</h3>
          <p className="text-secondary text-xs leading-relaxed">
            Kiểm tra các món cà phê, bánh ngọt, cập nhật giá bán và trạng thái còn món.
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-primary group-hover:underline">
            <span>Xem thực đơn ngay</span>
            <span className="material-symbols-outlined text-[16px] ml-1">east</span>
          </div>
        </div>

        <div 
          onClick={() => navigate('/cashier')}
          className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-high shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
          </div>
          <h3 className="font-bold text-base text-on-surface mb-1">Màn hình Thu ngân POS</h3>
          <p className="text-secondary text-xs leading-relaxed">
            Xem quầy bán lẻ, tạo đơn hàng tại chỗ, in hóa đơn và thanh toán nhanh.
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-blue-600 group-hover:underline">
            <span>Mở POS Thu ngân</span>
            <span className="material-symbols-outlined text-[16px] ml-1">east</span>
          </div>
        </div>

        <div 
          onClick={() => navigate('/barista')}
          className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-high shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[24px]">soup_kitchen</span>
          </div>
          <h3 className="font-bold text-base text-on-surface mb-1">Màn hình Pha chế KDS</h3>
          <p className="text-secondary text-xs leading-relaxed">
            Điều phối hàng đợi chế biến, thông báo món sẵn sàng phục vụ cho khách.
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-emerald-600 group-hover:underline">
            <span>Mở KDS Pha chế</span>
            <span className="material-symbols-outlined text-[16px] ml-1">east</span>
          </div>
        </div>
      </div>

      {/* Grid: Loyalty & Memberships (Screen 29) */}
      <div className="mb-4">
        <h2 className="text-sm font-bold text-secondary uppercase tracking-wider mb-3">
          Chương trình Hội viên & Khách hàng thân thiết (Aura Loyalty)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div 
            onClick={() => navigate('/admin/memberships')}
            className="bg-surface-container-lowest p-6 rounded-xl border-2 border-amber-300 shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-white to-amber-50/40"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[24px]">loyalty</span>
            </div>
            <div className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold mb-1">Screen 29</div>
            <h3 className="font-bold text-base text-on-surface mb-1">Tích điểm & Hạng thẻ hội viên</h3>
            <p className="text-secondary text-xs leading-relaxed">
              Cấu hình 4 hạng thẻ Đồng-Bạc-Vàng-Kim Cương, tra cứu điểm theo SĐT và nhật ký tích/đổi điểm.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-amber-700 group-hover:underline">
              <span>Mở quản trị Tích điểm & Hạng thẻ</span>
              <span className="material-symbols-outlined text-[16px] ml-1">east</span>
            </div>
          </div>
        </div>
      </div>

      {/* Thông tin tài khoản & Đổi mật khẩu */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-high shadow-sm">
          <h3 className="font-bold text-base text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
            Thông tin Quản trị viên
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
              <span className="text-secondary">Vai trò hệ thống:</span>
              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold text-xs">
                {user.role} {user.position && `(${user.position})`}
              </span>
            </div>
          </div>
        </div>

        {/* Form Đổi mật khẩu */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-high shadow-sm">
          <h3 className="font-bold text-base text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">lock_reset</span>
            Bảo mật tài khoản
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
                Bạn nên đổi mật khẩu định kỳ để đảm bảo tính an toàn cho quyền quản trị hệ thống.
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

export default AdminDashboard;
