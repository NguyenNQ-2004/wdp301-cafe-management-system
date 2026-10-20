import React from 'react';
import type { PageRoute, Order } from '../../types';
import { DeliverySidebar } from './DeliverySidebar';
import { useDb } from '../../data/DbContext';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  describeCustomization,
  fmtMoney,
  fmtTime,
  orderItemsOf,
  paymentOf
} from '../../data/dbUtils';

interface DeliveryOrdersPageProps {
  onNavigate: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
}

export const DeliveryOrdersPage: React.FC<DeliveryOrdersPageProps> = ({ onNavigate, onShowToast }) => {
  const { db, session, transact, setOrderStatus } = useDb();
  const me = session.shipperId;
  const online = db.orders.filter(o => o.order_type === 'ONLINE').sort((a, b) => (a.created_at < b.created_at ? -1 : 1));

  const myActive = online.filter(o => o.shipper_id === me && (o.status === 'READY' || o.status === 'DELIVERING'));
  const waitingPickup = online.filter(o => o.shipper_id === null && o.status === 'READY');
  const preparing = online.filter(o => o.shipper_id === null && (o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'PENDING'));
  const myCompleted = online.filter(o => o.shipper_id === me && o.status === 'COMPLETED');
  const spotlight = myActive.find(o => o.status === 'DELIVERING') ?? myActive[0];

  // Tiền mặt COD shipper đang cầm: thanh toán CASH đã thu của đơn mình giao
  const codHolding = myCompleted
    .map(o => paymentOf(db, o.id))
    .filter(p => p && p.payment_method === 'CASH' && p.status === 'SUCCESS')
    .reduce((s, p) => s + (p?.amount ?? 0), 0);

  const codAmount = (o: Order) => {
    const p = paymentOf(db, o.id);
    return p && p.payment_method === 'CASH' && p.status === 'PENDING' ? p.amount : 0;
  };

  const handleClaim = (o: Order) => {
    transact(tx => tx.update('orders', o.id, { shipper_id: me }));
    onShowToast?.(`Đã nhận đơn ${o.order_code}.`);
  };

  const handleStart = (o: Order) => {
    setOrderStatus(o.id, 'DELIVERING');
    onShowToast?.(`Bắt đầu giao đơn ${o.order_code}.`);
  };

  const handleDelivered = (o: Order) => {
    const cod = codAmount(o);
    if (cod > 0 && !confirm(`Xác nhận đã thu ${fmtMoney(cod)} tiền mặt của ${o.recipient_name}?`)) return;
    setOrderStatus(o.id, 'COMPLETED');
    onShowToast?.(`Giao thành công đơn ${o.order_code}${cod > 0 ? `, đã thu ${fmtMoney(cod)}` : ''}.`);
  };

  const OrderRow: React.FC<{ o: Order; action?: React.ReactNode }> = ({ o, action }) => {
    const pay = paymentOf(db, o.id);
    return (
      <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-2 text-xs">
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-stone-800">{o.order_code}</span>
            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${ORDER_STATUS_STYLE[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span>
          </div>
          {pay && (
            <span className={codAmount(o) > 0 ? 'text-primary font-bold' : 'text-emerald-700 font-bold'}>
              {codAmount(o) > 0 ? `Thu COD ${fmtMoney(codAmount(o))}` : `${PAYMENT_METHOD_LABEL[pay.payment_method]} - ${PAYMENT_STATUS_LABEL[pay.status]}`}
            </span>
          )}
        </div>
        <div className="flex justify-between items-center gap-3 pt-1">
          <div>
            <p className="font-bold text-stone-900">
              {o.recipient_name} • {o.recipient_phone}
            </p>
            <p className="text-stone-500">{o.delivery_address}</p>
            <p className="text-stone-400">Đặt lúc {fmtTime(o.created_at)} • {orderItemsOf(db, o.id).length} món</p>
          </div>
          {action}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col lg:flex-row pb-12">
      <DeliverySidebar currentRoute="delivery-orders" onNavigate={onNavigate} onShowToast={onShowToast} />

      <main className="flex-1 p-4 sm:p-6 space-y-4 max-w-7xl">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">Screen 14 • Giao hàng</span>
              <h1 className="text-xl font-bold text-stone-900 mt-1">Đơn giao hàng (Online)</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <button
                onClick={() => onNavigate('delivery-report')}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">warning</span>
                Báo sự cố
              </button>
              <button
                onClick={() => onNavigate('delivery-cod')}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl border border-stone-200 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">payments</span>
                Đối soát COD
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-stone-100">
            {[
              { label: 'Đã giao thành công', value: `${myCompleted.length} đơn` },
              { label: 'Đang giữ / đang giao', value: `${myActive.length} đơn` },
              { label: 'Chờ shipper nhận', value: `${waitingPickup.length} đơn` },
              { label: 'Tiền COD đang cầm', value: fmtMoney(codHolding) }
            ].map(m => (
              <div key={m.label} className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">{m.label}</span>
                <span className="text-lg font-bold text-stone-900 font-mono mt-0.5 block">{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 space-y-4">
            {spotlight ? (
              <div className="bg-white rounded-2xl border-2 border-primary/40 shadow-sm p-5 space-y-4 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                <div className="flex items-center justify-between pb-3 border-b border-stone-100 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-primary text-white font-mono font-bold text-xs">{spotlight.order_code}</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${ORDER_STATUS_STYLE[spotlight.status]}`}>
                      {ORDER_STATUS_LABEL[spotlight.status]}
                    </span>
                  </div>
                  <span className="text-xs text-stone-500 font-mono">Đặt lúc {fmtTime(spotlight.created_at)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                  <div className="sm:col-span-8 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-900">{spotlight.recipient_name}</span>
                      <a
                        href={`tel:${spotlight.recipient_phone}`}
                        className="px-2 py-0.5 rounded bg-stone-100 text-primary font-bold hover:bg-primary hover:text-white transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[13px]">call</span>
                        {spotlight.recipient_phone}
                      </a>
                    </div>
                    <p className="text-stone-600">
                      <strong>Địa chỉ:</strong> {spotlight.delivery_address}
                    </p>
                    {spotlight.order_note && (
                      <p className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">Ghi chú: {spotlight.order_note}</p>
                    )}
                  </div>
                  <div className="sm:col-span-4 bg-stone-50 p-3 rounded-xl border border-stone-200 text-right">
                    <span className="text-[10px] text-stone-400 block font-bold uppercase">Thu tiền mặt (COD)</span>
                    <span className="text-xl font-black text-primary font-mono block">{fmtMoney(codAmount(spotlight))}</span>
                    <span className="text-[10px] text-stone-500">Tổng đơn {fmtMoney(spotlight.final_amount)}</span>
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1.5 text-xs">
                  {orderItemsOf(db, spotlight.id).map(i => (
                    <div key={i.id} className="flex justify-between">
                      <span>
                        <strong>{i.quantity}x</strong> {i.product_name_at_time}
                      </span>
                      <span className="text-stone-500">{describeCustomization(i.customization)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
                  <button onClick={() => onNavigate('delivery-report')} className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                    Báo sự cố
                  </button>
                  {spotlight.status === 'READY' ? (
                    <button
                      onClick={() => handleStart(spotlight)}
                      className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white font-bold shadow-xs flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">two_wheeler</span>
                      Đã lấy hàng, bắt đầu giao
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelivered(spotlight)}
                      className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white font-bold shadow-xs flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">task_alt</span>
                      Giao thành công{codAmount(spotlight) > 0 ? ` & thu ${fmtMoney(codAmount(spotlight))}` : ''}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl border border-stone-200 text-center text-xs text-stone-500">
                Bạn chưa có đơn nào đang giao. Nhận đơn ở danh sách "Chờ shipper nhận".
              </div>
            )}

            {myActive
              .filter(o => o.id !== spotlight?.id)
              .map(o => (
                <OrderRow
                  key={o.id}
                  o={o}
                  action={
                    o.status === 'READY' ? (
                      <button onClick={() => handleStart(o)} className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-primary hover:text-white font-semibold transition-colors">
                        Bắt đầu giao
                      </button>
                    ) : (
                      <button onClick={() => handleDelivered(o)} className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-bold">
                        Đã giao
                      </button>
                    )
                  }
                />
              ))}
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
              <h3 className="font-bold text-sm text-stone-900">Chờ shipper nhận ({waitingPickup.length})</h3>
              {waitingPickup.length === 0 && <p className="text-xs text-stone-400">Không có đơn nào sẵn sàng chờ nhận.</p>}
              {waitingPickup.map(o => (
                <OrderRow
                  key={o.id}
                  o={o}
                  action={
                    <button onClick={() => handleClaim(o)} className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800">
                      Nhận đơn
                    </button>
                  }
                />
              ))}
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
              <h3 className="font-bold text-sm text-stone-900">Đang pha chế tại quán ({preparing.length})</h3>
              {preparing.map(o => (
                <OrderRow key={o.id} o={o} />
              ))}
              {preparing.length === 0 && <p className="text-xs text-stone-400">Không có đơn online nào đang pha.</p>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
