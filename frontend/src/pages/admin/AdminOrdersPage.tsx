import React, { useState } from 'react';
import type { PageRoute, OrderStatus, OrderType } from '../../types';
import { useDb } from '../../data/DbContext';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  ORDER_TYPE_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_STYLE,
  describeCustomization,
  fmtDateTime,
  fmtMoney,
  orderCustomerName,
  orderItemsOf,
  paymentOf,
  userName
} from '../../data/dbUtils';
import { AdminLayout, Badge, Modal, StatCard, inputCls } from './AdminUi';

interface AdminOrdersPageProps {
  onNavigate?: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
  onOpenBill?: (orderId: string | number) => void;
}

const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export const AdminOrdersPage: React.FC<AdminOrdersPageProps> = ({
  onNavigate = () => {},
  onShowToast,
  onOpenBill
}) => {
  const { db, transact, setOrderStatus, cancelOrder } = useDb();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | OrderType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [detailId, setDetailId] = useState<any>(null);
  const [billModalOrder, setBillModalOrder] = useState<any>(null);

  const shippers = (db.users || []).filter(u => u.position === 'SHIPPER' && u.status === 'ACTIVE');
  const q = search.trim().toLowerCase();

  const orders = [...(db.orders || [])]
    .filter(o => typeFilter === 'all' || o.order_type === typeFilter || o.orderType === typeFilter)
    .filter(o => statusFilter === 'all' || o.status === statusFilter)
    .filter(o => {
      if (!q) return true;
      const phone = o.customer_id
        ? (db.users || []).find(u => u.id === o.customer_id || u._id === o.customer_id)?.phone ?? ''
        : o.recipient_phone ?? o.recipientPhone ?? '';
      const code = (o.order_code ?? o.orderCode ?? '').toLowerCase();
      const customer = orderCustomerName(db, o).toLowerCase();
      return code.includes(q) || phone.includes(q) || customer.includes(q);
    })
    .sort((a, b) => {
      const timeA = new Date(a.created_at ?? a.createdAt ?? 0).getTime();
      const timeB = new Date(b.created_at ?? b.createdAt ?? 0).getTime();
      return timeB - timeA;
    });

  const detail = (db.orders || []).find(o => o.id === detailId || o._id === detailId);
  const revenue = (db.orders || [])
    .filter(o => o.status === 'COMPLETED')
    .reduce((s, o) => s + (o.final_amount ?? o.finalAmount ?? 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <AdminLayout
      route="admin-orders"
      onNavigate={onNavigate}
      onShowToast={onShowToast}
      table="orders, order_items, payments"
      title="Quản lý đơn hàng"
      subtitle="Toàn bộ đơn tại quán, mang đi và giao hàng."
      stats={
        <>
          <StatCard label="Tổng đơn" value={(db.orders || []).length} />
          <StatCard
            label="Đang xử lý"
            value={(db.orders || []).filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status)).length}
            tone="primary"
          />
          <StatCard
            label="Đã hủy"
            value={(db.orders || []).filter(o => o.status === 'CANCELLED').length}
            tone="danger"
          />
          <StatCard
            label="Doanh thu đơn hoàn thành"
            value={fmtMoney(revenue)}
            tone="success"
          />
        </>
      }
    >
      {/* Search and Filters */}
      <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[18px]">
            search
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo mã đơn, tên hoặc SĐT khách..."
            className="w-full pl-9 pr-4 py-2 bg-stone-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#800020]/20 text-stone-900 placeholder:text-stone-400"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
          className="h-9 px-3 rounded-xl border border-stone-200 text-xs bg-white text-stone-700 outline-none focus:ring-2 focus:ring-[#800020]/20"
        >
          <option value="all">Tất cả hình thức</option>
          {(Object.keys(ORDER_TYPE_LABEL) as OrderType[]).map(t => (
            <option key={t} value={t}>
              {ORDER_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="h-9 px-3 rounded-xl border border-stone-200 text-xs bg-white text-stone-700 outline-none focus:ring-2 focus:ring-[#800020]/20"
        >
          <option value="all">Tất cả trạng thái</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-100">
              <tr>
                <th className="p-4">Mã đơn</th>
                <th className="p-4">Thời gian</th>
                <th className="p-4">Hình thức</th>
                <th className="p-4">Khách hàng</th>
                <th className="p-4">Thu ngân / Shipper</th>
                <th className="p-4 text-right">Thành tiền</th>
                <th className="p-4">Thanh toán</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-stone-400">
                    <span className="material-symbols-outlined text-4xl block mb-2 text-stone-300">
                      receipt_long
                    </span>
                    Không tìm thấy đơn hàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                orders.map(o => {
                  const pay = paymentOf(db, o.id ?? o._id);
                  const orderType = (o.order_type ?? o.orderType ?? 'DINE_IN') as OrderType;
                  const orderStatus = (o.status ?? 'PENDING') as OrderStatus;
                  const finalAmount = o.final_amount ?? o.finalAmount ?? 0;
                  const tableNum = o.table_number ?? o.tableNumber;
                  const cashierId = o.cashier_id ?? o.cashier?._id ?? o.cashier;
                  const shipperId = o.shipper_id ?? o.shipper?._id ?? o.shipper;

                  return (
                    <tr
                      key={o.id ?? o._id}
                      className={`hover:bg-stone-50/70 transition-colors ${
                        orderStatus === 'CANCELLED' ? 'opacity-60 bg-stone-50/30' : ''
                      }`}
                    >
                      <td className="p-4 font-bold text-stone-900 font-mono tracking-tight">
                        {o.order_code ?? o.orderCode}
                      </td>
                      <td className="p-4 text-stone-500">{fmtDateTime(o.created_at ?? o.createdAt)}</td>
                      <td className="p-4">
                        <Badge className="bg-stone-100 text-stone-700 border border-stone-200">
                          {ORDER_TYPE_LABEL[orderType] ?? orderType}
                        </Badge>
                        {tableNum && <span className="ml-1.5 text-stone-500 font-medium">Bàn {tableNum}</span>}
                      </td>
                      <td className="p-4 text-stone-800 font-medium">{orderCustomerName(db, o)}</td>
                      <td className="p-4 text-stone-500">
                        <div>{userName(db, cashierId, 'Online')}</div>
                        {shipperId && (
                          <div className="text-[11px] text-stone-400 mt-0.5">
                            Ship: <span className="text-stone-600 font-medium">{userName(db, shipperId)}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-stone-900">
                        {fmtMoney(finalAmount)}
                      </td>
                      <td className="p-4">
                        {pay ? (
                          <div className="space-y-1">
                            <span className="block text-[11px] text-stone-600 font-medium">
                              {PAYMENT_METHOD_LABEL[pay.payment_method] ?? pay.payment_method}
                            </span>
                            <Badge className={PAYMENT_STATUS_STYLE[pay.status] ?? 'bg-stone-100 text-stone-700'}>
                              {PAYMENT_STATUS_LABEL[pay.status] ?? pay.status}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge className={ORDER_STATUS_STYLE[orderStatus] ?? 'bg-stone-100 text-stone-700'}>
                          {ORDER_STATUS_LABEL[orderStatus] ?? orderStatus}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setDetailId(o.id ?? o._id)}
                          className="px-2.5 py-1 text-[#800020] hover:text-white hover:bg-[#800020] rounded-lg font-bold transition-all cursor-pointer"
                        >
                          Xem
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

      {/* Order Detail Modal */}
      {detail && (
        <Modal
          title={`Chi tiết Đơn hàng: ${detail.order_code ?? detail.orderCode}`}
          onClose={() => setDetailId(null)}
          wide
        >
          <div className="space-y-4 text-xs">
            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-stone-50 rounded-xl border border-stone-100">
              <span>
                Hình thức:{' '}
                <strong>
                  {ORDER_TYPE_LABEL[(detail.order_type ?? detail.orderType) as OrderType] ??
                    (detail.order_type ?? detail.orderType)}
                </strong>
              </span>
              <span>
                Thời gian: <strong>{fmtDateTime(detail.created_at ?? detail.createdAt)}</strong>
              </span>
              <span>
                Khách hàng: <strong>{orderCustomerName(db, detail)}</strong>
              </span>
              <span>
                Thu ngân:{' '}
                <strong>{userName(db, detail.cashier_id ?? detail.cashier, 'Đặt online')}</strong>
              </span>
              {(detail.table_number || detail.tableNumber) && (
                <span>
                  Bàn: <strong>{detail.table_number ?? detail.tableNumber}</strong>
                </span>
              )}
              {(detail.delivery_address || detail.deliveryAddress) && (
                <span className="col-span-2">
                  Giao tới:{' '}
                  <strong>
                    {detail.recipient_name ?? detail.recipientName} • {detail.recipient_phone ?? detail.recipientPhone} •{' '}
                    {detail.delivery_address ?? detail.deliveryAddress}
                  </strong>
                </span>
              )}
              {(detail.order_note || detail.orderNote) && (
                <span className="col-span-2 text-stone-600">
                  Ghi chú: <strong>{detail.order_note ?? detail.orderNote}</strong>
                </span>
              )}
              {(detail.cancel_reason || detail.cancelReason) && (
                <span className="col-span-2 text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                  Lý do hủy: <strong>{detail.cancel_reason ?? detail.cancelReason}</strong>
                </span>
              )}
            </div>

            {/* Items Table */}
            <table className="w-full text-left">
              <thead className="text-stone-500 text-[10px] uppercase border-b border-stone-200 bg-stone-50/50">
                <tr>
                  <th className="py-2 px-2">Món</th>
                  <th className="py-2 text-center">SL</th>
                  <th className="py-2 text-right">Đơn giá</th>
                  <th className="py-2 text-right">Thành tiền</th>
                  <th className="py-2 text-center">Đã pha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orderItemsOf(db, detail.id ?? detail._id).map((it, idx) => (
                  <tr key={it.id ?? idx} className="hover:bg-stone-50/50">
                    <td className="py-2.5 px-2">
                      <strong className="text-stone-800">{it.product_name_at_time}</strong>
                      <span className="block text-[10px] text-stone-400">
                        {describeCustomization(it.customization)}
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-mono font-medium">{it.quantity}</td>
                    <td className="py-2.5 text-right font-mono text-stone-600">{fmtMoney(it.unit_price)}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-stone-900">
                      {fmtMoney(it.subtotal)}
                    </td>
                    <td className="py-2.5 text-center">
                      {it.is_prepared ? (
                        <span className="text-emerald-600 font-bold">✓</span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Amount Summary */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-stone-50 rounded-xl font-mono text-stone-700 border border-stone-100">
              <span>Tiền hàng: {fmtMoney(detail.total_amount ?? detail.totalAmount)}</span>
              <span>
                Giảm giá: -{fmtMoney(detail.discount_amount ?? detail.discountAmount ?? 0)}
              </span>
              <span>
                Phí giao hàng: +{fmtMoney(detail.delivery_fee ?? detail.deliveryFee ?? 0)}
              </span>
              <span className="font-bold text-[#800020] text-sm">
                Tổng thanh toán: {fmtMoney(detail.final_amount ?? detail.finalAmount)}
              </span>
            </div>

            {/* Action Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="space-y-1 block">
                <span className="font-bold text-stone-600">Trạng thái đơn (status)</span>
                <select
                  value={detail.status}
                  onChange={e => {
                    const status = e.target.value as OrderStatus;
                    const orderId = detail.id ?? detail._id;
                    if (status === 'CANCELLED') {
                      const reason = prompt('Lý do hủy đơn:');
                      if (reason) {
                        cancelOrder(orderId, reason);
                        onShowToast?.(`Đã hủy đơn ${detail.order_code ?? detail.orderCode}.`);
                      }
                    } else {
                      setOrderStatus(orderId, status);
                      onShowToast?.(
                        `Đã cập nhật trạng thái ${detail.order_code ?? detail.orderCode} -> ${
                          ORDER_STATUS_LABEL[status]
                        }.`
                      );
                    }
                  }}
                  className={inputCls}
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>
                      {s} - {ORDER_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>

              {(detail.order_type === 'ONLINE' || detail.orderType === 'ONLINE') && (
                <label className="space-y-1 block">
                  <span className="font-bold text-stone-600">Shipper (shipper_id)</span>
                  <select
                    value={detail.shipper_id ?? detail.shipper?._id ?? detail.shipper ?? ''}
                    onChange={e => {
                      const orderId = detail.id ?? detail._id;
                      transact(tx =>
                        tx.update('orders', orderId, {
                          shipper_id: e.target.value || null,
                          shipperId: e.target.value || null
                        })
                      );
                      onShowToast?.('Đã cập nhật nhân viên giao hàng.');
                    }}
                    className={inputCls}
                  >
                    <option value="">-- Chưa gán --</option>
                    {shippers.map(s => (
                      <option key={s.id ?? s._id} value={s.id ?? s._id}>
                        {s.full_name ?? s.fullName} ({s.phone})
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDetailId(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = detail.id ?? detail._id;
                  if (onOpenBill) {
                    onOpenBill(targetId);
                  }
                  setBillModalOrder(detail);
                }}
                className="px-4 py-2 rounded-xl bg-[#800020] hover:bg-[#68001a] text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">receipt</span>
                Xem hóa đơn
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bill / Receipt Printable Modal */}
      {billModalOrder && (
        <Modal
          title={`Hóa đơn thanh toán - ${billModalOrder.order_code ?? billModalOrder.orderCode}`}
          onClose={() => setBillModalOrder(null)}
        >
          <div className="space-y-4 text-xs font-mono text-stone-800" id="aura-printable-receipt">
            <div className="text-center pb-3 border-b border-dashed border-stone-300">
              <div className="text-base font-bold tracking-wider text-[#800020]">AURA CAFÉ</div>
              <div className="text-[11px] text-stone-500 font-sans">
                Số 123 Đường Cà Phê, Quận 1, TP. Hồ Chí Minh
              </div>
              <div className="text-[11px] text-stone-500 font-sans">Hotline: 1900 6868</div>
              <div className="mt-2 text-xs font-bold font-sans">HÓA ĐƠN BÁN HÀNG</div>
            </div>

            <div className="space-y-1 text-[11px]">
              <div>
                Mã HĐ: <strong>{billModalOrder.order_code ?? billModalOrder.orderCode}</strong>
              </div>
              <div>
                Thời gian: <strong>{fmtDateTime(billModalOrder.created_at ?? billModalOrder.createdAt)}</strong>
              </div>
              <div>
                Hình thức:{' '}
                <strong>
                  {ORDER_TYPE_LABEL[(billModalOrder.order_type ?? billModalOrder.orderType) as OrderType]}
                </strong>
                {(billModalOrder.table_number || billModalOrder.tableNumber) && (
                  <span> - Bàn {billModalOrder.table_number ?? billModalOrder.tableNumber}</span>
                )}
              </div>
              <div>
                Khách hàng: <strong>{orderCustomerName(db, billModalOrder)}</strong>
              </div>
              {(billModalOrder.recipient_phone || billModalOrder.recipientPhone) && (
                <div>
                  SĐT: <strong>{billModalOrder.recipient_phone ?? billModalOrder.recipientPhone}</strong>
                </div>
              )}
              {(billModalOrder.delivery_address || billModalOrder.deliveryAddress) && (
                <div>
                  Địa chỉ: <strong>{billModalOrder.delivery_address ?? billModalOrder.deliveryAddress}</strong>
                </div>
              )}
            </div>

            <div className="border-t border-b border-dashed border-stone-300 py-2">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 text-[10px]">
                    <th className="py-1">Món</th>
                    <th className="py-1 text-center">SL</th>
                    <th className="py-1 text-right">Đơn giá</th>
                    <th className="py-1 text-right">T.Tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {orderItemsOf(db, billModalOrder.id ?? billModalOrder._id).map((it, idx) => (
                    <tr key={it.id ?? idx}>
                      <td className="py-1.5 pr-2">
                        <div className="font-sans font-bold">{it.product_name_at_time}</div>
                        <div className="text-[10px] text-stone-400">
                          {describeCustomization(it.customization)}
                        </div>
                      </td>
                      <td className="py-1.5 text-center">{it.quantity}</td>
                      <td className="py-1.5 text-right">{fmtMoney(it.unit_price)}</td>
                      <td className="py-1.5 text-right font-bold">{fmtMoney(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span>Tiền hàng:</span>
                <span>{fmtMoney(billModalOrder.total_amount ?? billModalOrder.totalAmount)}</span>
              </div>
              {(billModalOrder.discount_amount || billModalOrder.discountAmount) ? (
                <div className="flex justify-between text-rose-700">
                  <span>Giảm giá:</span>
                  <span>-{fmtMoney(billModalOrder.discount_amount ?? billModalOrder.discountAmount)}</span>
                </div>
              ) : null}
              {(billModalOrder.delivery_fee || billModalOrder.deliveryFee) ? (
                <div className="flex justify-between">
                  <span>Phí giao hàng:</span>
                  <span>+{fmtMoney(billModalOrder.delivery_fee ?? billModalOrder.deliveryFee)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-stone-300 text-[#800020]">
                <span>TỔNG CỘNG:</span>
                <span>{fmtMoney(billModalOrder.final_amount ?? billModalOrder.finalAmount)}</span>
              </div>
            </div>

            <div className="text-center pt-3 border-t border-dashed border-stone-300 text-stone-500 font-sans text-[11px] space-y-1">
              <div>Cảm ơn quý khách và hẹn gặp lại!</div>
              <div className="text-[10px] text-stone-400">Wifi: AuraCafe_Guest | Pass: auracafe123</div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 font-sans">
              <button
                type="button"
                onClick={() => setBillModalOrder(null)}
                className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-1.5 rounded-xl bg-[#800020] hover:bg-[#68001a] text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                In hóa đơn
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
};

export default AdminOrdersPage;
