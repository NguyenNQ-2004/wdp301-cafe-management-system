import React, { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../store/authStore';
import { AdminLayout, Badge, Field, FormActions, Modal, PrimaryButton, GhostButton, StatCard, inputCls } from './AdminUi';

interface CustomerItem {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;
  birthday?: string;
  address?: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  tierName: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  totalPoints: number;
  totalOrders: number;
  completedOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  createdAt: string;
}

interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  totalPoints: number;
  totalMemberRevenue: number;
}

interface OrderDetail {
  _id: string;
  orderCode: string;
  orderType: string;
  status: string;
  finalAmount: number;
  createdAt: string;
  items?: {
    productNameAtTime: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
}

interface LoyaltyItem {
  _id: string;
  pointsChange: number;
  transactionType: 'EARN' | 'REDEEM';
  reason?: string;
  createdAt: string;
  order?: {
    orderCode: string;
    finalAmount: number;
  };
}

interface CustomerDetailResponse {
  customer: CustomerItem;
  totalOrders: number;
  completedOrdersCount: number;
  totalSpent: number;
  orders: OrderDetail[];
  loyaltyHistory: LoyaltyItem[];
}

const TIER_CONFIG: Record<string, { label: string; cls: string; icon: string }> = {
  BRONZE: { label: 'Đồng', cls: 'bg-amber-100 text-amber-900 border border-amber-300', icon: 'military_tech' },
  SILVER: { label: 'Bạc', cls: 'bg-slate-200 text-slate-800 border border-slate-300', icon: 'workspace_premium' },
  GOLD: { label: 'Vàng', cls: 'bg-yellow-100 text-yellow-800 border border-yellow-300', icon: 'stars' },
  DIAMOND: { label: 'Kim Cương', cls: 'bg-cyan-100 text-cyan-900 border border-cyan-300 font-bold', icon: 'diamond' }
};

const ORDER_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ duyệt', cls: 'bg-stone-100 text-stone-700' },
  CONFIRMED: { label: 'Đã xác nhận', cls: 'bg-blue-100 text-blue-800' },
  PREPARING: { label: 'Đang pha chế', cls: 'bg-amber-100 text-amber-800' },
  READY: { label: 'Sẵn sàng', cls: 'bg-emerald-100 text-emerald-800' },
  DELIVERING: { label: 'Đang giao', cls: 'bg-purple-100 text-purple-800' },
  COMPLETED: { label: 'Hoàn thành', cls: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-rose-100 text-rose-800' }
};

const fmtMoney = (amount: number = 0) => `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))}₫`;
const fmtNumber = (num: number = 0) => new Intl.NumberFormat('vi-VN').format(num);
const fmtDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN');
};
const fmtDateTime = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

