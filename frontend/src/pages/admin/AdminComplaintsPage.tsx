import React, { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../store/authStore';
import { AdminLayout, Badge, Field, FormActions, Modal, StatCard, GhostButton, inputCls } from './AdminUi';

interface ReviewItem {
  _id: string;
  customer?: {
    _id: string;
    fullName: string;
    phone: string;
    email?: string;
    tierName?: string;
  };
  order?: {
    _id: string;
    orderCode: string;
    finalAmount: number;
    createdAt: string;
    items?: {
      productNameAtTime: string;
      quantity: number;
    }[];
  };
  issueType: 'RATING' | 'COMPLAINT';
  rating?: number;
  topic?: string;
  content: string;
  attachments?: string[];
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  adminResponse?: string;
  respondedAt?: string;
  respondedBy?: {
    fullName: string;
    position?: string;
  };
  createdAt: string;
}

interface ReviewStats {
  totalReviews: number;
  pendingCount: number;
  inProgressCount: number;
  resolvedCount: number;
  rejectedCount: number;
  complaintsCount: number;
  ratingsCount: number;
  avgRating: number;
}

const REVIEW_TYPE_CONFIG = {
  RATING: { label: 'Đánh giá', cls: 'bg-blue-100 text-blue-800 border border-blue-200' },
  COMPLAINT: { label: 'Khiếu nại', cls: 'bg-amber-100 text-amber-900 border border-amber-200 font-bold' }
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ xử lý', cls: 'bg-rose-100 text-rose-800 font-bold' },
  IN_PROGRESS: { label: 'Đang xử lý', cls: 'bg-amber-100 text-amber-900 font-semibold' },
  RESOLVED: { label: 'Đã giải quyết', cls: 'bg-emerald-100 text-emerald-800 font-semibold' },
  REJECTED: { label: 'Từ chối / Đóng', cls: 'bg-stone-200 text-stone-600' }
};

const fmtDateTime = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

export const AdminComplaintsPage: React.FC = () => {
  const { user } = useAuthStore();

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    pendingCount: 0,
    inProgressCount: 0,
    resolvedCount: 0,
    rejectedCount: 0,
    complaintsCount: 0,
    ratingsCount: 0,
    avgRating: 5.0
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RATING' | 'COMPLAINT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'>('ALL');

  // Respond Modal
  const [respondingItem, setRespondingItem] = useState<{
    review: ReviewItem;
    status: 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
    response: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchStats = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await fetch('http://localhost:5000/api/customer-reviews/stats', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (err: any) {
      console.error(err);
    }
  }, [user?.token]);

  const fetchReviews = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') params.append('issueType', typeFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());
      params.append('limit', '50');

      const res = await fetch(`http://localhost:5000/api/customer-reviews?${params.toString()}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (res.ok) setReviews(data.reviews || []);
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải danh sách phản hồi', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.token, typeFilter, statusFilter, search]);

  useEffect(() => {
    fetchStats();
    fetchReviews();
  }, [fetchStats, fetchReviews]);

  // Handle Submit Admin Response
  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingItem || !user?.token) return;
    if (!respondingItem.response.trim()) {
      showToast('Vui lòng nhập nội dung phản hồi giải quyết.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/customer-reviews/${respondingItem.review._id}/respond`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          adminResponse: respondingItem.response.trim(),
          status: respondingItem.status
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi gửi phản hồi');

      showToast(data.message || 'Đã gửi phản hồi thành công!');
      setRespondingItem(null);
      fetchStats();
      fetchReviews();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout
      activePath="/admin/complaints"
      table="customer_reviews"
      title="Quản trị Đánh giá & Xử lý Khiếu nại (Feedback & Complaints)"
      subtitle="Tiếp nhận đánh giá sao (RATING) và khiếu nại sự cố (COMPLAINT) theo từng đơn hàng; Quản trị viên phản hồi giải quyết trực tiếp tới khách hàng."
      actions={
        <GhostButton icon="refresh" onClick={() => { fetchStats(); fetchReviews(); }}>
          Tải lại
        </GhostButton>
      }
      stats={
        <>
          <StatCard label="Tổng phiếu phản ánh" value={stats.totalReviews} />
          <StatCard
            label="Chờ xử lý"
            value={stats.pendingCount}
            tone="danger"
            hint={stats.pendingCount > 0 ? 'Cần xử lý sớm' : 'Đã xử lý hết'}
          />
          <StatCard label="Khiếu nại sự cố" value={stats.complaintsCount} hint={`${stats.inProgressCount} đang xử lý`} />
          <StatCard
            label="Điểm đánh giá TB"
            value={`${stats.avgRating} ★`}
            tone="primary"
            hint={`Từ ${stats.ratingsCount} lượt đánh giá`}
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
            placeholder="Tìm theo nội dung, mã đơn hoặc tên/sđt khách..."
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-red-600 focus:bg-white transition-colors text-stone-900"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-stone-500 font-medium whitespace-nowrap">Loại:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 font-medium outline-none focus:border-red-600"
            >
              <option value="ALL">Tất cả loại</option>
              <option value="RATING">Đánh giá chất lượng (RATING)</option>
              <option value="COMPLAINT">Khiếu nại sự cố (COMPLAINT)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-stone-500 font-medium whitespace-nowrap">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 font-medium outline-none focus:border-red-600"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ xử lý (PENDING)</option>
              <option value="IN_PROGRESS">Đang xử lý (IN_PROGRESS)</option>
              <option value="RESOLVED">Đã giải quyết (RESOLVED)</option>
              <option value="REJECTED">Từ chối / Đóng (REJECTED)</option>
            </select>
          </div>

          <span className="text-stone-400 font-medium whitespace-nowrap hidden sm:inline">
            {reviews.length} phiếu
          </span>
        </div>
      </div>

      {/* Review List Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
              <tr>
                <th className="p-3.5">Mã phiếu</th>
                <th className="p-3.5">Đơn hàng</th>
                <th className="p-3.5">Khách hàng</th>
                <th className="p-3.5">Phân loại</th>
                <th className="p-3.5">Đánh giá sao</th>
                <th className="p-3.5 max-w-xs">Nội dung phản ánh</th>
                <th className="p-3.5 max-w-xs">Phản hồi của Cửa hàng</th>
                <th className="p-3.5 text-center">Trạng thái</th>
                <th className="p-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-stone-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-red-700 border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang tải danh sách khiếu nại...</span>
                    </div>
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-stone-400">
                    Không có phiếu đánh giá hoặc khiếu nại nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                reviews.map((r) => {
                  const typeCfg = REVIEW_TYPE_CONFIG[r.issueType] || REVIEW_TYPE_CONFIG.RATING;
                  const statusCfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.PENDING;
                  return (
                    <tr key={r._id} className="hover:bg-stone-50/70 transition-colors align-top">
                      <td className="p-3.5 font-mono font-bold text-stone-500">
                        #{r._id.slice(-6).toUpperCase()}
                      </td>

                      <td className="p-3.5 font-mono font-bold text-red-700">
                        {r.order ? r.order.orderCode : <span className="text-stone-400 font-normal">Chung</span>}
                        {r.order && (
                          <span className="block text-[10px] text-stone-400 font-normal">
                            {r.order.items?.map((i) => i.productNameAtTime).slice(0, 2).join(', ')}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <strong className="text-stone-900 block font-semibold">
                          {r.customer?.fullName || 'Khách hàng'}
                        </strong>
                        <span className="font-mono text-stone-400 text-[11px] block">{r.customer?.phone}</span>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${typeCfg.cls}`}>
                          {typeCfg.label}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {r.rating ? (
                          <span className="text-amber-500 font-bold text-sm tracking-wider">
                            {'★'.repeat(r.rating)}
                            <span className="text-stone-300">{'★'.repeat(5 - r.rating)}</span>
                            <span className="text-stone-600 text-xs ml-1 font-mono">({r.rating}/5)</span>
                          </span>
                        ) : (
                          <span className="text-stone-400 font-mono">--</span>
                        )}
                      </td>

                      <td className="p-3.5 max-w-xs text-stone-800 leading-relaxed">
                        <p className="line-clamp-3">{r.content}</p>
                        <span className="block text-[10px] text-stone-400 font-mono mt-1">
                          {fmtDateTime(r.createdAt)}
                        </span>
                      </td>

                      <td className="p-3.5 max-w-xs text-stone-600 leading-relaxed">
                        {r.adminResponse ? (
                          <div>
                            <p className="line-clamp-3 italic text-stone-800 font-medium">"{r.adminResponse}"</p>
                            <span className="block text-[10px] text-stone-400 font-mono mt-1">
                              {r.respondedBy?.fullName ? `${r.respondedBy.fullName} • ` : ''}
                              {fmtDateTime(r.respondedAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic">Chưa có phản hồi</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <Badge className={statusCfg.cls}>{statusCfg.label}</Badge>
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() =>
                            setRespondingItem({
                              review: r,
                              status: r.status === 'PENDING' ? 'RESOLVED' : r.status,
                              response: r.adminResponse || ''
                            })
                          }
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-700 text-red-700 hover:text-white font-bold rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">reply</span>
                          {r.adminResponse ? 'Sửa phản hồi' : 'Xử lý & Phản hồi'}
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

      {/* MODAL: PHẢN HỒI Ý KIẾN KHÁCH HÀNG */}
      {respondingItem && (
        <Modal
          title={`Phản hồi phiếu #${respondingItem.review._id.slice(-6).toUpperCase()} (${
            respondingItem.review.customer?.fullName || 'Khách hàng'
          })`}
          wide
          onClose={() => setRespondingItem(null)}
        >
          <form onSubmit={handleSubmitResponse} className="space-y-4 text-xs">
            {/* Customer Complaint Details Card */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-stone-400">
                  {REVIEW_TYPE_CONFIG[respondingItem.review.issueType]?.label} •{' '}
                  {respondingItem.review.order?.orderCode ? `Đơn ${respondingItem.review.order.orderCode}` : 'Góp ý chung'}
                </span>
                {respondingItem.review.rating && (
                  <span className="text-amber-500 font-bold text-sm">
                    {'★'.repeat(respondingItem.review.rating)}
                  </span>
                )}
              </div>
              <p className="text-stone-900 font-medium text-sm leading-relaxed italic bg-white p-3 rounded-lg border border-stone-200">
                "{respondingItem.review.content}"
              </p>
              <div className="text-[10px] text-stone-400 flex justify-between">
                <span>Khách: {respondingItem.review.customer?.fullName} ({respondingItem.review.customer?.phone})</span>
                <span>Gửi lúc: {fmtDateTime(respondingItem.review.createdAt)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Trạng thái giải quyết *" column="customer_reviews.status">
                <select
                  value={respondingItem.status}
                  onChange={(e) =>
                    setRespondingItem({ ...respondingItem, status: e.target.value as any })
                  }
                  className={inputCls}
                >
                  <option value="RESOLVED">RESOLVED - Đã giải quyết xong</option>
                  <option value="IN_PROGRESS">IN_PROGRESS - Đang tiếp nhận xử lý</option>
                  <option value="REJECTED">REJECTED - Từ chối khiếu nại / Đóng</option>
                </select>
              </Field>
            </div>

            <Field label="Nội dung phản hồi chính thức của Cửa hàng *" column="customer_reviews.adminResponse">
              <textarea
                rows={5}
                required
                value={respondingItem.response}
                onChange={(e) => setRespondingItem({ ...respondingItem, response: e.target.value })}
                placeholder="Nhập lời giải thích, xin lỗi, hoặc phương án giải quyết (ví dụ: bù voucher, đổi món mới...) gửi trực tiếp đến khách hàng..."
                className={inputCls}
              />
            </Field>

            <FormActions
              onCancel={() => setRespondingItem(null)}
              submitLabel="Gửi phản hồi cho khách"
              loading={submitting}
            />
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
};

export default AdminComplaintsPage;
