export type KitchenCommand = { action: 'START'; orderId: number } | { action: 'FINISH'; orderId: number } | { action: 'ITEMS'; itemIds: number[]; prepared: boolean };
type KitchenOrder = { id: number; status: string; kitchen_eligible?: boolean };
type KitchenItem = { id: number; order_id: number; is_prepared: boolean };
interface KitchenDependencies {
  orders: KitchenOrder[];
  items: KitchenItem[];
  rawId: (id: number) => string;
  location: (id: number) => { order: string; index: number } | undefined;
  send: (path: string, body: unknown) => Promise<unknown>;
}

export async function executeKitchenCommand(command: KitchenCommand, deps: KitchenDependencies) {
  const orderFor = (id: number) => {
    const order = deps.orders.find(order => order.id === id);
    if (!order || order.kitchen_eligible === false) throw new Error('Đơn không đủ điều kiện pha chế. Vui lòng tải lại.');
    return order;
  };
  const status = (id: number, value: string) => deps.send(`/api/orders/${deps.rawId(id)}/status`, { status: value });
  if (command.action === 'START') {
    if (orderFor(command.orderId).status !== 'CONFIRMED') throw new Error('Đơn không còn chờ pha. Vui lòng tải lại.');
    await status(command.orderId, 'PREPARING');
    return 'Đã bắt đầu pha. Đánh dấu từng món khi pha xong.';
  }
  if (command.action === 'FINISH') {
    const order = orderFor(command.orderId);
    const items = deps.items.filter(item => item.order_id === order.id);
    if (order.status !== 'PREPARING' || !items.length || items.some(item => !item.is_prepared)) throw new Error('Cần đánh dấu tất cả món đã pha xong trước khi hoàn thành đơn.');
    await status(order.id, 'READY');
    return 'Đã hoàn thành pha chế. Đơn chuyển sang mục Đã pha xong để chờ phục vụ hoặc giao hàng.';
  }
  const selected = [...new Set(command.itemIds)].map(id => {
    const item = deps.items.find(item => item.id === id);
    const location = deps.location(id);
    if (!item || !location) throw new Error('Không tìm thấy món trong đơn hàng. Vui lòng tải lại.');
    const order = orderFor(item.order_id);
    if (order.status !== 'PREPARING') throw new Error('Hãy bấm Bắt đầu pha trước khi đánh dấu món.');
    return { item, location };
  });
  if (!selected.length) throw new Error('Chưa chọn món cần cập nhật.');
  for (const { location } of selected) await deps.send(`/api/orders/${location.order}/items/${location.index}/prepared`, { isPrepared: command.prepared, autoReady: false });
  return command.prepared ? 'Đã ghi nhận món pha xong. Khi đủ món, bấm Hoàn thành đơn.' : 'Đã đưa món về trạng thái đang pha.';
}
