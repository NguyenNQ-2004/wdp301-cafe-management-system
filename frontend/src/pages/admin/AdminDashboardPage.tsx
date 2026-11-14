import { API_BASE } from '../../lib/shopApi';
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
        `${API_BASE}/api/auth/change-password`,
        { oldPassword, newPassword },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setMessage({ text: 'Đổi mật khẩu thành công.', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setIsChangingPassword(false);
      logout();
      navigate('/login');
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

        {/* SWP Module Grid: Chức năng quản trị */}
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-stone-900">Chức năng quản trị</h2>
              <p className="text-xs text-stone-500">Các phân hệ đã sẵn sàng và liên kết trực tiếp tới từng chức năng.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Đang hoạt động
            </span>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { path: '/admin/categories', icon: 'category', title: 'Danh mục thực đơn', desc: 'Xem danh sách, thêm, sửa, ẩn/hiện hoặc xóa danh mục.', action: 'Mở danh mục →' },
              { path: '/admin/products', icon: 'local_cafe', title: 'Sản phẩm & giá bán', desc: 'Thêm món, gán danh mục, cập nhật giá, size, topping và ảnh.', action: 'Mở sản phẩm →' },
              { path: '/admin/recipes', icon: 'menu_book', title: 'Công thức & định lượng', desc: 'Thiết lập hướng dẫn pha chế và lượng nguyên liệu cho từng món.', action: 'Mở công thức →' },
              { path: '/admin/settings', icon: 'tune', title: 'Cài đặt hệ thống', desc: 'Thiết lập freeship, phí giao hàng và quy tắc điểm Aura.', action: 'Mở cài đặt →' },
              { path: '/admin/users', icon: 'group', title: 'Nhân viên & tài khoản', desc: 'Thêm, sửa tài khoản: vai trò, chức vụ, ngày vào làm và khóa.', action: 'Mở nhân viên →' },
              { path: '/admin/shifts', icon: 'schedule', title: 'Khung giờ ca làm việc', desc: 'Thêm ca và chỉnh giờ ca riêng cho từng tuần làm việc.', action: 'Mở khung giờ ca →' },
              { path: '/admin/schedules', icon: 'calendar_month', title: 'Lịch phân ca nhân viên', desc: 'Xem lịch tuần, phân ca và quản lý lịch phân công.', action: 'Mở lịch phân ca →' },
              { path: '/admin/attendance', icon: 'badge', title: 'Chấm công nhân viên', desc: 'Theo dõi giờ vào/ra và trạng thái làm việc theo ngày.', action: 'Mở chấm công →' },
              { path: '/admin/handovers', icon: 'assignment_turned_in', title: 'Lịch sử bàn giao ca', desc: 'Xem biên bản tiền két đã được Thu ngân hoàn tất khi chốt ca.', action: 'Mở bàn giao ca →' },
              { path: '/admin/ingredients', icon: 'inventory_2', title: 'Nguyên vật liệu', desc: 'Danh mục nguyên liệu, đơn vị tính, nhà cung cấp và tồn an toàn.', action: 'Mở nguyên liệu →' },
              { path: '/admin/stock', icon: 'inventory', title: 'Tồn kho & Xuất nhập', desc: 'Theo dõi tồn kho thực tế, lịch sử xuất bán và phiếu điều chỉnh.', action: 'Mở tồn kho →' },
              { path: '/admin/restock-requests', icon: 'notification_important', title: 'Đề xuất nhập hàng', desc: 'Cảnh báo nguyên liệu thiếu hụt và duyệt phiếu đề xuất nhập.', action: 'Mở đề xuất nhập →' },
              { path: '/admin/purchases', icon: 'description', title: 'Phiếu nhập hàng', desc: 'Tạo đơn mua nhà cung cấp, đặt hàng và xác nhận nhập kho.', action: 'Mở phiếu nhập →' },
              { path: '/admin/suppliers', icon: 'local_shipping', title: 'Nhà cung cấp', desc: 'Quản lý danh sách đối tác cung ứng nguyên vật liệu.', action: 'Mở nhà cung cấp →' },
              { path: '/admin/orders', icon: 'receipt_long', title: 'Quản lý đơn hàng', desc: 'Xem, lọc và theo dõi trạng thái đơn hàng trên toàn hệ thống.', action: 'Mở đơn hàng →' },
              { path: '/admin/customers', icon: 'person', title: 'Khách hàng', desc: 'Xem thông tin, trạng thái tài khoản và lịch sử của khách hàng.', action: 'Mở khách hàng →' },
              { path: '/admin/memberships', icon: 'loyalty', title: 'Tích điểm thành viên', desc: 'Xem chính sách tích điểm và tra cứu điểm theo số điện thoại.', action: 'Mở tích điểm →' },
              { path: '/admin/complaints', icon: 'rate_review', title: 'Đánh giá & Khiếu nại', desc: 'Xem phản hồi của khách và giao diện xử lý khiếu nại.', action: 'Mở đánh giá →' },
              { path: '/admin/reports', icon: 'analytics', title: 'Báo cáo kinh doanh', desc: 'Tổng hợp doanh thu, số đơn và sản phẩm bán chạy nhất.', action: 'Mở báo cáo →' }
            ].map((mod) => (
              <button
                key={mod.path}
                type="button"
                onClick={() => navigate(mod.path)}
                className="group flex items-start gap-3.5 rounded-xl border border-stone-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-primary border border-red-100 group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">{mod.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-stone-900 group-hover:text-primary transition-colors">{mod.title}</h3>
                  <p className="mt-1 text-xs text-stone-500 line-clamp-2 leading-relaxed">{mod.desc}</p>
                  <span className="mt-2.5 inline-block text-[11px] font-bold text-primary group-hover:underline">{mod.action}</span>
                </div>
              </button>
            ))}
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