export const AdminCustomersPage: React.FC = () => {
  const { user } = useAuthStore();

  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    totalPoints: 0,
    totalMemberRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals
  const [createForm, setCreateForm] = useState<{
    fullName: string;
    phone: string;
    email: string;
    birthday: string;
    address: string;
    initialPoints: number;
  } | null>(null);

  const [editCustomer, setEditCustomer] = useState<CustomerItem | null>(null);
  const [detailData, setDetailData] = useState<CustomerDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCustomers = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedTier !== 'ALL') params.append('tier', selectedTier);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);

      const res = await fetch(`http://localhost:5000/api/users/customers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể tải danh sách khách hàng');
      setCustomers(data.customers || []);
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      showToast(err.message || 'Lỗi kết nối tới máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.token, search, selectedTier, selectedStatus]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Load customer detail for Order History Modal
  const openCustomerDetail = async (customerId: string) => {
    if (!user?.token) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/users/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể xem chi tiết khách hàng');
      setDetailData(data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  // Handle Create Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm || !user?.token) return;
    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:5000/api/users/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify(createForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi thêm khách hàng');
      showToast(data.message || 'Đã thêm khách hàng thành công!');
      setCreateForm(null);
      fetchCustomers();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Customer
  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomer || !user?.token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/users/customers/${editCustomer._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          fullName: editCustomer.fullName,
          email: editCustomer.email,
          birthday: editCustomer.birthday,
          address: editCustomer.address,
          tierName: editCustomer.tierName,
          status: editCustomer.status
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật');
      showToast(data.message || 'Cập nhật thành công!');
      setEditCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Toggle Lock
  const handleToggleLock = async (c: CustomerItem) => {
    if (!user?.token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/users/customers/${c._id}/toggle-lock`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi đổi trạng thái');
      showToast(data.message);
      setCustomers((prev) =>
        prev.map((item) => (item._id === c._id ? { ...item, status: data.status } : item))
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <AdminLayout
      activePath="/admin/customers"
      table="users (role=CUSTOMER), orders, loyalty_transactions"
      title="Quản lý khách hàng & Hội viên (CRM)"
      subtitle="Tra cứu lịch sử mua hàng, tổng chi tiêu tích lũy, số điện thoại và điểm thưởng của từng hội viên."
      actions={
        <div className="flex items-center gap-2">
          <GhostButton icon="refresh" onClick={fetchCustomers}>
            Tải lại
          </GhostButton>
          <PrimaryButton
            icon="person_add"
            onClick={() =>
              setCreateForm({
                fullName: '',
                phone: '',
                email: '',
                birthday: '',
                address: '',
                initialPoints: 0
              })
            }
          >
            Thêm khách hàng
          </PrimaryButton>
        </div>
      }
      stats={
        <>
          <StatCard label="Tổng khách hàng" value={fmtNumber(stats.totalCustomers)} />
          <StatCard
            label="Đang hoạt động"
            value={fmtNumber(stats.activeCustomers)}
            tone="success"
            hint={`${Math.round((stats.activeCustomers / (stats.totalCustomers || 1)) * 100)}% tài khoản mở`}
          />
          <StatCard
            label="Tổng điểm lưu hành"
            value={fmtNumber(stats.totalPoints)}
            tone="primary"
            hint="Aura Rewards"
          />
          <StatCard
            label="Doanh thu từ thành viên"
            value={fmtMoney(stats.totalMemberRevenue)}
            hint="Từ đơn COMPLETED"
          />
        </>
      }
    >
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-sm ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{toast.msg}</span>
          </div>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 w-full max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[18px]">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo họ tên, số điện thoại hoặc email..."
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-red-600 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-stone-500 font-medium whitespace-nowrap">Hạng:</span>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 font-medium outline-none focus:border-red-600"
            >
              <option value="ALL">Tất cả hạng</option>
              <option value="BRONZE">Đồng (Bronze)</option>
              <option value="SILVER">Bạc (Silver)</option>
              <option value="GOLD">Vàng (Gold)</option>
              <option value="DIAMOND">Kim Cương (Diamond)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-stone-500 font-medium whitespace-nowrap">Trạng thái:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 font-medium outline-none focus:border-red-600"
            >
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="LOCKED">Đã khóa</option>
            </select>
          </div>

          <span className="text-stone-400 font-medium whitespace-nowrap hidden sm:inline">
            {customers.length} hội viên
          </span>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
              <tr>
                <th className="p-3.5">Mã KH</th>
                <th className="p-3.5">Khách hàng</th>
                <th className="p-3.5">Số điện thoại</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5 text-center">Hạng thẻ</th>
                <th className="p-3.5 text-center">Điểm tích lũy</th>
                <th className="p-3.5 text-center">Số đơn</th>
                <th className="p-3.5 text-right">Tổng chi tiêu</th>
                <th className="p-3.5">Ngày tham gia</th>
                <th className="p-3.5 text-center">Trạng thái</th>
                <th className="p-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-stone-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-red-700 border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang tải danh sách khách hàng...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-stone-400">
                    Không tìm thấy khách hàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const tier = TIER_CONFIG[c.tierName] || TIER_CONFIG.BRONZE;
                  return (
                    <tr key={c._id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-stone-400">
                        #KH{c._id.slice(-4).toUpperCase()}
                      </td>
                      <td className="p-3.5">
                        <strong className="text-stone-900 block font-semibold">{c.fullName}</strong>
                        {c.address && (
                          <span className="text-[10px] text-stone-400 block truncate max-w-xs">
                            {c.address}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono font-medium text-stone-800">{c.phone}</td>
                      <td className="p-3.5 text-stone-500">{c.email || '—'}</td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${tier.cls}`}>
                          <span className="material-symbols-outlined text-[13px]">{tier.icon}</span>
                          {tier.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-red-700">
                        {fmtNumber(c.totalPoints)}
                      </td>
                      <td className="p-3.5 text-center font-mono font-medium">{c.totalOrders}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-stone-900">
                        {fmtMoney(c.totalSpent)}
                      </td>
                      <td className="p-3.5 text-stone-500">{fmtDate(c.createdAt)}</td>
                      <td className="p-3.5 text-center">
                        <Badge
                          className={
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }
                        >
                          {c.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => openCustomerDetail(c._id)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold transition-colors inline-flex items-center gap-1"
                          title="Xem lịch sử mua hàng và biến động điểm"
                        >
                          <span className="material-symbols-outlined text-[14px]">history</span>
                          Lịch sử
                        </button>
                        <button
                          onClick={() => setEditCustomer(c)}
                          className="px-2 py-1 rounded-lg hover:bg-stone-100 text-stone-600 font-semibold transition-colors"
                          title="Chỉnh sửa thông tin"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleToggleLock(c)}
                          className={`px-2 py-1 rounded-lg font-semibold transition-colors ${
                            c.status === 'LOCKED'
                              ? 'text-emerald-700 hover:bg-emerald-50'
                              : 'text-rose-600 hover:bg-rose-50'
                          }`}
                        >
                          {c.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CHI TIẾT & LỊCH SỬ MUA HÀNG CỦA KHÁCH */}
      {(detailData || detailLoading) && (
        <Modal
          title={
            detailData
              ? `Hồ sơ & Lịch sử mua hàng: ${detailData.customer.fullName} (#KH${detailData.customer._id.slice(-4).toUpperCase()})`
              : 'Đang tải thông tin khách hàng...'
          }
          wide
          onClose={() => setDetailData(null)}
        >
          {detailLoading ? (
            <div className="p-8 text-center text-stone-400">
              <span className="w-5 h-5 border-2 border-red-700 border-t-transparent rounded-full animate-spin inline-block mr-2"></span>
              Đang tải lịch sử đơn hàng thực tế...
            </div>
          ) : detailData ? (
            <div className="space-y-5 text-xs">
              {/* Summary Profile Header */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Số điện thoại</span>
                  <span className="font-mono font-bold text-sm text-stone-900">{detailData.customer.phone}</span>
                  {detailData.customer.email && (
                    <span className="text-[11px] text-stone-500 block truncate">{detailData.customer.email}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Hạng thành viên</span>
                  <span className="font-bold text-sm text-amber-700 block mt-0.5">
                    {TIER_CONFIG[detailData.customer.tierName]?.label || detailData.customer.tierName}
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Điểm thưởng: <strong className="text-red-700 font-mono">{fmtNumber(detailData.customer.totalPoints)}</strong>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Tổng chi tiêu tích lũy</span>
                  <span className="font-mono font-bold text-sm text-stone-900 mt-0.5 block">
                    {fmtMoney(detailData.totalSpent)}
                  </span>
                  <span className="text-[11px] text-stone-500">Đơn hoàn thành: {detailData.completedOrdersCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Địa chỉ & Ngày sinh</span>
                  <span className="text-stone-700 block truncate">{detailData.customer.address || 'Chưa cập nhật'}</span>
                  <span className="text-[11px] text-stone-400">{fmtDate(detailData.customer.birthday)}</span>
                </div>
              </div>

              {/* Order History Section */}
              <div>
                <h4 className="font-bold text-stone-900 text-sm mb-2.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-blue-600 text-[18px]">receipt_long</span>
                  Lịch sử mua hàng ({detailData.orders.length} đơn)
                </h4>

                {detailData.orders.length === 0 ? (
                  <p className="text-stone-400 italic p-4 text-center bg-stone-50 rounded-xl">
                    Khách hàng chưa có đơn hàng nào trong hệ thống.
                  </p>
                ) : (
                  <div className="border border-stone-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                        <tr>
                          <th className="p-2.5">Mã đơn</th>
                          <th className="p-2.5">Thời gian</th>
                          <th className="p-2.5">Hình thức</th>
                          <th className="p-2.5">Món đã đặt</th>
                          <th className="p-2.5 text-center">Trạng thái</th>
                          <th className="p-2.5 text-right">Tổng thanh toán</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {detailData.orders.map((o) => {
                          const st = ORDER_STATUS_LABELS[o.status] || {
                            label: o.status,
                            cls: 'bg-stone-100 text-stone-700'
                          };
                          return (
                            <tr key={o._id} className="hover:bg-stone-50">
                              <td className="p-2.5 font-mono font-bold text-red-700">{o.orderCode}</td>
                              <td className="p-2.5 text-stone-500 font-mono">{fmtDateTime(o.createdAt)}</td>
                              <td className="p-2.5 font-medium">{o.orderType}</td>
                              <td className="p-2.5 max-w-xs truncate text-stone-700">
                                {o.items?.map((i) => `${i.productNameAtTime} x${i.quantity}`).join(', ') || '—'}
                              </td>
                              <td className="p-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>
                                  {st.label}
                                </span>
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-stone-900">
                                {fmtMoney(o.finalAmount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Loyalty History Section */}
              {detailData.loyaltyHistory?.length > 0 && (
                <div>
                  <h4 className="font-bold text-stone-900 text-sm mb-2.5 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-amber-600 text-[18px]">loyalty</span>
                    Biến động điểm thưởng gần đây
                  </h4>
                  <div className="border border-stone-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                        <tr>
                          <th className="p-2">Thời gian</th>
                          <th className="p-2">Loại GD</th>
                          <th className="p-2 text-right">Điểm biến động</th>
                          <th className="p-2">Lý do</th>
                          <th className="p-2">Đơn liên quan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {detailData.loyaltyHistory.map((l) => (
                          <tr key={l._id}>
                            <td className="p-2 text-stone-500 font-mono">{fmtDateTime(l.createdAt)}</td>
                            <td className="p-2">
                              <Badge
                                className={
                                  l.transactionType === 'EARN'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }
                              >
                                {l.transactionType === 'EARN' ? 'Tích điểm' : 'Đổi điểm'}
                              </Badge>
                            </td>
                            <td
                              className={`p-2 text-right font-mono font-bold ${
                                l.pointsChange > 0 ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {l.pointsChange > 0 ? `+${l.pointsChange}` : l.pointsChange}
                            </td>
                            <td className="p-2 text-stone-600">{l.reason || '—'}</td>
                            <td className="p-2 font-mono text-stone-500">{l.order?.orderCode || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <GhostButton onClick={() => setDetailData(null)}>Đóng lại</GhostButton>
              </div>
            </div>
          ) : null}
        </Modal>
      )}

      {/* MODAL 2: THÊM KHÁCH HÀNG MỚI */}
      {createForm && (
        <Modal title="Thêm khách hàng thành viên mới" onClose={() => setCreateForm(null)}>
          <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
            <Field label="Họ và tên khách hàng *" column="users.fullName">
              <input
                required
                maxLength={100}
                value={createForm.fullName}
                onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                placeholder="Nguyễn Văn A"
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Số điện thoại *" column="users.phone (UNIQUE)">
                <input
                  required
                  maxLength={15}
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="0901234567"
                  className={inputCls}
                />
              </Field>
              <Field label="Ngày sinh" column="users.birthday">
                <input
                  type="date"
                  value={createForm.birthday}
                  onChange={(e) => setCreateForm({ ...createForm, birthday: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Địa chỉ Email" column="users.email">
              <input
                type="email"
                maxLength={120}
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="khachhang@example.com"
                className={inputCls}
              />
            </Field>

            <Field label="Địa chỉ liên hệ" column="users.address">
              <input
                value={createForm.address}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                placeholder="Số nhà, đường, phường, quận..."
                className={inputCls}
              />
            </Field>

            <Field label="Điểm thưởng tặng khởi tạo" column="loyalty_transactions (EARN)">
              <input
                type="number"
                min={0}
                value={createForm.initialPoints}
                onChange={(e) =>
                  setCreateForm({ ...createForm, initialPoints: Math.max(0, parseInt(e.target.value) || 0) })
                }
                className={inputCls}
              />
              <span className="text-[10px] text-stone-400 block mt-1">
                Khách sẽ tự động được xếp hạng tương ứng với số điểm khởi tạo (Đồng, Bạc, Vàng, Kim Cương).
              </span>
            </Field>

            <FormActions onCancel={() => setCreateForm(null)} submitLabel="Tạo khách hàng" loading={submitting} />
          </form>
        </Modal>
      )}

      {/* MODAL 3: CHỈNH SỬA THÔNG TIN */}
      {editCustomer && (
        <Modal title={`Chỉnh sửa: ${editCustomer.fullName}`} onClose={() => setEditCustomer(null)}>
          <form onSubmit={handleEditCustomer} className="space-y-3.5 text-xs">
            <Field label="Họ và tên *" column="users.fullName">
              <input
                required
                value={editCustomer.fullName}
                onChange={(e) => setEditCustomer({ ...editCustomer, fullName: e.target.value })}
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Số điện thoại" column="users.phone (READ-ONLY)">
                <input
                  disabled
                  value={editCustomer.phone}
                  className={`${inputCls} opacity-60 bg-stone-100 cursor-not-allowed`}
                />
              </Field>
              <Field label="Ngày sinh" column="users.birthday">
                <input
                  type="date"
                  value={editCustomer.birthday ? editCustomer.birthday.slice(0, 10) : ''}
                  onChange={(e) => setEditCustomer({ ...editCustomer, birthday: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Email" column="users.email">
              <input
                type="email"
                value={editCustomer.email || ''}
                onChange={(e) => setEditCustomer({ ...editCustomer, email: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field label="Địa chỉ" column="users.address">
              <input
                value={editCustomer.address || ''}
                onChange={(e) => setEditCustomer({ ...editCustomer, address: e.target.value })}
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Hạng thành viên" column="users.tierName">
                <select
                  value={editCustomer.tierName}
                  onChange={(e) => setEditCustomer({ ...editCustomer, tierName: e.target.value as any })}
                  className={inputCls}
                >
                  <option value="BRONZE">Đồng</option>
                  <option value="SILVER">Bạc</option>
                  <option value="GOLD">Vàng</option>
                  <option value="DIAMOND">Kim Cương</option>
                </select>
              </Field>
              <Field label="Trạng thái" column="users.status">
                <select
                  value={editCustomer.status}
                  onChange={(e) => setEditCustomer({ ...editCustomer, status: e.target.value as any })}
                  className={inputCls}
                >
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="LOCKED">Đã khóa</option>
                  <option value="INACTIVE">Ngừng hoạt động</option>
                </select>
              </Field>
            </div>

            <FormActions onCancel={() => setEditCustomer(null)} submitLabel="Lưu thông tin" loading={submitting} />
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
};

export default AdminCustomersPage;
