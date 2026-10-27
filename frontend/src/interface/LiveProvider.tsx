import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import useAuthStore from '../store/authStore';
import { shopApi, ShopApiError } from '../lib/shopApi';
import { groupOrderItems } from '../lib/cartOptions';
import type { DbState, IdTable, Row, Order, OrderStatus, OrderType, OrderCustomization } from './types';

type RecordData = Record<string, any>;
const TABLES: (keyof DbState)[] = ['users', 'work_schedules', 'categories', 'products', 'orders', 'order_items', 'payments', 'loyalty_transactions', 'customer_reviews', 'suppliers', 'ingredients', 'product_ingredients', 'purchase_orders', 'purchase_order_items', 'inventory_transactions', 'shop_settings'];
const emptyDb = () => Object.fromEntries(TABLES.map(table => [table, []])) as unknown as DbState;
const sqlDate = (value: unknown) => typeof value === 'string' ? value.replace('T', ' ').replace(/\.\d+Z$/, '').replace(/Z$/, '') : null;
const snake = (key: string) => key.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
const camel = (key: string) => key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const PATHS: Partial<Record<IdTable, string>> = { categories: '/api/categories', products: '/api/products', orders: '/api/orders', payments: '/api/payments', ingredients: '/api/ingredients', suppliers: '/api/suppliers', product_ingredients: '/api/product-ingredients', purchase_orders: '/api/purchase-orders', inventory_transactions: '/api/inventory-transactions', customer_reviews: '/api/customer-reviews', work_schedules: '/api/work-schedules' };

export interface Tx {
  db: () => DbState;
  insert: <T extends IdTable>(table: T, row: Omit<Row<T>, 'id'>) => Row<T>;
  update: <T extends IdTable>(table: T, id: number, patch: Partial<Row<T>>) => void;
  remove: <T extends IdTable>(table: T, id: number) => void;
  setSetting: (key: string, value: string) => void;
}
export interface PlaceOrderInput {
  customer_id: number | null; cashier_id: number | null; order_type: OrderType; status: OrderStatus;
  table_number?: string | null; recipient_name?: string | null; recipient_phone?: string | null;
  delivery_address?: string | null; order_note?: string | null; delivery_fee: number; points_to_redeem: number;
  items: { product_id: number; quantity: number; unit_price: number; customization: OrderCustomization | null }[];
}
interface Session { customerId: number; cashierId: number; baristaId: number; shipperId: number; adminId: number }
interface Value {
  db: DbState; session: Session; loading: boolean; busy: boolean; revision: number;
  error: string; notice: string; unavailable: string[];
  refresh: () => Promise<void>; notify: (message: string) => void;
  refreshOrders: (scope: 'counter' | 'all', signal?: AbortSignal) => Promise<void>;
  rawId: (id: number) => string; idFor: (table: string, value: unknown) => number;
  setSession: (patch: Partial<Session>) => void;
  transact: <R>(fn: (tx: Tx) => R) => R;
  placeOrder: (input: PlaceOrderInput) => Promise<Order>;
  setOrderStatus: (id: number, status: OrderStatus, patch?: Partial<Order>) => void;
  cancelOrder: (id: number, reason: string) => Promise<boolean>;
  saveDeliveryOrder: (id: number, body: { status: OrderStatus; shipperId?: number | null; cancelReason?: string; orderNote?: string }) => Promise<boolean>;
  remitCod: (scheduleId: number, cash: number, note: string) => Promise<boolean>;
  adjustPoints: (id: number, delta: number) => void;
}
const Context = createContext<Value | null>(null);
export { Context as InterfaceContext };
type Command = { table: IdTable | 'shop_settings'; action: 'POST' | 'PUT' | 'DELETE'; id?: number; data: RecordData };

