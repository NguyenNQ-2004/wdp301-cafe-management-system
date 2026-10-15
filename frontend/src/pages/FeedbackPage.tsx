import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

interface OrderItem {
  _id: string;
  orderCode: string;
  finalAmount: number;
  status: string;
  createdAt: string;
}

interface MyReviewItem {
  _id: string;
  order?: {
    _id: string;
    orderCode: string;
  };
  issueType: 'RATING' | 'COMPLAINT';
  rating?: number;
  topic?: string;
  content: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  adminResponse?: string;
  respondedAt?: string;
  createdAt: string;
}

const COMPLAINT_TOPICS = [
  'Sai món / sai size',
  'Hương vị chưa đạt',
  'Giao trễ / đổ vỡ',
  'Thái độ phục vụ',
  'Thiếu dụng cụ kèm theo',
  'Vấn đề thanh toán'
];

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: 'Rất không hài lòng',
  2: 'Chưa đạt yêu cầu',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Rất tuyệt vời, hương vị hảo hạng!'
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ cửa hàng xử lý', cls: 'bg-rose-100 text-rose-800' },
  IN_PROGRESS: { label: 'Đang giải quyết', cls: 'bg-amber-100 text-amber-800' },
  RESOLVED: { label: 'Đã giải quyết', cls: 'bg-emerald-100 text-emerald-800 font-bold' },
  REJECTED: { label: 'Đã đóng phiếu', cls: 'bg-stone-200 text-stone-600' }
};

const fmtDateTime = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

