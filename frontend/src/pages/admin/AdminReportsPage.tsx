import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BarChart3, CalendarDays, Package, RefreshCw, Star } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { formatVnd, shopApi } from '../../lib/shopApi';
import { AdminLayout } from './AdminUi';

type ReportFilters = {
  startDate: string;
  endDate: string;
  groupBy: 'day' | 'month';
};

type ReportsData = {
  overview: {
    orderCount: number;
    completedOrderCount: number;
    inProgressCount: number;
    revenue: number;
    averageOrderValue: number;
  };
  revenue: Array<{ period: string; revenue: number; orderCount: number }>;
  paymentMethods: Array<{ method: string; revenue: number; orderCount: number }>;
  salesByOrderType: Array<{ orderType: string; sales: number; orderCount: number }>;
  topProducts: Array<{ productName: string; quantity: number; orderCount: number }>;
  orderStatuses: Array<{ status: string; orderCount: number }>;
  inventory: {
    ingredientCount: number;
    lowStockCount: number;
    lowStockItems: Array<{
      _id: string;
      name: string;
      currentStock: number;
      minStockLevel: number;
      unit: string;
    }>;
  };
  attention: {
    pendingPurchaseOrders: number;
    pendingReviews: number;
  };
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang pha chế',
  READY: 'Sẵn sàng',
  DELIVERING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy'
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: 'Tại quán',
  TAKEAWAY: 'Mang đi',
  ONLINE: 'Giao hàng (online)'
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Tiền mặt',
  COD: 'COD',
  PAY_AT_COUNTER: 'Thanh toán tại quầy',
  VNPAY: 'VNPAY',
  MOMO: 'Ví MoMo',
  BANK_TRANSFER: 'Chuyển khoản',
  DEMO_ONLINE: 'Thanh toán online'
};

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getInitialFilters(): ReportFilters {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { startDate: localDateString(start), endDate: localDateString(end), groupBy: 'day' };
}

function formatPeriod(period: string, groupBy: ReportFilters['groupBy']) {
  if (groupBy === 'month') {
    const [year, month] = period.split('-');
    return `${month}/${year}`;
  }
  const [, month, day] = period.split('-');
  return `${day}/${month}`;
}

const AdminReportsPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const initialFilters = useMemo(() => getInitialFilters(), []);
  const [filters, setFilters] = useState(initialFilters);
  const [report, setReport] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = useCallback(async (requestedFilters: ReportFilters) => {
    if (!user?.token || user.role !== 'ADMIN') {
      navigate('/');
      return;
    }

    const query = new URLSearchParams({
      startDate: requestedFilters.startDate,
      endDate: requestedFilters.endDate,
      groupBy: requestedFilters.groupBy
    });

    try {
      const data = await shopApi<ReportsData>(`/api/reports?${query.toString()}`, { token: user.token });
      setReport(data);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tải báo cáo lúc này.');
    } finally {
      setLoading(false);
    }
  }, [navigate, user]);

  useEffect(() => {
    void loadReport(initialFilters);
  }, [initialFilters, loadReport]);

  const handleFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (filters.startDate > filters.endDate) {
      setError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
      setReport(null);
      return;
    }
    setLoading(true);
    setError('');
    setReport(null);
    void loadReport(filters);
  };

  const revenue = report?.revenue || [];
  const maxRevenue = Math.max(1, ...revenue.map((item) => item.revenue));
  const chartBars = revenue.map((item, index) => {
    const slotWidth = 1000 / Math.max(revenue.length, 1);
    const barWidth = Math.min(64, slotWidth * 0.58);
    const height = (item.revenue / maxRevenue) * 190;
    return {
      ...item,
      x: index * slotWidth + (slotWidth - barWidth) / 2,
      y: 220 - height,
      width: barWidth,
      height
    };
  });
  const chartLabelIndices = revenue.length <= 7
    ? revenue.map((_, index) => index)
    : Array.from({ length: 7 }, (_, index) => Math.round(index * (revenue.length - 1) / 6));
  const maxProductCount = Math.max(1, ...(report?.topProducts || []).map((item) => item.quantity));
  const maxPaymentValue = Math.max(1, ...(report?.paymentMethods || []).map((item) => item.revenue));

  return (
    <AdminLayout
      route="admin-reports"
      table="orders · order_items · payments"
      title="Tổng quan vận hành"
      subtitle="Số liệu được tổng hợp trực tiếp từ dữ liệu đơn hàng, thanh toán và kho."
      onNavigate={(route) => {
        if (route === 'admin') navigate('/admin');
        else if (route.startsWith('admin-')) navigate(`/admin/${route.replace('admin-', '')}`);
        else navigate(`/${route}`);
      }}
      actions={
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[10px] font-semibold text-stone-500">
            Từ ngày
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
              className="h-9 rounded-lg border border-stone-200 bg-white px-2 text-xs text-stone-800"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-semibold text-stone-500">
            Đến ngày
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
              className="h-9 rounded-lg border border-stone-200 bg-white px-2 text-xs text-stone-800"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-semibold text-stone-500">
            Nhóm
            <select
              value={filters.groupBy}
              onChange={(event) => setFilters((current) => ({
                ...current,
                groupBy: event.target.value === 'month' ? 'month' : 'day'
              }))}
              className="h-9 rounded-lg border border-stone-200 bg-white px-2 text-xs text-stone-800"
            >
              <option value="day">Theo ngày</option>
              <option value="month">Theo tháng</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#800020] px-3 text-xs font-semibold text-white hover:bg-[#68001a] disabled:opacity-60"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <CalendarDays size={14} />}
            Lọc
          </button>
        </form>
      }
    >
      <div className="space-y-3">
        {error && (
          <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertTriangle size={18} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void loadReport(filters);
              }}
              className="font-semibold underline"
            >
              Thử lại
            </button>
          </div>
        )}

        {loading && (
          <div role="status" className="grid min-h-56 place-items-center rounded-2xl border border-stone-200 bg-white text-sm text-stone-500">
            <span className="inline-flex items-center gap-2"><RefreshCw size={18} className="animate-spin" /> Đang tải báo cáo…</span>
          </div>
        )}

        {!loading && !error && report && (
          <>
            <section className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Doanh thu (đơn hoàn thành)" value={formatVnd(report.overview.revenue)} detail="Doanh thu đã thanh toán" tone="rose" />
              <SummaryCard label="Số đơn" value={report.overview.orderCount.toLocaleString('vi-VN')} detail={`${report.overview.completedOrderCount} hoàn thành · ${report.orderStatuses.find((item) => item.status === 'CANCELLED')?.orderCount || 0} hủy`} />
              <SummaryCard label="Giá trị TB / đơn" value={formatVnd(report.overview.averageOrderValue)} detail="Trung bình trên đơn hoàn thành" />
              <SummaryCard label="Đang xử lý" value={report.overview.inProgressCount.toLocaleString('vi-VN')} detail="Đơn chưa hoàn thành hoặc hủy" tone="green" />
            </section>

            {report.overview.orderCount === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Chưa có đơn hàng trong khoảng ngày đã chọn. Hãy thử mở rộng khoảng thời gian hoặc thêm dữ liệu demo bằng <code>node seedReportDemo.js</code> trong thư mục backend.
              </div>
            )}

            <section className="admin-reports-main-grid grid min-w-0 gap-3">
              <article className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-stone-900">Doanh thu theo {filters.groupBy === 'day' ? 'ngày' : 'tháng'}</h2>
                    <p className="mt-1 text-xs text-stone-500">Chỉ tính thanh toán thành công của đơn hoàn thành.</p>
                  </div>
                  <BarChart3 className="text-[#800020]" size={20} />
                </div>
                {chartBars.length === 0 ? (
                  <EmptyState message="Chưa có doanh thu hoàn thành trong khoảng thời gian này." />
                ) : (
                  <>
                    <div className="mb-1 flex justify-between text-[10px] text-stone-400">
                      <span>{formatVnd(maxRevenue)}</span><span>{formatVnd(0)}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <svg viewBox="0 0 1000 250" className="min-w-[560px] w-full" role="img" aria-label="Biểu đồ doanh thu theo thời gian">
                        {[30, 80, 130, 180, 220].map((y) => <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke={y === 220 ? '#e7e5e4' : '#f5f5f4'} strokeWidth="1" />)}
                        {chartBars.map((bar) => (
                          <g key={bar.period}>
                            <rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx="8" fill="#b86a75">
                              <title>{`${formatPeriod(bar.period, filters.groupBy)}: ${formatVnd(bar.revenue)} · ${bar.orderCount} đơn`}</title>
                            </rect>
                            {bar.revenue === maxRevenue && (
                              <text x={bar.x + bar.width / 2} y={bar.y - 8} textAnchor="middle" fill="#78716c" fontSize="12">
                                {formatVnd(bar.revenue)}
                              </text>
                            )}
                          </g>
                        ))}
                      </svg>
                    </div>
                    <div className="flex justify-between text-[10px] text-stone-500">
                      {chartLabelIndices.map((index) => <span key={revenue[index].period}>{formatPeriod(revenue[index].period, filters.groupBy)}</span>)}
                    </div>
                  </>
                )}
                <div className="mt-4 grid grid-cols-1 gap-2 border-t border-stone-100 pt-3 sm:grid-cols-3">
                  {report.salesByOrderType.map((item) => (
                    <div key={item.orderType} className="rounded-xl bg-stone-50 px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase text-stone-500">{ORDER_TYPE_LABELS[item.orderType] || item.orderType}</p>
                      <p className="mt-1 text-sm font-bold text-stone-900">{formatVnd(item.sales)}</p>
                      <p className="text-[10px] text-stone-500">{item.orderCount} đơn</p>
                    </div>
                  ))}
                  {report.salesByOrderType.length === 0 && <p className="col-span-3 text-xs text-stone-500">Chưa có doanh số theo loại đơn.</p>}
                </div>
              </article>

              <article className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-stone-900">Top món bán chạy</h2>
                    <p className="mt-1 text-xs text-stone-500">Theo số lượng món trong các đơn không bị hủy.</p>
                  </div>
                  <button type="button" onClick={() => navigate('/admin/products')} className="shrink-0 text-xs font-semibold text-[#800020] hover:underline">
                    Sản phẩm →
                  </button>
                </div>
                {report.topProducts.length === 0 ? (
                  <EmptyState message="Chưa có dữ liệu sản phẩm bán ra." />
                ) : (
                  <ol className="space-y-2.5">
                    {report.topProducts.map((item, index) => (
                      <li key={item.productName}>
                        <div className="mb-1 flex items-center gap-2 text-[11px]">
                          <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#800020] text-[9px] font-bold text-white">{index + 1}</span>
                          <span className="min-w-0 flex-1 truncate font-semibold text-stone-800">{item.productName}</span>
                          <span className="shrink-0 text-stone-500">{item.quantity} phần</span>
                        </div>
                        <div className="ml-6 h-1 overflow-hidden rounded-full bg-stone-100">
                          <div className="h-full rounded-full bg-[#a1082d]" style={{ width: `${Math.max(8, item.quantity / maxProductCount * 100)}%` }} />
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </article>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <article className="rounded-2xl border border-stone-200 bg-white p-4">
                <h2 className="mb-3 font-bold text-stone-900">Thanh toán thành công theo phương thức</h2>
                {report.paymentMethods.length === 0 ? (
                  <EmptyState message="Chưa có thanh toán thành công trong khoảng ngày này." />
                ) : (
                  <ul className="space-y-2.5">
                    {[
                      ...report.paymentMethods,
                      ...(report.paymentMethods.some((item) => ['BANK_TRANSFER', 'DEMO_ONLINE'].includes(item.method))
                        ? []
                        : [{ method: 'BANK_TRANSFER', revenue: 0, orderCount: 0 }])
                    ]
                      .sort((a, b) => {
                        const order = ['CASH', 'VNPAY', 'MOMO', 'BANK_TRANSFER'];
                        return order.indexOf(a.method) - order.indexOf(b.method);
                      })
                      .map((item) => (
                        <li key={item.method}>
                          <div className="mb-1 flex justify-between gap-3 text-xs">
                            <span className="font-medium text-stone-700">{PAYMENT_LABELS[item.method] || item.method}</span>
                            <span className="font-bold text-stone-900">{formatVnd(item.revenue)}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                            <div className="h-full rounded-full bg-amber-700" style={{ width: `${item.revenue ? Math.max(2, item.revenue / maxPaymentValue * 100) : 0}%` }} />
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </article>

              <article className="rounded-2xl border border-stone-200 bg-white p-4">
                <h2 className="mb-3 font-bold text-stone-900">Đơn theo trạng thái</h2>
                {report.orderStatuses.length === 0 ? (
                  <EmptyState message="Không có đơn hàng trong khoảng ngày này." />
                ) : (
                  <ul className="space-y-1.5">
                    {report.orderStatuses.map((item) => (
                      <li key={item.status} className="flex items-center justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2 text-xs">
                        <span className="text-stone-700">{STATUS_LABELS[item.status] || item.status}</span>
                        <span className="font-bold text-stone-900">{item.orderCount}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="rounded-2xl border border-stone-200 bg-white p-4">
                <h2 className="mb-3 font-bold text-stone-900">Cần xử lý</h2>
                <ul className="space-y-2">
                  <li className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs ${report.inventory.lowStockCount ? 'bg-rose-50 text-rose-800' : 'bg-stone-50 text-stone-700'}`}>
                    <span>Nguyên liệu dưới mức tối thiểu</span><strong>{report.inventory.lowStockCount}</strong>
                  </li>
                  <li className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs ${report.attention.pendingPurchaseOrders ? 'bg-amber-50 text-amber-900' : 'bg-stone-50 text-stone-700'}`}>
                    <span>Phiếu nhập cần xử lý</span><strong>{report.attention.pendingPurchaseOrders}</strong>
                  </li>
                  <li className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs ${report.attention.pendingReviews ? 'bg-amber-50 text-amber-900' : 'bg-stone-50 text-stone-700'}`}>
                    <span>Đánh giá / khiếu nại chờ xử lý</span><strong>{report.attention.pendingReviews}</strong>
                  </li>
                </ul>
                {report.inventory.lowStockItems.length > 0 && (
                  <div className="mt-4 border-t border-stone-100 pt-3">
                    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase text-stone-500"><Package size={13} /> Tồn kho thấp</p>
                    <ul className="space-y-1.5">
                      {report.inventory.lowStockItems.slice(0, 4).map((item) => (
                        <li key={item._id} className="flex justify-between gap-3 text-xs text-stone-700">
                          <span className="truncate">{item.name}</span>
                          <span className="shrink-0 text-rose-700">{item.currentStock} / {item.minStockLevel} {item.unit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {report.inventory.ingredientCount === 0 && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-stone-500"><Star size={14} /> Chưa có dữ liệu nguyên liệu.</p>
                )}
              </article>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

function SummaryCard({ label, value, detail, tone = 'default' }: { label: string; value: string; detail: string; tone?: 'default' | 'rose' | 'green' }) {
  const toneClass = tone === 'rose'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : tone === 'green'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-stone-200 bg-stone-50 text-stone-900';
  return (
    <article className={`rounded-xl border p-3 ${toneClass}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">{label}</p>
      </div>
      <p className="text-lg font-black tracking-tight">{value}</p>
      <p className="mt-1 text-[10px] opacity-75">{detail}</p>
    </article>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="grid min-h-28 place-items-center rounded-xl bg-stone-50 px-4 text-center text-xs text-stone-500">{message}</div>;
}

export default AdminReportsPage;
