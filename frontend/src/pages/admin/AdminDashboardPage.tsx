import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import axios from 'axios';

import { AdminLayout, StatCard } from './AdminUi';

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
    <AdminLayout
      route="admin"
      table="dashboard"
      title="Tổng quan hệ thống"
      subtitle={`Xin chào, ${user.fullName}! Quản lý toàn diện thực đơn, doanh thu ca bán, chuỗi cung ứng và nhân sự.`}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/cashier')}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
            <span>POS Thu ngân</span>
          </button>
          <button
            onClick={() => navigate('/barista')}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">soup_kitchen</span>
            <span>KDS Pha chế</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">logout</span>
            <span>Đăng xuất</span>
          </button>
        </div>
      }
      stats={
        <>
          <StatCard label="PHÂN HỆ ERP" value="16 Bảng" tone="default" />
          <StatCard label="TRẠNG THÁI CA" value="Đang mở" tone="success" />
          <StatCard label="CẢNH BÁO KHO" value="0 Mục" tone="default" />
          <StatCard label="QUẢN TRỊ VIÊN" value={user.fullName || 'Admin'} tone="default" />
        </>
      }
    >
      <div className="space-y-6">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div 
            onClick={() => navigate('/admin/categories')}
            className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-high shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[24px]">category</span>
            </div>
            <h3 className="font-bold text-base text-on-surface mb-1">15. Quản lý Danh mục</h3>
            <p className="text-secondary text-xs leading-relaxed">
              Thêm, sửa, xóa, tạm ẩn danh mục thực đơn (đồng bộ POS & KDS).
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-purple-700 group-hover:underline">
              <span>Vào màn hình 15</span>
              <span className="material-symbols-outlined text-[16px] ml-1">east</span>
            </div>
          </div>

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

        {/* Section: Nhân sự (Màn hình 23) */}
        <section className="mb-8 rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Màn hình 23 · Nhân sự</p>
              <h2 className="mt-1 text-xl font-bold text-on-surface">Quản lý nhân viên</h2>
              <p className="mt-1 text-sm text-secondary">Thêm, sửa, phân vị trí và bật/tắt tài khoản nhân viên.</p>
            </div>
            <button
              onClick={() => navigate('/admin/employees')}
              className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white hover:bg-primary-container transition-colors cursor-pointer"
            >
              Mở quản lý nhân viên
            </button>
          </div>
        </section>

        {/* Grid: Customer, Loyalty & Complaints (Cụm 4) */}
        <div className="mb-4">
          <h2 className="text-sm font-bold text-secondary uppercase tracking-wider mb-3">
            Phân hệ Quản lý Đơn hàng, Hội viên & Phản hồi (Cụm 4)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div 
              onClick={() => navigate('/admin/customers')}
              className="bg-surface-container-lowest p-6 rounded-xl border-2 border-red-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-white to-red-50/40"
            >
              <div className="w-12 h-12 rounded-xl bg-red-100 text-red-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[24px]">contact_page</span>
              </div>
              <div className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold mb-1">Screen 28</div>
              <h3 className="font-bold text-base text-on-surface mb-1">Khách hàng & Hội viên (CRM)</h3>
              <p className="text-secondary text-xs leading-relaxed">
                Quản lý danh sách hội viên, tra cứu lịch sử mua hàng thật, chi tiêu tích lũy và điểm thưởng.
              </p>
              <div className="mt-4 flex items-center text-xs font-semibold text-red-700 group-hover:underline">
                <span>Mở quản trị Khách hàng</span>
                <span className="material-symbols-outlined text-[16px] ml-1">east</span>
              </div>
            </div>

            <div 
              onClick={() => navigate('/admin/memberships')}
              className="bg-surface-container-lowest p-6 rounded-xl border-2 border-amber-300 shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-white to-amber-50/40"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[24px]">loyalty</span>
              </div>
              <div className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold mb-1">Screen 29</div>
              <h3 className="font-bold text-base text-on-surface mb-1">Tích điểm & Hạng thẻ</h3>
              <p className="text-secondary text-xs leading-relaxed">
                Cấu hình hạng thẻ Đồng-Bạc-Vàng-Kim Cương, tra cứu điểm theo SĐT và nhật ký tích điểm.
              </p>
              <div className="mt-4 flex items-center text-xs font-semibold text-amber-700 group-hover:underline">
                <span>Mở chương trình Hội viên</span>
                <span className="material-symbols-outlined text-[16px] ml-1">east</span>
              </div>
            </div>

            <div 
              onClick={() => navigate('/admin/complaints')}
              className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-high shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[24px]">feedback</span>
              </div>
              <div className="inline-block px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold mb-1">Screen 30</div>
              <h3 className="font-bold text-base text-on-surface mb-1">Đánh giá & Khiếu nại</h3>
              <p className="text-secondary text-xs leading-relaxed">
                Tiếp nhận đánh giá sao, khiếu nại sự cố đơn hàng, viết phản hồi và đổi trạng thái xử lý.
              </p>
              <div className="mt-4 flex items-center text-xs font-semibold text-purple-700 group-hover:underline">
                <span>Mở xử lý Khiếu nại</span>
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
    </AdminLayout>
  );
};

export default AdminDashboard;
