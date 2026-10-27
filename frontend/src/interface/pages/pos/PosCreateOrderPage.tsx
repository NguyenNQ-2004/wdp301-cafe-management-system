import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PageRoute, PaymentMethod, Product, User, OrderCustomization } from '../../types';
import { PosHeader } from './PosHeader';
import { useDb } from '../../data/DbContext';
import {
  PAYMENT_METHOD_ICON,
  PAYMENT_METHOD_LABEL,
  calcUnitPrice,
  defaultSize,
  describeCustomization,
  fmtMoney,
  fmtNumber,
  getSettingNumber,
  initials,
  maxRedeemPoints,
  nowSql,
  pointsToMoney,
  productSizes,
  productToppings
} from '../../data/dbUtils';

interface PosCreateOrderPageProps {
  onNavigate: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
}

interface PosCartItem {
  id: string;
  product_id: number;
  quantity: number;
  unit_price: number;
  customization: OrderCustomization;
}

const SUGAR_LEVELS = ['0%', '30%', '50%', '70%', '100%'];
const ICE_LEVELS = ['Không đá', 'Ít đá', 'Đá chuẩn'];
const METHODS: PaymentMethod[] = ['CASH', 'BANK_TRANSFER', 'VNPAY', 'MOMO'];

export const PosCreateOrderPage: React.FC<PosCreateOrderPageProps> = ({ onNavigate, onShowToast }) => {
  const navigate = useNavigate();
  const { db, session, placeOrder, transact, rawId } = useDb();
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // orders.order_type + orders.table_number
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [tableNumber, setTableNumber] = useState('T01');
  const [orderNote, setOrderNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  // Khách hàng (users.role = CUSTOMER) tra theo số điện thoại
  const [phoneQuery, setPhoneQuery] = useState('');
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);
  const [newCustForm, setNewCustForm] = useState({ phone: '', full_name: '', birthday: '' });

  const [cartItems, setCartItems] = useState<PosCartItem[]>([]);

  // Modal tuỳ chọn món
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalSize, setModalSize] = useState<string | undefined>();
  const [modalSugar, setModalSugar] = useState('50%');
  const [modalIce, setModalIce] = useState('Đá chuẩn');
  const [modalToppings, setModalToppings] = useState<string[]>([]);
  const [modalNote, setModalNote] = useState('');
  const [modalQty, setModalQty] = useState(1);

  const customer: User | undefined = customerId ? db.users.find(u => u.id === customerId) : undefined;
  const activeCategories = db.categories.filter(c => c.status === 'ACTIVE');
  const catalog = db.products.filter(p => p.is_available);
  const productOf = (id: number) => db.products.find(p => p.id === id);
  const isBakery = (p: Product) => db.categories.find(c => c.id === p.category_id)?.name === 'Bánh ngọt';

  // total_amount, discount_amount, final_amount (tại quầy không có delivery_fee)
  const subtotal = cartItems.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  const maxPoints = customer ? maxRedeemPoints(db, customer.total_points, subtotal) : 0;
  const redeem = Math.min(pointsToRedeem, maxPoints);
  const discount = pointsToMoney(db, redeem);
  const total = subtotal - discount;

  const filteredCatalog = catalog.filter(p => {
    const q = searchQuery.trim().toLowerCase();
    const matchCat = activeCategory === 'all' || p.category_id === activeCategory;
    return matchCat && (q === '' || p.name.toLowerCase().includes(q) || String(p.id) === q);
  });

  const handleOpenCustomizer = (p: Product) => {
    setSelectedProduct(p);
    setModalSize(defaultSize(p));
    setModalSugar('50%');
    setModalIce('Đá chuẩn');
    setModalToppings([]);
    setModalNote('');
    setModalQty(1);
  };

  const handleConfirmAddToCart = () => {
    if (!selectedProduct) return;
    const bakery = isBakery(selectedProduct);
    const customization: OrderCustomization = {
      size: modalSize,
      ...(bakery ? {} : { sugar: modalSugar, ice: modalIce }),
      ...(modalToppings.length ? { topping: modalToppings } : {}),
      ...(modalNote.trim() ? { note: modalNote.trim() } : {})
    };
    setCartItems(prev => [
      {
        id: `p-${Date.now()}`,
        product_id: selectedProduct.id,
        quantity: modalQty,
        unit_price: calcUnitPrice(selectedProduct, modalSize, modalToppings),
        customization
      },
      ...prev
    ]);
    onShowToast?.(`Đã thêm "${selectedProduct.name}" vào đơn.`);
    setSelectedProduct(null);
  };

  const handleUpdateQty = (id: string, delta: number) =>
    setCartItems(prev => prev.map(i => (i.id === id ? { ...i, quantity: i.quantity + delta } : i)).filter(i => i.quantity > 0));

  const handleLookup = () => {
    const phone = phoneQuery.replace(/\s/g, '');
    const found = db.users.find(u => u.role === 'CUSTOMER' && u.phone === phone);
    if (found) {
      setCustomerId(found.id);
      setPointsToRedeem(0);
      onShowToast?.(`Đã tìm thấy khách ${found.full_name} (${found.total_points} điểm).`);
    } else {
      setNewCustForm({ phone, full_name: '', birthday: '' });
      setIsNewCustModalOpen(true);
    }
  };

  const handleRegisterNewCust = (e: React.FormEvent) => {
    e.preventDefault();
    if (db.users.some(u => u.phone === newCustForm.phone.trim())) {
      onShowToast?.('Số điện thoại đã tồn tại trong hệ thống.');
      return;
    }
    const created = transact(tx =>
      tx.insert('users', {
        full_name: newCustForm.full_name.trim(),
        phone: newCustForm.phone.trim(),
        email: null,
        password_hash: 'pos_created',
        birthday: newCustForm.birthday || null,
        address: null,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        position: null,
        base_salary: 0,
        hire_date: null,
        total_points: 0,
        created_at: nowSql()
      })
    );
    setCustomerId(created.id);
    setIsNewCustModalOpen(false);
    onShowToast?.(`Đã tạo tài khoản khách hàng cho ${created.full_name}.`);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      onShowToast?.('Đơn chưa có món nào.');
      return;
    }
    if (orderType === 'DINE_IN' && !tableNumber.trim()) {
      onShowToast?.('Vui lòng nhập số bàn cho đơn tại quán.');
      return;
    }
    try {
    const order = await placeOrder({
      customer_id: customerId,
      cashier_id: session.cashierId,
      order_type: orderType,
      status: 'CONFIRMED',
      table_number: orderType === 'DINE_IN' ? tableNumber.trim() : null,
      order_note: orderNote.trim(),
      delivery_fee: 0,
      points_to_redeem: redeem,
      items: cartItems.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        customization: i.customization
      }))
    });
    setCartItems([]);
    setOrderNote('');
    setPointsToRedeem(0);
    setCustomerId(null);
    setPhoneQuery('');
    navigate(`/cashier/payments?orderId=${encodeURIComponent(rawId(order.id))}&method=${paymentMethod}`);
    } catch (error) { onShowToast?.((error as Error).message); }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-16 flex flex-col">
      <PosHeader currentRoute="pos-create" onNavigate={onNavigate} onShowToast={onShowToast} />

      <div className="w-full px-4 sm:px-6 py-2.5 bg-stone-100 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">Screen 8 • Tạo đơn tại quầy</span>
          <span className="text-xs text-stone-600">{catalog.length} món đang bán</span>
        </div>
        <button
          onClick={() => onNavigate('pos-orders')}
          className="h-8 px-3 rounded-lg bg-white hover:bg-stone-100 text-stone-700 font-medium flex items-center gap-1.5 border border-stone-200 shadow-2xs text-xs"
        >
          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
          <span>Danh sách đơn ({db.orders.filter(o => o.cashier_id === session.cashierId).length})</span>
        </button>
      </div>

      <div className="w-full px-4 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        {/* LEFT: Catalog */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs flex flex-col gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[20px]">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên món hoặc mã món..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-xs sm:text-sm placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[{ id: 'all' as const, name: `Tất cả (${catalog.length})` }, ...activeCategories].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    activeCategory === cat.id ? 'bg-primary text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredCatalog.map(item => (
              <div
                key={item.id}
                onClick={() => handleOpenCustomizer(item)}
                className="cursor-pointer group flex flex-col justify-between p-3 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 shadow-2xs hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div>
                  <div className="relative w-full h-32 rounded-xl overflow-hidden bg-stone-100 mb-2">
                    <img src={item.image_url ?? ''} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {item.badge && (
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-primary text-white font-bold text-[10px] shadow-sm">{item.badge}</span>
                    )}
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-white/90 font-mono text-[10px] text-stone-700 font-bold">#{item.id}</span>
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-stone-900 group-hover:text-primary transition-colors line-clamp-1">{item.name}</h4>
                  <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">{item.subtitle}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between">
                  <span className="font-extrabold text-sm sm:text-base text-primary">{fmtMoney(item.base_price)}</span>
                  <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">{productSizes(item).length} size</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Customer + Cart */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[20px]">loyalty</span>
                <span className="font-bold text-sm text-stone-900">Khách hàng tích điểm</span>
              </div>
              <button
                onClick={() => {
                  setNewCustForm({ phone: phoneQuery, full_name: '', birthday: '' });
                  setIsNewCustModalOpen(true);
                }}
                className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">person_add</span>
                Khách mới
              </button>
            </div>

            {customer ? (
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {initials(customer.full_name)}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-stone-900 block">{customer.full_name}</span>
                      <span className="text-xs text-stone-500 font-mono">
                        {customer.phone} • {fmtNumber(customer.total_points)} điểm
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setCustomerId(null);
                      setPointsToRedeem(0);
                    }}
                    className="text-stone-400 hover:text-rose-600 p-1"
                    title="Gỡ khách khỏi đơn"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
                <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between gap-2 text-xs">
                  <span className="text-stone-600">Đổi điểm (tối đa {maxPoints}):</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={maxPoints}
                      step={getSettingNumber(db, 'points_step', 10)}
                      value={redeem}
                      onChange={e => setPointsToRedeem(Math.max(0, Number(e.target.value)))}
                      className="w-20 h-8 px-2 rounded-lg border border-stone-300 font-mono text-right"
                    />
                    <span className="text-primary font-bold">-{fmtMoney(discount)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={phoneQuery}
                  onChange={e => setPhoneQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLookup()}
                  placeholder="Nhập SĐT khách hàng..."
                  className="flex-1 h-10 px-3 text-xs bg-stone-50 rounded-xl border border-stone-200 font-mono"
                />
                <button onClick={handleLookup} className="h-10 px-3.5 bg-primary text-white text-xs font-bold rounded-xl">
                  Tra cứu
                </button>
              </div>
            )}

            {/* order_type */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setOrderType('DINE_IN')}
                className={`h-11 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  orderType === 'DINE_IN' ? 'bg-primary text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">table_restaurant</span>
                Tại quán
              </button>
              <button
                type="button"
                onClick={() => setOrderType('TAKEAWAY')}
                className={`h-11 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  orderType === 'TAKEAWAY' ? 'bg-primary text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">takeout_dining</span>
                Mang đi
              </button>
            </div>
            {orderType === 'DINE_IN' && (
              <label className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-stone-700 shrink-0">Số bàn:</span>
                <input
                  value={tableNumber}
                  onChange={e => setTableNumber(e.target.value)}
                  maxLength={20}
                  className="flex-1 h-9 px-3 rounded-xl border border-stone-300 font-mono font-bold"
                />
              </label>
            )}
          </div>

          {/* Cart */}
          <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">shopping_bag</span>
                Chi tiết đơn ({cartItems.length} dòng)
              </h3>
              <button onClick={() => setCartItems([])} className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
                Xóa hết
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {cartItems.length === 0 && <p className="text-xs text-stone-400 text-center py-4">Chọn món bên trái để thêm vào đơn.</p>}
              {cartItems.map(item => (
                <div key={item.id} className="p-3 bg-stone-50 hover:bg-stone-100/80 rounded-xl border border-stone-200/70 transition-colors flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-stone-900">{productOf(item.product_id)?.name}</p>
                      <p className="text-[11px] text-primary font-medium mt-0.5">{describeCustomization(item.customization)}</p>
                      {item.customization.note && <p className="text-[11px] text-amber-800 italic">Ghi chú: {item.customization.note}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-xs sm:text-sm text-primary">{fmtMoney(item.unit_price * item.quantity)}</p>
                      <p className="text-[10px] text-stone-400">{fmtMoney(item.unit_price)} / phần</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-stone-200/50">
                    <div className="flex items-center gap-1.5 bg-white rounded-lg p-0.5 border border-stone-200">
                      <button onClick={() => handleUpdateQty(item.id, -1)} className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 flex items-center justify-center font-bold text-xs">-</button>
                      <span className="w-6 text-center font-mono font-bold text-xs">{item.quantity}</span>
                      <button onClick={() => handleUpdateQty(item.id, 1)} className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 flex items-center justify-center font-bold text-xs">+</button>
                    </div>
                    <button
                      onClick={() => setCartItems(prev => prev.filter(i => i.id !== item.id))}
                      className="p-1 rounded text-stone-400 hover:text-rose-600"
                      title="Xóa món"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <textarea
              rows={2}
              value={orderNote}
              onChange={e => setOrderNote(e.target.value)}
              placeholder="Ghi chú đơn hàng (orders.order_note)..."
              className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:border-primary resize-none"
            />

            <div className="p-3 bg-stone-100/70 rounded-xl space-y-1.5 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Tổng tiền món:</span>
                <span className="font-mono text-stone-900 font-semibold">{fmtMoney(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Giảm giá đổi {redeem} điểm:</span>
                  <span className="font-mono font-semibold">-{fmtMoney(discount)}</span>
                </div>
              )}
              <div className="pt-2 mt-1 border-t border-stone-200 flex items-center justify-between text-stone-900">
                <span className="text-xs font-bold uppercase tracking-wider">Tổng thanh toán:</span>
                <span className="text-xl sm:text-2xl font-black text-primary font-mono">{fmtMoney(total)}</span>
              </div>
            </div>

            {/* payments.payment_method */}
            <div>
              <span className="text-xs font-bold text-stone-700 block mb-1.5">Phương thức thanh toán:</span>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {METHODS.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      paymentMethod === m ? 'bg-primary text-white border-primary shadow-xs font-bold' : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{PAYMENT_METHOD_ICON[m]}</span>
                    <span className="text-[11px]">{PAYMENT_METHOD_LABEL[m]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleCheckout}
                className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">receipt</span>
                <span>TẠO ĐƠN & ĐẾN THANH TOÁN</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCartItems([]);
                  setCustomerId(null);
                  setOrderNote('');
                  onShowToast?.('Đã hủy đơn đang tạo.');
                }}
                className="w-full py-2.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold flex items-center justify-center gap-1 border border-rose-200 text-xs"
              >
                <span className="material-symbols-outlined text-[16px]">cancel</span>
                <span>HỦY ĐƠN ĐANG TẠO</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Item Customizer Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg text-stone-900">{selectedProduct.name}</h3>
                <p className="text-xs text-stone-500 mt-0.5">{selectedProduct.description}</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {productSizes(selectedProduct).length > 0 && (
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-2">Kích cỡ:</label>
                <div className="grid grid-cols-3 gap-2">
                  {productSizes(selectedProduct).map(([name, delta]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setModalSize(name)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-0.5 ${
                        modalSize === name ? 'bg-primary text-white border-primary shadow-xs' : 'bg-stone-50 text-stone-700 border-stone-200'
                      }`}
                    >
                      <span>{name}</span>
                      <span className="text-[10px] opacity-80">+{fmtMoney(delta)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isBakery(selectedProduct) && (
              <>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-2">Mức đường:</label>
                  <div className="grid grid-cols-5 gap-1.5 text-xs">
                    {SUGAR_LEVELS.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setModalSugar(s)}
                        className={`py-2 rounded-lg border font-semibold ${modalSugar === s ? 'bg-primary text-white border-primary' : 'bg-stone-50 text-stone-700 border-stone-200'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-2">Mức đá:</label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {ICE_LEVELS.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setModalIce(s)}
                        className={`py-2 rounded-lg border font-semibold ${modalIce === s ? 'bg-primary text-white border-primary' : 'bg-stone-50 text-stone-700 border-stone-200'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {productToppings(selectedProduct).length > 0 && (
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-2">Topping:</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {productToppings(selectedProduct).map(top => {
                    const checked = modalToppings.includes(top.name);
                    return (
                      <label
                        key={top.name}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          checked ? 'bg-primary/5 border-primary text-primary font-bold' : 'border-stone-200 text-stone-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setModalToppings(prev => (checked ? prev.filter(t => t !== top.name) : [...prev, top.name]))
                          }
                          className="accent-primary w-4 h-4 rounded"
                        />
                        <div className="flex flex-col">
                          <span>{top.name}</span>
                          <span className="text-[10px] opacity-80 font-mono">+{fmtMoney(top.price)}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <input
              value={modalNote}
              onChange={e => setModalNote(e.target.value)}
              placeholder="Ghi chú cho barista..."
              className="w-full h-10 px-3 rounded-xl border border-stone-300 text-xs"
            />

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-stone-100 rounded-xl p-1 border border-stone-200">
                <button type="button" onClick={() => setModalQty(Math.max(1, modalQty - 1))} className="w-8 h-8 rounded-lg bg-white font-bold text-stone-800">-</button>
                <span className="w-8 text-center font-mono font-bold text-sm">{modalQty}</span>
                <button type="button" onClick={() => setModalQty(modalQty + 1)} className="w-8 h-8 rounded-lg bg-white font-bold text-stone-800">+</button>
              </div>
              <button
                type="button"
                onClick={handleConfirmAddToCart}
                className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-bold text-xs sm:text-sm hover:bg-primary-container shadow-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                <span>THÊM VÀO ĐƠN • {fmtMoney(calcUnitPrice(selectedProduct, modalSize, modalToppings) * modalQty)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Customer Modal (users) */}
      {isNewCustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person_add</span>
                Đăng ký khách hàng
              </h3>
              <button onClick={() => setIsNewCustModalOpen(false)} className="text-stone-400 hover:text-stone-600 text-sm">✕</button>
            </div>
            <form onSubmit={handleRegisterNewCust} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Số điện thoại *</label>
                <input
                  type="tel"
                  required
                  maxLength={20}
                  value={newCustForm.phone}
                  onChange={e => setNewCustForm({ ...newCustForm, phone: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-stone-300 focus:outline-none focus:border-primary font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={newCustForm.full_name}
                  onChange={e => setNewCustForm({ ...newCustForm, full_name: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-stone-300 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Ngày sinh</label>
                <input
                  type="date"
                  value={newCustForm.birthday}
                  onChange={e => setNewCustForm({ ...newCustForm, birthday: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-stone-300 focus:outline-none focus:border-primary"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsNewCustModalOpen(false)} className="px-4 py-2 rounded-xl text-stone-600 font-semibold">
                  Bỏ qua
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-primary text-white font-bold shadow-xs hover:bg-primary-container">
                  Lưu & Gắn vào đơn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