export const FeedbackPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [myReviews, setMyReviews] = useState<MyReviewItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [issueType, setIssueType] = useState<'RATING' | 'COMPLAINT'>('RATING');
  const [rating, setRating] = useState<number>(5);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Customer's Orders
  const fetchMyOrders = useCallback(async () => {
    if (!user?.token) return;
    setLoadingOrders(true);
    try {
      const res = await fetch('http://localhost:5000/api/customer-reviews/my-orders', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setOrders(data);
        if (data.length > 0 && !selectedOrderId) {
          setSelectedOrderId(data[0]._id);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  }, [user?.token, selectedOrderId]);

  // Fetch Customer's Past Reviews
  const fetchMyReviews = useCallback(async () => {
    if (!user?.token) return;
    setLoadingReviews(true);
    try {
      const res = await fetch('http://localhost:5000/api/customer-reviews', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.reviews)) {
        setMyReviews(data.reviews);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingReviews(false);
    }
  }, [user?.token]);

  useEffect(() => {
    if (user?.token) {
      fetchMyOrders();
      fetchMyReviews();
    }
  }, [user?.token, fetchMyOrders, fetchMyReviews]);

  // Handle Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Vui lòng đăng nhập để gửi đánh giá hoặc khiếu nại.', 'error');
      return;
    }
    if (!content.trim()) {
      showToast('Vui lòng nhập nội dung đánh giá hoặc phản ánh chi tiết.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        orderId: selectedOrderId || undefined,
        issueType,
        rating: issueType === 'RATING' ? rating : undefined,
        topic: issueType === 'COMPLAINT' ? selectedTopic : undefined,
        content: content.trim()
      };

      const res = await fetch('http://localhost:5000/api/customer-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi gửi phản ánh');

      showToast(data.message || 'Gửi phản hồi thành công!');
      setContent('');
      setSelectedTopic('');
      fetchMyReviews();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-20 pt-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-stone-500 py-3 mb-2 font-medium">
          <button
            onClick={() => navigate('/')}
            className="hover:text-red-700 transition-colors cursor-pointer"
          >
            Trang chủ
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-stone-900 font-semibold">Đánh giá & Chăm sóc khách hàng</span>
        </div>

        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-stone-950 via-red-900 to-stone-900 rounded-3xl p-6 sm:p-8 text-white mb-8 shadow-md relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 border border-white/20 shadow-inner">
                <span className="material-symbols-outlined text-4xl">support_agent</span>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Đánh giá & Chăm sóc khách hàng Aura
                </h1>
                <p className="text-xs sm:text-sm text-stone-200 mt-1 max-w-xl leading-relaxed">
                  Ý kiến của bạn là điều vô giá giúp Aura Café ngày một hoàn thiện. Quản lý cửa hàng sẽ phản hồi trực tiếp mọi thắc mắc và giải quyết thỏa đáng.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="tel:19006868"
                className="px-4 py-2.5 rounded-xl bg-white text-red-900 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm hover:bg-stone-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">call</span>
                Hotline 1900 6868
              </a>
              <button
                onClick={() => showToast('Kênh chat trực tuyến đang mở hỗ trợ 24/7!')}
                className="px-4 py-2.5 rounded-xl bg-white/15 backdrop-blur-md text-white border border-white/25 font-bold text-xs sm:text-sm flex items-center gap-2 hover:bg-white/25 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                Hỗ trợ trực tuyến
              </button>
            </div>
          </div>
        </div>

        {/* Toast Alert */}
        {toast && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold mb-6 flex items-center justify-between border shadow-sm ${
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

        {/* 2 Columns: Form & History */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Feedback Form (7 cols) */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-2xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-700 text-[22px]">rate_review</span>
                Gửi đánh giá hoặc phản ánh sự cố
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Chọn đơn hàng bạn đã mua để đánh giá hương vị hoặc báo cáo sự cố nếu có.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">Loại phản hồi *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIssueType('RATING')}
                    className={`p-3 rounded-2xl border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      issueType === 'RATING'
                        ? 'border-red-700 bg-red-50 text-red-800 shadow-2xs'
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] text-amber-500">stars</span>
                    <span>Đánh giá sao (RATING)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIssueType('COMPLAINT')}
                    className={`p-3 rounded-2xl border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      issueType === 'COMPLAINT'
                        ? 'border-red-700 bg-red-50 text-red-800 shadow-2xs'
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] text-red-600">report_problem</span>
                    <span>Khiếu nại sự cố (COMPLAINT)</span>
                  </button>
                </div>
              </div>

              {/* Order Select */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Đơn hàng cần đánh giá / khiếu nại
                </label>
                {loadingOrders ? (
                  <p className="text-stone-400">Đang tải danh sách đơn hàng của bạn...</p>
                ) : orders.length > 0 ? (
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 font-medium outline-none focus:border-red-700 transition-colors"
                  >
                    <option value="">-- Đóng góp ý kiến chung (Không gắn đơn cụ thể) --</option>
                    {orders.map((o) => (
                      <option key={o._id} value={o._id}>
                        {o.orderCode} • {new Intl.NumberFormat('vi-VN').format(o.finalAmount)}₫ •{' '}
                        {fmtDateTime(o.createdAt)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-stone-400 italic">
                    Bạn chưa có đơn hàng nào, phản hồi sẽ được ghi nhận dưới dạng góp ý chung.
                  </p>
                )}
              </div>

              {/* RATING: Interactive Stars */}
              {issueType === 'RATING' && (
                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-2">
                  <label className="block text-xs font-bold text-stone-700 text-center">
                    Chất lượng phục vụ & đồ uống của bạn:
                  </label>
                  <div className="flex items-center justify-center gap-2 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="text-3xl text-amber-400 hover:scale-125 transition-transform cursor-pointer p-1"
                      >
                        {star <= rating ? '★' : '☆'}
                      </button>
                    ))}
                  </div>
                  <p className="text-center font-bold text-amber-900 text-xs">
                    {rating} / 5 sao — {RATING_DESCRIPTIONS[rating]}
                  </p>
                </div>
              )}

              {/* COMPLAINT: Suggestion Topics */}
              {issueType === 'COMPLAINT' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Chủ đề sự cố gặp phải:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COMPLAINT_TOPICS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTopic(t)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          selectedTopic === t
                            ? 'bg-red-700 text-white border-red-700 shadow-2xs'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Textarea */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nội dung chi tiết *
                </label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    issueType === 'RATING'
                      ? 'Chia sẻ cảm nhận về hương vị cà phê, không gian hoặc sự nhiệt tình của nhân viên...'
                      : 'Mô tả chi tiết sự cố bạn gặp phải để cửa hàng nhanh chóng giải quyết và bù đắp...'
                  }
                  className="w-full p-3.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 outline-none focus:border-red-700 focus:bg-white transition-colors"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 text-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  {submitting ? 'Đang gửi...' : 'Gửi phản hồi cho Aura'}
                </button>
              </div>
            </form>
          </div>

          {/* Right: History of Customer's Reviews & Responses (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs">
              <h3 className="font-bold text-stone-900 text-sm flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-blue-600 text-[20px]">mark_email_read</span>
                  Lịch sử phản hồi của bạn ({myReviews.length})
                </span>
                <button
                  onClick={fetchMyReviews}
                  className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition-colors"
                  title="Tải lại lịch sử"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                </button>
              </h3>

              {loadingReviews ? (
                <div className="p-8 text-center text-stone-400 text-xs">
                  <span className="w-4 h-4 border-2 border-red-700 border-t-transparent rounded-full animate-spin inline-block mr-2"></span>
                  Đang tải lịch sử phản hồi...
                </div>
              ) : myReviews.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs">
                  <span className="material-symbols-outlined text-3xl mb-1 text-stone-300 block">chat_bubble_outline</span>
                  Bạn chưa gửi đánh giá hoặc khiếu nại nào.
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
                  {myReviews.map((r) => {
                    const st = STATUS_BADGE[r.status] || STATUS_BADGE.PENDING;
                    return (
                      <div
                        key={r._id}
                        className="p-4 rounded-2xl border border-stone-200 bg-stone-50/70 space-y-2.5 text-xs transition-all hover:bg-stone-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-stone-800 block text-[11px]">
                              {r.issueType === 'RATING' ? 'Đánh giá chất lượng' : 'Khiếu nại sự cố'}
                              {r.order?.orderCode ? ` • Đơn #${r.order.orderCode}` : ''}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              {fmtDateTime(r.createdAt)}
                            </span>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${st.cls}`}>
                            {st.label}
                          </span>
                        </div>

                        {r.rating && (
                          <div className="text-amber-500 font-bold text-sm tracking-wider">
                            {'★'.repeat(r.rating)}
                            <span className="text-stone-300">{'★'.repeat(5 - r.rating)}</span>
                          </div>
                        )}

                        <p className="text-stone-800 leading-relaxed font-medium bg-white p-2.5 rounded-xl border border-stone-200">
                          {r.content}
                        </p>

                        {/* Store Response from Admin */}
                        {r.adminResponse ? (
                          <div className="p-3 bg-red-50/60 rounded-xl border border-red-200/80 space-y-1">
                            <span className="font-bold text-red-900 text-[11px] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">storefront</span>
                              Phản hồi từ Quản trị viên Aura:
                            </span>
                            <p className="text-stone-800 italic leading-relaxed">
                              "{r.adminResponse}"
                            </p>
                            {r.respondedAt && (
                              <span className="text-[9px] text-stone-400 block font-mono">
                                {fmtDateTime(r.respondedAt)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-stone-400 italic flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
                            Đang chờ quản lý tiếp nhận xử lý...
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;