export function DbProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore(state => state.user);
  const [db, setDb] = useState<DbState>(emptyDb);
  const dbRef = useRef(db);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(0);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const ids = useRef(new Map<string, number>());
  const originals = useRef(new Map<number, string>());
  const nextId = useRef(1);
  const generation = useRef(0);
  const queue = useRef(Promise.resolve());
  const inFlight = useRef(0);
  const deferredNotice = useRef('');
  const items = useRef(new Map<number, { order: string; index: number }>());

  const idFor = useCallback((table: string, value: unknown): number => {
    if (value === undefined || value === null || value === '') return 0;
    const object = value as RecordData;
    const source = typeof value === 'object' ? object._id || object.id : value;
    if (!source) return 0;
    const key = `${table}:${String(source)}`;
    if (!ids.current.has(key)) {
      const id = nextId.current++;
      ids.current.set(key, id); originals.current.set(id, String(source));
    }
    return ids.current.get(key)!;
  }, []);
  const rawId = useCallback((id: number) => originals.current.get(id) || '', []);

  const normalize = useCallback((table: string, raw: RecordData): RecordData => {
    const row: RecordData = Object.fromEntries(Object.entries(raw).map(([key, value]) => [snake(key), value]));
    row.id = idFor(table, raw);
    if (table === 'orders') row.update_token = raw.updatedAt;
    for (const key of ['created_at', 'updated_at', 'paid_at', 'check_in_time', 'check_out_time']) row[key] = sqlDate(row[key]);
    if (table === 'users') Object.assign(row, { full_name: raw.fullName || raw.full_name || '', phone: raw.phone || '', email: raw.email || null, birthday: raw.birthday?.slice(0, 10) || null, address: raw.address || null, password_hash: '', role: raw.role || 'CUSTOMER', status: raw.status || 'ACTIVE', position: raw.position || null, base_salary: raw.baseSalary || 0, hire_date: raw.hireDate?.slice(0, 10) || null, total_points: raw.totalPoints || 0 });
    if (table === 'categories') Object.assign(row, { status: raw.status || 'ACTIVE', image_url: raw.image_url || raw.imageUrl || null, description: raw.description || null, icon: raw.icon || null });
    if (table === 'products') Object.assign(row, { category_id: idFor('categories', raw.category), base_price: raw.basePrice || 0, image_url: raw.imageUrl || null, is_available: raw.isAvailable !== false, variants_config: { sizes: raw.variantsConfig?.sizes || { M: 0 }, toppings: raw.variantsConfig?.toppings || [] }, description: raw.description || null });
    if (table === 'orders') Object.assign(row, { customer_id: idFor('users', raw.customer) || null, cashier_id: idFor('users', raw.cashier) || null, shipper_id: idFor('users', raw.shipper) || null, recipient_name: raw.recipientName || '', recipient_phone: raw.recipientPhone || '', delivery_address: raw.deliveryAddress || '', order_note: raw.orderNote || null, table_number: raw.tableNumber || null, cancel_reason: raw.cancelReason || null });
    if (table === 'payments' || table === 'customer_reviews' || table === 'loyalty_transactions') row.order_id = idFor('orders', raw.order) || null;
    if (table === 'customer_reviews' || table === 'loyalty_transactions') row.customer_id = idFor('users', raw.customer);
    if (table === 'ingredients') row.supplier_id = idFor('suppliers', raw.supplier) || null;
    if (table === 'product_ingredients') Object.assign(row, { product_id: idFor('products', raw.product), ingredient_id: idFor('ingredients', raw.ingredient) });
    if (table === 'work_schedules') Object.assign(row, { user_id: idFor('users', raw.user), work_date: raw.workDate?.slice(0, 10) || '', starting_cash: raw.startingCash ?? null, ending_cash_system: raw.endingCashSystem ?? null, ending_cash_actual: raw.endingCashActual ?? null, note: raw.note || null });
    if (table === 'purchase_orders') Object.assign(row, { supplier_id: idFor('suppliers', raw.supplier), creator_id: idFor('users', raw.creator), note: raw.note || null });
    if (table === 'inventory_transactions') Object.assign(row, { ingredient_id: idFor('ingredients', raw.ingredient), transaction_type: raw.transactionType, reference_type: raw.referenceType, reference_id: null });
    return row;
  }, [idFor]);

  const refresh = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true);
    const requests: [keyof DbState | 'self', string][] = [['categories', '/api/categories'], ['products', '/api/products'], ['shop_settings', '/api/shop-settings']];
    if (user?.token) {
      requests.push(['self', '/api/auth/me'], ['orders', '/api/orders'], ['loyalty_transactions', '/api/loyalty-transactions']);
      if (user.role === 'ADMIN') {
        requests.push(['users', '/api/users'], ['ingredients', '/api/ingredients'], ['suppliers', '/api/suppliers'], ['product_ingredients', '/api/product-ingredients'], ['purchase_orders', '/api/purchase-orders'], ['inventory_transactions', '/api/inventory-transactions']);
      } else if (user.role === 'STAFF' && ['CASHIER', 'MANAGER'].includes(user.position || '')) requests.push(['users', '/api/users/customers']);
      if (user.role === 'ADMIN' || ['CASHIER', 'MANAGER'].includes(user.position || '')) requests.push(['payments', '/api/payments']);
      if (user.role !== 'CUSTOMER') {
        const day = new Date(); day.setDate(day.getDate() - (day.getDay() + 6) % 7);
        const monday = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        requests.push(['work_schedules', `/api/work-schedules?weekStart=${monday}`]);
      }
    }
    const responses = await Promise.allSettled(requests.map(([, path]) => shopApi<any>(path, { token: user?.token })));
    if (version !== generation.current || user?.token !== useAuthStore.getState().user?.token) return;
    const next = emptyDb(); const missing: string[] = [];
    const users = new Map<number, any>();
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i]; const [table, endpoint] = requests[i];
      if (response.status === 'rejected') { missing.push(endpoint); continue; }
      const body = response.value;
      if (table === 'self') { const person = normalize('users', body); users.set(person.id, person); continue; }
      if (table === 'shop_settings') {
        next.shop_settings = (body.list || Object.entries(body.settings || {}).map(([key, value]) => ({ settingKey: key, settingValue: value }))).map((s: RecordData) => ({ setting_key: s.settingKey, setting_value: String(s.settingValue), updated_at: sqlDate(s.updatedAt) || '' }));
        continue;
      }
      const rows: RecordData[] = Array.isArray(body) ? body : body.customers || body.list || [];
      const records = rows.filter(row => table !== 'orders' || user?.role !== 'CUSTOMER' || String(typeof row.customer === 'object' ? row.customer?._id : row.customer) === user._id);
      (next[table] as any[]) = records.map(row => normalize(table, row));
      if (table === 'users') for (const person of next.users) users.set(person.id, person);
      if (table === 'orders') records.forEach(order => {
        for (const key of ['customer', 'cashier', 'shipper']) if (order[key] && typeof order[key] === 'object') { const person = normalize('users', order[key]); if (!users.has(person.id)) users.set(person.id, person); }
        (order.items || []).forEach((item: RecordData, index: number) => {
          const id = idFor('order_items', `${order._id}:${index}`); items.current.set(id, { order: order._id, index });
          next.order_items.push({ id, order_id: idFor('orders', order), product_id: idFor('products', item.product), product_name_at_time: item.productNameAtTime || '', unit_price: item.unitPrice || 0, quantity: item.quantity || 0, subtotal: item.subtotal || 0, customization: item.customization || null, is_prepared: !!item.isPrepared });
        });
      });
    }
    next.users = [...users.values()];
    if (!next.shop_settings.some(s => s.setting_key === 'store_name')) next.shop_settings.push({ setting_key: 'store_name', setting_value: 'Aura Café', updated_at: '' });
    dbRef.current = next; setDb(next); setUnavailable(missing); setLoading(false);
  }, [user?.token, user?.role, user?.position, user?._id, normalize, idFor]);
  useEffect(() => { void refresh(); return () => { generation.current++; }; }, [refresh]);

  const refreshOrders = useCallback(async (scope: 'counter' | 'all', signal?: AbortSignal) => {
    if (!user?.token || inFlight.current) return;
    const epoch = generation.current;
    const includePayments = scope === 'counter' && (user.role === 'ADMIN' || (user.role === 'STAFF' && ['CASHIER', 'MANAGER'].includes(user.position || '')));
    const [rows, payments] = await Promise.all([
      shopApi<RecordData[]>(scope === 'counter' ? '/api/orders/counter' : '/api/orders', { token: user.token, signal }),
      includePayments ? shopApi<RecordData[]>('/api/payments', { token: user.token, signal }) : Promise.resolve(null),
    ]);
    if (signal?.aborted || epoch !== generation.current || inFlight.current || user.token !== useAuthStore.getState().user?.token) return;
    const current = dbRef.current;
    const replacedIds = new Set(current.orders.filter(order => scope === 'all' || order.order_type !== 'ONLINE').map(order => order.id));
    const users = new Map(current.users.map(person => [person.id, person]));
    const lines = current.order_items.filter(item => !replacedIds.has(item.order_id));
    for (const raw of rows) {
      for (const key of ['customer', 'cashier', 'shipper']) {
        if (raw[key] && typeof raw[key] === 'object') {
          const person = normalize('users', raw[key]) as DbState['users'][number];
          const existing = users.get(person.id);
          users.set(person.id, { ...person, ...existing, full_name: person.full_name, phone: person.phone,
            total_points: raw[key].totalPoints ?? existing?.total_points ?? person.total_points });
        }
      }
      (raw.items || []).forEach((item: RecordData, index: number) => {
        const id = idFor('order_items', `${raw._id}:${index}`);
        items.current.set(id, { order: raw._id, index });
        lines.push({ id, order_id: idFor('orders', raw), product_id: idFor('products', item.product), product_name_at_time: item.productNameAtTime || '', unit_price: item.unitPrice || 0, quantity: item.quantity || 0, subtotal: item.subtotal || 0, customization: item.customization || null, is_prepared: !!item.isPrepared });
      });
    }
    const next = { ...current, users: [...users.values()], orders: [...current.orders.filter(order => !replacedIds.has(order.id)), ...rows.map(row => normalize('orders', row) as Order)], order_items: lines,
      payments: payments ? payments.map(payment => normalize('payments', payment) as DbState['payments'][number]) : current.payments };
    dbRef.current = next; setDb(next);
    setUnavailable(paths => paths.filter(path => path !== '/api/orders' && !(includePayments && path === '/api/payments')));
  }, [user?.token, user?.role, user?.position, normalize, idFor]);

  const notify = (message: string) => { if (inFlight.current) deferredNotice.current = message; else setNotice(message); };
  const perform = (work: () => Promise<unknown>) => {
    inFlight.current++; setPending(inFlight.current); setError(''); setNotice('');
    const operation = queue.current.catch(() => {}).then(work).then(async () => { await refresh(); if (deferredNotice.current) setNotice(deferredNotice.current); deferredNotice.current = ''; })
      .catch((failure: unknown) => {
        deferredNotice.current = ''; setNotice('');
        setError(failure instanceof ShopApiError && failure.status === 404 ? 'Chưa lưu được: API cho chức năng này chưa được kết nối.' : failure instanceof Error ? failure.message : 'Không lưu được dữ liệu.');
        setRevision(value => value + 1);
      }).finally(() => { inFlight.current--; setPending(inFlight.current); });
    queue.current = operation;
  };

  const send = async (command: Command) => {
    if (!user?.token) throw new Error('Vui lòng đăng nhập trước khi thực hiện.');
    if (user.token !== useAuthStore.getState().user?.token) throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng thực hiện lại.');
    const { table, action, id, data } = command;
    if (table === 'shop_settings') { await shopApi('/api/shop-settings', { method: 'PUT', token: user.token, body: data }); return; }
    if (table === 'order_items') {
      if (Object.keys(data).some(key => key !== 'is_prepared')) throw new Error('Chức năng sửa món của đơn hàng chưa có API hỗ trợ.');
      const location = items.current.get(id!);
      if (!location || action !== 'PUT') throw new Error('Không tìm thấy món trong đơn hàng.');
      await shopApi(`/api/orders/${location.order}/items/${location.index}/prepared`, { method: 'PUT', token: user.token, body: { isPrepared: data.is_prepared } }); return;
    }
    let endpoint = PATHS[table];
    const body: RecordData = Object.fromEntries(Object.entries(data).filter(([key]) => !['id', 'password_hash', 'created_at', 'updated_at'].includes(key)).map(([key, value]) => [camel(key), value]));
    if (table === 'products' && data.category_id !== undefined) { body.category = rawId(data.category_id); delete body.categoryId; }
    if (table === 'ingredients' && data.supplier_id !== undefined) { body.supplier = data.supplier_id ? rawId(data.supplier_id) : null; delete body.supplierId; }
    if (table === 'product_ingredients') { body.product = rawId(data.product_id); body.ingredient = rawId(data.ingredient_id); delete body.productId; delete body.ingredientId; }
    if (table === 'orders') {
      endpoint = `/api/orders/${rawId(id!)}/status`;
      body.status = data.status || dbRef.current.orders.find(order => order.id === id)?.status;
      if (data.shipper_id !== undefined) body.shipperId = data.shipper_id ? rawId(data.shipper_id) : null;
    } else if (table === 'users') {
      const own = rawId(id || 0) === user._id;
      const person = dbRef.current.users.find(person => person.id === id);
      endpoint = own ? '/api/auth/profile' : person?.role === 'STAFF' || data.role === 'STAFF' ? '/api/employees' : '/api/users/customers';
      Object.assign(body, { fullName: data.full_name, baseSalary: data.base_salary, hireDate: data.hire_date });
      if (data.password) body.password = data.password;
      if (own) { for (const key of Object.keys(body)) if (!['fullName', 'email', 'birthday', 'address'].includes(key)) delete body[key]; }
      if (id && !own && action !== 'POST') endpoint += '/' + rawId(id);
    } else if (table === 'payments' || table === 'work_schedules') throw new Error('Thao tác này cần thực hiện ở màn hình thanh toán hoặc chấm công tương ứng.');
    else if (id && action !== 'POST') endpoint += '/' + rawId(id);
    if (!endpoint) throw new Error('Chức năng này chưa có API hỗ trợ.');
    const result = await shopApi<RecordData>(endpoint, { method: action, token: user.token, ...(action !== 'DELETE' ? { body } : {}) });
    if (action === 'POST' && id && result?._id) { originals.current.set(id, result._id); ids.current.set(`${table}:${result._id}`, id); }
  };
  const transact = <R,>(fn: (tx: Tx) => R): R => {
    let staged = structuredClone(dbRef.current); const commands: Command[] = [];
    const tx: Tx = {
      db: () => staged,
      insert: (table, row) => { const id = nextId.current++; const created = { ...row, id } as Row<typeof table>; (staged[table] as any[]).push(created); commands.push({ table, action: 'POST', id, data: row }); return created as never; },
      update: (table, id, patch) => { staged = { ...staged, [table]: (staged[table] as any[]).map(row => row.id === id ? { ...row, ...patch } : row) }; commands.push({ table, action: 'PUT', id, data: patch }); },
      remove: (table, id) => { staged = { ...staged, [table]: staged[table].filter(row => row.id !== id) }; commands.push({ table, action: 'DELETE', id, data: {} }); },
      setSetting: (key, value) => { commands.push({ table: 'shop_settings', action: 'PUT', data: { [key]: value } }); },
    };
    const result = fn(tx);
    if (commands.length) perform(async () => { for (const command of commands) await send(command); });
    return result;
  };
  const placeOrder = async (input: PlaceOrderInput): Promise<Order> => {
    if (!user?.token) throw new Error('Vui lòng đăng nhập để tạo đơn.');
    if (inFlight.current) throw new Error('Vui lòng chờ thao tác hiện tại hoàn tất.');
    if (input.points_to_redeem) throw new Error('Đổi điểm tại quầy hiện chưa khả dụng.');
    if (input.items.some(item => item.customization?.topping?.length)) throw new Error('Đặt thêm topping hiện chưa khả dụng. Vui lòng bỏ topping để tiếp tục.');
    const orderItems = groupOrderItems(input.items.map(item => ({ productId: rawId(item.product_id), quantity: item.quantity, size: item.customization?.size || 'M' })));
    inFlight.current++; setPending(inFlight.current); setError('');
    try {
    const result = await shopApi<RecordData>('/api/orders', { method: 'POST', token: user.token, body: {
      items: orderItems,
      orderType: input.order_type, customerId: input.customer_id ? rawId(input.customer_id) : undefined,
      recipientName: input.recipient_name, recipientPhone: input.recipient_phone, deliveryAddress: input.delivery_address,
      tableNumber: input.table_number, orderNote: [input.order_note, ...input.items.filter(item => item.customization).map(item => `${item.quantity} x ${dbRef.current.products.find(product => product.id === item.product_id)?.name || ''} (${item.customization?.size || 'M'}): ${[item.customization?.sugar && `đường ${item.customization.sugar}`, item.customization?.ice, item.customization?.note].filter(Boolean).join(', ')}`)].filter(Boolean).join('; '), paymentMethod: input.order_type === 'ONLINE' ? 'COD' : 'PAY_AT_COUNTER',
    } });
    await refresh(); return normalize('orders', result) as Order;
    } catch (failure) {
      setError(failure instanceof ShopApiError && failure.status === 404 ? 'Chưa tạo được đơn: API đặt hàng chưa được kết nối.' : failure instanceof Error ? failure.message : 'Không thể tạo đơn.');
      throw failure;
    } finally { inFlight.current--; setPending(inFlight.current); }
  };
  const cancelOrder = async (id: number, reason: string): Promise<boolean> => {
    if (!user?.token) return false;
    if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) {
      setError('Vui lòng chọn lý do hủy đơn hợp lệ.');
      return false;
    }
    const order = dbRef.current.orders.find(item => item.id === id);
    if (!order) { setError('Không tìm thấy đơn hàng cần hủy.'); return false; }
    inFlight.current++; setPending(inFlight.current); setError(''); setNotice('');
    try {
      await shopApi(`/api/orders/${rawId(id)}/status`, { method: 'PUT', token: user.token, body: { status: 'CANCELLED', cancelReason: reason.trim() } });
      await refresh();
      return true;
    } catch (failure) {
      setError(failure instanceof ShopApiError && failure.status === 404 ? 'Chưa hủy được: API cập nhật đơn hàng chưa được kết nối.' : failure instanceof Error ? failure.message : 'Không thể hủy đơn hàng.');
      return false;
    } finally {
      inFlight.current--; setPending(inFlight.current);
    }
  };
  const saveDeliveryOrder = async (id: number, body: { status: OrderStatus; shipperId?: number | null; cancelReason?: string; orderNote?: string }): Promise<boolean> => {
    if (!user?.token || !dbRef.current.orders.some(item => item.id === id)) return false;
    inFlight.current++; setPending(inFlight.current); setError(''); setNotice('');
    try {
      await shopApi(`/api/orders/${rawId(id)}/status`, { method: 'PUT', token: user.token, body: { ...body, ...(body.shipperId !== undefined ? { shipperId: body.shipperId === null ? null : rawId(body.shipperId) } : {}) } });
      await refresh(); return true;
    } catch (failure) {
      setError(failure instanceof ShopApiError && failure.status === 404 ? 'Chưa lưu được: API cập nhật đơn hàng chưa được kết nối.' : failure instanceof Error ? failure.message : 'Không thể cập nhật đơn giao hàng.');
      return false;
    } finally { inFlight.current--; setPending(inFlight.current); }
  };
  const remitCod = async (scheduleId: number, cash: number, note: string): Promise<boolean> => {
    if (!user?.token || !Number.isSafeInteger(cash) || cash < 0 || note.trim().length > 300) { setError('Số tiền hoặc ghi chú nộp COD không hợp lệ.'); return false; }
    const schedule = dbRef.current.work_schedules.find(item => item.id === scheduleId);
    if (!schedule) { setError('Không tìm thấy ca giao hàng cần chốt.'); return false; }
    inFlight.current++; setPending(inFlight.current); setError(''); setNotice('');
    try {
      await shopApi(`/api/work-schedules/${rawId(scheduleId)}/shift-action`, { method: 'PUT', token: user.token, body: { action: 'REMIT_COD', cash, ...(note.trim() ? { note: note.trim() } : {}) } });
      await refresh(); return true;
    } catch (failure) {
      setError(failure instanceof ShopApiError && failure.status === 404 ? 'Chưa lưu được: API chốt ca giao hàng chưa được kết nối.' : failure instanceof Error ? failure.message : 'Không thể nộp tiền COD.');
      return false;
    } finally { inFlight.current--; setPending(inFlight.current); }
  };
  const sessionId = user ? idFor('users', user._id) : 0;
  const session = useMemo(() => ({ customerId: sessionId, cashierId: sessionId, baristaId: sessionId, shipperId: sessionId, adminId: sessionId }), [sessionId]);
  return <Context.Provider value={{ db, session, loading, busy: pending > 0, revision, error, notice, unavailable, refresh, refreshOrders, notify, rawId, idFor, setSession: () => {}, transact, placeOrder,
    setOrderStatus: (id, status, patch = {}) => { transact(tx => tx.update('orders', id, { ...patch, status })); },
    cancelOrder, saveDeliveryOrder, remitCod,
    adjustPoints: (id, delta) => { perform(async () => { await shopApi('/api/loyalty-transactions/adjust', { method: 'POST', token: user?.token, body: { customerId: rawId(id), points: delta, reason: 'Điều chỉnh điểm tại quầy' } }); }); },
  }}>{children}</Context.Provider>;
}

export function useDb() { const context = useContext(Context); if (!context) throw new Error('Missing interface data provider.'); return context; }
