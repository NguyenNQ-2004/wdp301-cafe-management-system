import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PageRoute, OrderItem } from '../../types';
import { useDb } from '../../data/DbContext';
import { ORDER_TYPE_LABEL, describeCustomization, fmtTime, orderCustomerName } from '../../data/dbUtils';

export const KdsTerminal: React.FC<{ onNavigate: (route: PageRoute) => void; onShowToast?: (message: string) => void }> = () => {
  const { db, session, updatePreparation, busy, refresh } = useDb();
  const [params, setParams] = useSearchParams();
  const completed = params.get('action') === 'completed';
  const preparing = params.get('action') === 'preparing';
  const eligible = db.orders.filter(order => order.kitchen_eligible !== false);
  const waitingOrders = eligible.filter(order => order.status === 'CONFIRMED').sort((a, b) => a.created_at.localeCompare(b.created_at));
  const preparingOrders = eligible.filter(order => order.status === 'PREPARING').sort((a, b) => a.created_at.localeCompare(b.created_at));
  const readyOrders = eligible.filter(order => order.status === 'READY').sort((a, b) => b.created_at.localeCompare(a.created_at));
  const orders = completed ? readyOrders : preparing ? preparingOrders : waitingOrders;
  useEffect(() => {
    let running = false;
    const reload = async () => {
      if (running || busy || document.visibilityState === 'hidden') return;
      running = true;
      try { await refresh({ silent: true }); } finally { running = false; }
    };
    const interval = window.setInterval(() => { void reload(); }, 5000);
    window.addEventListener('focus', reload);
    document.addEventListener('visibilitychange', reload);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', reload); document.removeEventListener('visibilitychange', reload); };
  }, [refresh, busy]);
  const itemsOf = (id: number) => db.order_items.filter(item => item.order_id === id);
  const groups = new Map<string, { name: string; options: string; items: OrderItem[] }>();
  for (const order of preparingOrders) for (const item of itemsOf(order.id).filter(item => !item.is_prepared)) {
    const customization = item.customization;
    const key = JSON.stringify([item.product_id, customization?.size, customization?.sugar, customization?.ice, customization?.note, [...(customization?.topping || [])].sort()]);
    if (!groups.has(key)) groups.set(key, { name: item.product_name_at_time, options: describeCustomization(customization), items: [] });
    groups.get(key)!.items.push(item);
  }
  const mark = (items: OrderItem[], prepared: boolean) => updatePreparation({ action: 'ITEMS', itemIds: items.map(item => item.id), prepared });
  const start = async (orderId: number) => {
    if (await updatePreparation({ action: 'START', orderId })) setParams({ action: 'preparing' });
  };
  const name = db.users.find(user => user.id === session.baristaId)?.full_name;
  return <div className="swp-kds">
    <header className="swp-staff-header"><strong>AURA CAFE <small>PHA CHẾ</small></strong><nav>
      <button className={!completed && !preparing ? 'active' : ''} onClick={() => setParams({})}>Chờ pha ({waitingOrders.length})</button>
      <button className={preparing ? 'active' : ''} onClick={() => setParams({ action: 'preparing' })}>Đang pha ({preparingOrders.length})</button>
      <button className={completed ? 'active' : ''} onClick={() => setParams({ action: 'completed' })}>Đã pha xong ({readyOrders.length})</button>
    </nav><span>{name}</span></header>
    <main><h1>{completed ? 'Đơn đã pha xong' : preparing ? 'Đơn đang pha' : 'Đơn chờ pha'}</h1><p>{completed ? 'Đã pha xong, chờ phục vụ hoặc giao hàng. Đây chưa phải hoàn tất giao đơn.' : preparing ? 'Bấm Đã pha xong ở từng món, sau đó bấm Hoàn thành đơn.' : 'Bấm Bắt đầu pha để chuyển đơn sang mục Đang pha. Danh sách tự cập nhật mỗi 5 giây.'}</p><button type="button" disabled={busy} className="swp-kds-reload" onClick={() => { void refresh({ silent: true }); }}>↻ Tải lại danh sách</button>
      <div className={completed ? 'swp-kds-layout completed' : 'swp-kds-layout'}>
        {!completed && <aside><h2>Món đang pha</h2>{!groups.size && <p>Chưa có món đang pha. Hãy bắt đầu một đơn ở mục Chờ pha.</p>}{[...groups.entries()].map(([key, group]) => <section key={key}><b>{group.name}</b><p>{group.options || 'Mặc định'}</p><div><strong>{group.items.reduce((sum, item) => sum + item.quantity, 0)} phần</strong><button disabled={busy} onClick={() => { void mark(group.items, true); }}>Đã pha xong nhóm món</button></div><small>{group.items.map(item => db.orders.find(order => order.id === item.order_id)?.order_code).join(' · ')}</small></section>)}</aside>}
        <div className="swp-kds-orders">{!orders.length && <section className="swp-kds-empty">{completed ? 'Chưa có đơn pha xong.' : preparing ? 'Không có đơn đang pha.' : 'Không có đơn chờ pha.'}</section>}{orders.map(order => <article key={order.id}>
          <header><strong>{order.order_code}</strong><span>{fmtTime(order.created_at)}</span></header>
          <div className="swp-kds-meta"><strong className={`swp-kds-state ${order.status.toLowerCase()}`}>{order.status === 'CONFIRMED' ? 'Chờ bắt đầu' : order.status === 'PREPARING' ? 'Đang pha' : 'Đã pha xong'}</strong><br />{ORDER_TYPE_LABEL[order.order_type]}{order.table_number ? ` · Bàn ${order.table_number}` : ''}<br />{orderCustomerName(db, order)}<p>{itemsOf(order.id).filter(item => item.is_prepared).length}/{itemsOf(order.id).length} món đã pha xong</p></div>
          {order.order_note && <p className="swp-kds-note">Ghi chú: {order.order_note}</p>}
          {itemsOf(order.id).map(item => <div className={`swp-kds-item ${item.is_prepared ? 'prepared' : ''}`} key={item.id}><input aria-label={`Đã pha xong ${item.product_name_at_time}`} type="checkbox" checked={item.is_prepared} disabled={completed || busy || order.status !== 'PREPARING'} onChange={() => { void mark([item], !item.is_prepared); }} /><span><b>{item.quantity} × {item.product_name_at_time}</b><small>{describeCustomization(item.customization) || 'Mặc định'}</small><small>{item.is_prepared ? '✓ Đã pha xong' : 'Chưa pha xong'}</small></span>{order.status === 'PREPARING' && <button disabled={busy} onClick={() => { void mark([item], !item.is_prepared); }}>{item.is_prepared ? 'Pha lại' : 'Đã pha xong'}</button>}</div>)}
          {!completed && <footer>{order.status === 'CONFIRMED' ? <button disabled={busy} className="finish" onClick={() => { void start(order.id); }}>Bắt đầu pha</button> : <div className="swp-kds-finish"><p>{itemsOf(order.id).some(item => !item.is_prepared) ? 'Đánh dấu đủ các món để hoàn thành đơn.' : 'Đủ món — có thể hoàn thành đơn.'}</p><button className="finish" disabled={busy || !itemsOf(order.id).length || itemsOf(order.id).some(item => !item.is_prepared)} onClick={() => { void updatePreparation({ action: 'FINISH', orderId: order.id }); }}>Hoàn thành đơn</button></div>}</footer>}
        </article>)}</div>
      </div>
    </main>
  </div>;
};
