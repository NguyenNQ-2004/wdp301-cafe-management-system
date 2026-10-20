import React, { useMemo, useState } from 'react';
import type { PageRoute, Order, OrderItem } from '../../types';
import { KdsHeader } from './KdsHeader';
import { useDb } from '../../data/DbContext';
import { ORDER_STATUS_LABEL, ORDER_TYPE_LABEL, customizationTags, describeCustomization, fmtTime, orderCustomerName } from '../../data/dbUtils';

interface KdsTerminalPageProps {
  onNavigate: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
}

// Chỉ làm kèm món cho vài đơn xếp ngay sau đơn đang tới lượt, để đơn đến trước không bị đơn đến sau vượt mặt
const BATCH_LOOKAHEAD_ORDERS = 3;

const TYPE_ACCENT: Record<Order['order_type'], string> = {
  DINE_IN: 'bg-amber-500',
  TAKEAWAY: 'bg-stone-500',
  ONLINE: 'bg-blue-600'
};

const byCreated = (a: Order, b: Order) => (a.created_at === b.created_at ? a.id - b.id : a.created_at < b.created_at ? -1 : 1);

export const KdsTerminalPage: React.FC<KdsTerminalPageProps> = ({ onNavigate, onShowToast }) => {
  const { db, transact, setOrderStatus } = useDb();
  const [viewMode, setViewMode] = useState<'by-order' | 'by-item'>('by-order');
  const [isBatchPanelCollapsed, setIsBatchPanelCollapsed] = useState(false);
  const [batchSelected, setBatchSelected] = useState<Set<number>>(new Set()); // order_items.id

  const itemsOf = (orderId: number) => db.order_items.filter(i => i.order_id === orderId);

  // Hàng đợi KDS: đơn CONFIRMED / PREPARING, đến trước làm trước
  const activeOrders = db.orders.filter(o => o.status === 'CONFIRMED' || o.status === 'PREPARING').sort(byCreated);
  const readyOrders = db.orders
    .filter(o => o.status === 'READY')
    .sort((a, b) => -byCreated(a, b))
    .slice(0, 4);

  // ---------- Thao tác ghi xuống database ----------

  // Tích món: cập nhật order_items.is_prepared, đơn CONFIRMED chuyển sang PREPARING
  const markItems = (itemIds: number[], prepared: boolean) =>
    transact(tx => {
      itemIds.forEach(id => tx.update('order_items', id, { is_prepared: prepared }));
      const orderIds = new Set(tx.db().order_items.filter(i => itemIds.includes(i.id)).map(i => i.order_id));
      orderIds.forEach(oid => {
        const o = tx.db().orders.find(x => x.id === oid);
        if (o?.status === 'CONFIRMED' && prepared) tx.update('orders', oid, { status: 'PREPARING' });
      });
    });

  const handleToggleItem = (item: OrderItem) => {
    markItems([item.id], !item.is_prepared);
  };

  const handleCompleteOrder = (o: Order) => {
    const pending = itemsOf(o.id).filter(i => !i.is_prepared);
    if (pending.length) {
      transact(tx => pending.forEach(i => tx.update('order_items', i.id, { is_prepared: true })));
    }
    setOrderStatus(o.id, 'READY');
    onShowToast?.(
      o.order_type === 'ONLINE'
        ? `Đơn ${o.order_code} đã sẵn sàng, chờ shipper nhận.`
        : `Đơn ${o.order_code} đã sẵn sàng trả khách.`
    );
  };

  const handleRecall = (o: Order) => {
    setOrderStatus(o.id, 'PREPARING');
    onShowToast?.(`Đã mở lại đơn ${o.order_code} để pha lại.`);
  };

  // ---------- Mẻ pha tiếp theo (đến trước làm trước) ----------
  const batchPlan = useMemo(() => {
    const queue = activeOrders.filter(o => itemsOf(o.id).some(i => !i.is_prepared));
    const [current, ...rest] = queue;
    if (!current) return null;
    const nearby = rest.slice(0, BATCH_LOOKAHEAD_ORDERS);
    const farther = rest.slice(BATCH_LOOKAHEAD_ORDERS);

    type Line = { item: OrderItem; order: Order };
    const groups = new Map<number, { productId: number; name: string; currentLines: Line[]; extraLines: Line[]; laterQty: number; laterCodes: string[] }>();

    itemsOf(current.id)
      .filter(i => !i.is_prepared)
      .forEach(item => {
        if (!groups.has(item.product_id)) {
          groups.set(item.product_id, { productId: item.product_id, name: item.product_name_at_time, currentLines: [], extraLines: [], laterQty: 0, laterCodes: [] });
        }
        groups.get(item.product_id)!.currentLines.push({ item, order: current });
      });
    nearby.forEach(order =>
      itemsOf(order.id)
        .filter(i => !i.is_prepared && groups.has(i.product_id))
        .forEach(item => groups.get(item.product_id)!.extraLines.push({ item, order }))
    );
    farther.forEach(order =>
      itemsOf(order.id)
        .filter(i => !i.is_prepared && groups.has(i.product_id))
        .forEach(item => {
          const g = groups.get(item.product_id)!;
          g.laterQty += item.quantity;
          if (!g.laterCodes.includes(order.order_code)) g.laterCodes.push(order.order_code);
        })
    );

    return {
      current,
      nextCodes: nearby.map(o => o.order_code),
      groups: [...groups.values()].map(g => {
        const lines = [...g.currentLines, ...g.extraLines];
        return {
          ...g,
          lines,
          totalQty: lines.reduce((s, l) => s + l.item.quantity, 0),
          variantCount: new Set(lines.map(l => describeCustomization(l.item.customization))).size
        };
      })
    };
  }, [db.orders, db.order_items]);

  const allBatchLines = batchPlan ? batchPlan.groups.flatMap(g => g.lines) : [];
  const selectedBatchLines = allBatchLines.filter(l => batchSelected.has(l.item.id));
  const selectedBatchCups = selectedBatchLines.reduce((s, l) => s + l.item.quantity, 0);
  const selectedBatchOrders = new Set(selectedBatchLines.map(l => l.order.id)).size;
  const isAllBatchSelected = allBatchLines.length > 0 && selectedBatchLines.length === allBatchLines.length;

  const toggleBatch = (ids: number[], select: boolean) =>
    setBatchSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => (select ? next.add(id) : next.delete(id)));
      return next;
    });

  const handleApplyBatchDone = () => {
    if (selectedBatchLines.length === 0) return;
    const ids = selectedBatchLines.map(l => l.item.id);
    const readyCodes = activeOrders
      .filter(o => {
        const its = itemsOf(o.id);
        return its.some(i => ids.includes(i.id)) && its.every(i => i.is_prepared || ids.includes(i.id));
      })
      .map(o => o.order_code);
    markItems(ids, true);
    setBatchSelected(new Set());
    onShowToast?.(
      `Đã tích xong ${selectedBatchCups} phần trên ${selectedBatchOrders} đơn.` +
        (readyCodes.length ? ` Đủ món: ${readyCodes.join(', ')} – bấm Hoàn tất đơn.` : '')
    );
  };

  // ---------- Chế độ Gom món: cộng dồn món chưa pha theo thứ tự đơn đến ----------
  const groupedItems = useMemo(() => {
    const groups = new Map<string, { name: string; tags: string[]; itemIds: number[]; totalQty: number; codes: string[]; firstAt: string }>();
    activeOrders.forEach(o =>
      itemsOf(o.id)
        .filter(i => !i.is_prepared)
        .forEach(i => {
          const desc = describeCustomization(i.customization);
          const key = `${i.product_id}|${desc}`;
          if (!groups.has(key)) groups.set(key, { name: i.product_name_at_time, tags: customizationTags(i.customization), itemIds: [], totalQty: 0, codes: [], firstAt: o.created_at });
          const g = groups.get(key)!;
          g.itemIds.push(i.id);
          g.totalQty += i.quantity;
          if (!g.codes.includes(o.order_code)) g.codes.push(o.order_code);
        })
    );
    return [...groups.values()].sort((a, b) => (a.firstAt < b.firstAt ? -1 : 1));
  }, [db.orders, db.order_items]);

  const pendingItems = activeOrders.flatMap(o => itemsOf(o.id)).filter(i => !i.is_prepared);

  const renderBatchLine = (line: { item: OrderItem; order: Order }) => {
    const isSelected = batchSelected.has(line.item.id);
    return (
      <label
        key={line.item.id}
        className={`flex items-start gap-2.5 pl-5 pr-2.5 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50/60' : 'bg-white hover:bg-stone-50'}`}
      >
        <input
          type="checkbox"
          className="w-4 h-4 mt-0.5 accent-primary shrink-0"
          checked={isSelected}
          onChange={e => toggleBatch([line.item.id], e.target.checked)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="font-mono font-bold text-primary">{line.order.order_code}</span>
            <span className="font-mono font-bold text-stone-900">{line.item.quantity}x</span>
            <span className="text-stone-500 truncate">
              {ORDER_TYPE_LABEL[line.order.order_type]}
              {line.order.table_number ? ` • Bàn ${line.order.table_number}` : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {customizationTags(line.item.customization).map((tg, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-stone-100 text-[10px] text-stone-600 border border-stone-200">{tg}</span>
            ))}
          </div>
        </div>
      </label>
    );
  };

  return (
    <div className="min-h-screen bg-stone-100 pb-16 flex flex-col">
      <KdsHeader currentRoute="kds-terminal" onNavigate={onNavigate} onShowToast={onShowToast} />

      {/* Metrics từ orders / order_items */}
      <div className="bg-white border-b border-stone-200 px-4 sm:px-6 py-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-2 bg-rose-50 text-rose-800 border border-rose-200 px-3 py-1.5 rounded-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              <div>
                <span className="font-bold uppercase text-[10px] block leading-tight">Đã xác nhận, chờ pha</span>
                <span className="font-bold text-sm">{activeOrders.filter(o => o.status === 'CONFIRMED').length} đơn</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-xl">
              <span className="material-symbols-outlined text-[18px] text-amber-700">local_cafe</span>
              <div>
                <span className="font-bold uppercase text-[10px] block leading-tight">Đang pha chế</span>
                <span className="font-bold text-sm">
                  {activeOrders.filter(o => o.status === 'PREPARING').length} đơn{' '}
                  <span className="text-[11px] font-normal">({pendingItems.reduce((s, i) => s + i.quantity, 0)} phần chưa xong)</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-stone-50 text-stone-700 border border-stone-200 px-3 py-1.5 rounded-xl">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
              <div>
                <span className="font-bold uppercase text-[10px] block leading-tight">Sẵn sàng</span>
                <span className="font-bold text-sm">{db.orders.filter(o => o.status === 'READY').length} đơn</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center bg-stone-100 rounded-xl p-1 border border-stone-200">
              {([
                { id: 'by-order', label: 'Theo đơn', icon: 'receipt' },
                { id: 'by-item', label: 'Gom món', icon: 'blender' }
              ] as const).map(v => (
                <button
                  key={v.id}
                  onClick={() => setViewMode(v.id)}
                  className={`h-7 px-3 rounded-lg flex items-center gap-1.5 font-semibold transition-colors ${
                    viewMode === v.id ? 'bg-white shadow-xs text-stone-800' : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{v.icon}</span>
                  <span className="hidden sm:inline">{v.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
                else document.exitFullscreen?.();
              }}
              className="h-9 px-3 rounded-xl bg-primary text-white hover:bg-primary-container font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">fullscreen</span>
              <span className="hidden sm:inline">Toàn màn hình</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 w-full flex-1">
        {viewMode === 'by-order' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
            {activeOrders.length === 0 && (
              <div className="col-span-full text-center py-12 text-stone-500 font-medium">Không có đơn nào đang chờ pha chế.</div>
            )}
            {activeOrders.map(o => {
              const items = itemsOf(o.id);
              const doneCount = items.filter(i => i.is_prepared).length;
              const allDone = items.length > 0 && doneCount === items.length;
              const isTurn = batchPlan?.current.id === o.id;
              return (
                <div
                  key={o.id}
                  className={`bg-white rounded-2xl border shadow-xs overflow-hidden flex flex-col ${isTurn ? 'border-emerald-300 ring-2 ring-emerald-500/20' : 'border-stone-200'}`}
                >
                  <div className={`h-1.5 w-full ${TYPE_ACCENT[o.order_type]}`} />
                  <div className="p-3.5 border-b border-stone-100 bg-stone-50/70">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-stone-900">{o.order_code}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-200 text-stone-800">
                            {ORDER_STATUS_LABEL[o.status]}
                          </span>
                          {isTurn && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-600 text-white">Tới lượt</span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-stone-800 block mt-0.5">
                          {ORDER_TYPE_LABEL[o.order_type]}
                          {o.table_number ? ` • Bàn ${o.table_number}` : ''}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-stone-800">{fmtTime(o.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2">
                      <span className="font-semibold text-stone-700">{orderCustomerName(db, o)}</span>
                      <span className="font-mono">{doneCount}/{items.length} món</span>
                    </div>
                  </div>

                  <div className="p-3.5 flex-1 space-y-2.5">
                    {items.map(item => (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border transition-all ${
                          item.is_prepared ? 'bg-stone-50 border-stone-200 opacity-60 line-through' : 'bg-stone-50/50 border-stone-200/80 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span className="font-mono font-bold text-primary text-xs">{item.quantity}x</span>
                            <div>
                              <p className="font-bold text-xs text-stone-900 leading-tight">{item.product_name_at_time}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {customizationTags(item.customization).map((tg, idx) => (
                                  <span key={idx} className="px-1.5 rounded bg-white text-[10px] text-stone-600 border border-stone-200">{tg}</span>
                                ))}
                              </div>
                              {item.customization?.note && <p className="text-[10px] text-amber-800 italic mt-1">{item.customization.note}</p>}
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleItem(item)}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors shrink-0 ${
                              item.is_prepared ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700 hover:bg-primary hover:text-white'
                            }`}
                          >
                            {item.is_prepared ? 'Xong ✓' : 'Đang làm'}
                          </button>
                        </div>
                      </div>
                    ))}
                    {o.order_note && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1.5 font-medium">
                        <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0">sticky_note_2</span>
                        <span>{o.order_note}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-stone-50 border-t border-stone-100 text-xs">
                    <button
                      onClick={() => handleCompleteOrder(o)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 ${
                        allDone ? 'bg-primary text-white hover:bg-primary-container' : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">check</span>
                      {allDone ? 'HOÀN TẤT ĐƠN' : 'Hoàn tất cả đơn'}
                    </button>
                  </div>
                </div>
              );
            })}

            {readyOrders.map(o => (
              <div key={o.id} className="bg-white rounded-2xl border border-stone-200 opacity-75 shadow-xs overflow-hidden flex flex-col">
                <div className="h-1.5 w-full bg-stone-300" />
                <div className="p-3.5 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-stone-900">{o.order_code}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">Sẵn sàng</span>
                  </div>
                  <p className="text-stone-500">{ORDER_TYPE_LABEL[o.order_type]} • {orderCustomerName(db, o)}</p>
                  {itemsOf(o.id).map(i => (
                    <p key={i.id} className="text-stone-600">{i.quantity}x {i.product_name_at_time}</p>
                  ))}
                  <button
                    onClick={() => handleRecall(o)}
                    className="w-full mt-2 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-800 font-semibold border border-stone-200 flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">history</span>
                    Mở lại đơn
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            <p className="text-xs text-stone-500">Món chưa pha được cộng dồn theo cùng món và tuỳ chọn, xếp theo đơn đến trước.</p>
            {groupedItems.map((g, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-stone-300 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl font-mono shrink-0 bg-primary/10 text-primary">
                    x{g.totalQty}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">{g.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {g.tags.map((tg, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-stone-100 text-[11px] text-stone-700 border border-stone-200 font-medium">{tg}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[11px] text-stone-500 font-semibold uppercase tracking-wider">Từ các đơn:</span>
                      {g.codes.map(c => (
                        <span key={c} className="text-[11px] font-mono text-primary bg-primary/5 px-1.5 rounded border border-primary/20">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    markItems(g.itemIds, true);
                    onShowToast?.(`Đã hoàn tất lô ${g.name} (${g.totalQty} phần).`);
                  }}
                  className="shrink-0 h-12 px-6 rounded-xl bg-primary text-white font-bold hover:bg-primary-container shadow-2xs flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">done_all</span>
                  Hoàn tất lô ({g.totalQty})
                </button>
              </div>
            ))}
            {groupedItems.length === 0 && <div className="text-center py-12 text-stone-500 font-medium">Không có món nào đang chờ pha chế.</div>}
          </div>
        )}
      </div>

      {/* Batch Panel - mẻ pha tiếp theo theo thứ tự đến trước làm trước */}
      <div
        className={`fixed left-4 bottom-14 z-40 w-[calc(100%-2rem)] sm:w-96 bg-white rounded-2xl border border-stone-200 shadow-2xl flex flex-col overflow-hidden ${
          isBatchPanelCollapsed ? '' : 'max-h-[60vh]'
        }`}
      >
        <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[22px] text-emerald-700">format_list_numbered</span>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-stone-900 leading-tight">Mẻ pha tiếp theo</h4>
              <p className="text-[11px] text-stone-600">Đến trước làm trước • làm kèm tối đa {BATCH_LOOKAHEAD_ORDERS} đơn kế tiếp</p>
            </div>
          </div>
          <button
            onClick={() => setIsBatchPanelCollapsed(!isBatchPanelCollapsed)}
            className="h-8 px-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-white flex items-center gap-1 text-[11px] font-semibold shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">{isBatchPanelCollapsed ? 'expand_less' : 'expand_more'}</span>
            {isBatchPanelCollapsed ? 'Mở rộng' : 'Thu gọn'}
          </button>
        </div>

        {!isBatchPanelCollapsed && (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {batchPlan ? (
                <>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold uppercase shrink-0">Tới lượt</span>
                      <span className="font-mono font-bold text-primary">{batchPlan.current.order_code}</span>
                      <span className="text-stone-600 truncate">
                        {ORDER_TYPE_LABEL[batchPlan.current.order_type]}
                        {batchPlan.current.table_number ? ` • Bàn ${batchPlan.current.table_number}` : ''}
                      </span>
                    </div>
                    <span className="font-mono font-bold shrink-0 text-stone-700">Đặt lúc {fmtTime(batchPlan.current.created_at)}</span>
                  </div>

                  {batchPlan.current.order_note && (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-amber-600 shrink-0">sticky_note_2</span>
                      <span>{batchPlan.current.order_note}</span>
                    </div>
                  )}

                  {batchPlan.groups.map(group => {
                    const ids = group.lines.map(l => l.item.id);
                    const selectedInGroup = ids.filter(id => batchSelected.has(id)).length;
                    const isGroupSelected = selectedInGroup === ids.length;
                    const extraQty = group.extraLines.reduce((s, l) => s + l.item.quantity, 0);
                    return (
                      <div key={group.productId} className={`rounded-xl border overflow-hidden ${isGroupSelected ? 'border-emerald-300' : 'border-stone-200'}`}>
                        <label className={`flex items-center gap-2.5 p-2.5 cursor-pointer ${isGroupSelected ? 'bg-emerald-50' : 'bg-stone-50'}`}>
                          <input
                            type="checkbox"
                            className="w-5 h-5 accent-primary shrink-0"
                            checked={isGroupSelected}
                            ref={el => {
                              if (el) el.indeterminate = selectedInGroup > 0 && !isGroupSelected;
                            }}
                            onChange={e => toggleBatch(ids, e.target.checked)}
                          />
                          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-base font-mono shrink-0">
                            x{group.totalQty}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs text-stone-900 leading-tight">{group.name}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px]">
                              {extraQty > 0 ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Làm kèm +{extraQty}</span>
                              ) : (
                                <span className="text-stone-500 font-semibold">Chỉ cho đơn này</span>
                              )}
                              {group.variantCount > 1 && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">{group.variantCount} kiểu tuỳ chọn</span>
                              )}
                            </div>
                          </div>
                        </label>
                        <div className="divide-y divide-stone-100 border-t border-stone-100">
                          {group.currentLines.map(renderBatchLine)}
                          {group.extraLines.length > 0 && (
                            <p className="pl-5 pr-2.5 py-1 bg-stone-50 text-[10px] font-bold uppercase tracking-wider text-stone-500">Làm kèm – đơn xếp ngay sau</p>
                          )}
                          {group.extraLines.map(renderBatchLine)}
                          {group.laterQty > 0 && (
                            <p className="pl-5 pr-2.5 py-2 bg-white text-[11px] text-stone-500 flex items-start gap-1.5">
                              <span className="material-symbols-outlined text-[15px] text-stone-400 shrink-0">schedule</span>
                              <span>
                                Còn {group.laterQty} phần ở {group.laterCodes.join(', ')} – đơn xếp sau xa hơn nên chưa làm, sẽ làm khi tới lượt.
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {batchPlan.nextCodes.length > 0 && (
                    <p className="text-[11px] text-stone-500">
                      Kế tiếp: <span className="font-mono font-semibold text-stone-700">{batchPlan.nextCodes.join(' → ')}</span>
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-stone-500">
                  <p className="font-semibold text-xs">Không còn món nào chờ pha.</p>
                  <p className="text-[11px] mt-1">Đơn mới sẽ tự hiện ở đây theo thứ tự đến.</p>
                </div>
              )}
            </div>

            {allBatchLines.length > 0 && (
              <div className="p-3 border-t border-stone-100 bg-stone-50 flex items-center justify-between gap-2 text-[11px]">
                <div className="flex flex-col">
                  <span className="text-stone-600">
                    Đã chọn: <strong className="text-stone-900 font-mono">{selectedBatchCups} phần</strong> /{' '}
                    <strong className="text-stone-900 font-mono">{selectedBatchOrders} đơn</strong>
                  </span>
                  <button
                    onClick={() => toggleBatch(allBatchLines.map(l => l.item.id), !isAllBatchSelected)}
                    className="text-primary font-semibold hover:underline text-left"
                  >
                    {isAllBatchSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>
                <button
                  onClick={handleApplyBatchDone}
                  disabled={selectedBatchLines.length === 0}
                  className="h-9 px-3 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-1.5 hover:bg-primary-container disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">done_all</span>
                  Tích xong vào đơn
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 h-10 bg-white/95 backdrop-blur-md border-t border-stone-200 z-30 px-4 sm:px-6 flex items-center justify-between text-xs text-stone-500">
        <span>Tích "Đang làm" để đánh dấu từng món đã pha (order_items.is_prepared)</span>
        <span className="hidden sm:inline">Đơn hoàn tất chuyển sang trạng thái "Sẵn sàng" (READY)</span>
      </div>
    </div>
  );
};
