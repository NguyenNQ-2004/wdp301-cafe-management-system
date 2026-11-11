import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartPayload, formatVnd, shopApi, ShopApiError } from '../lib/shopApi';
import { repairDisplayText } from '../lib/displayText';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import useLoyalty from '../hooks/useLoyalty';
import useShopRules from '../hooks/useShopRules';
import type { OrderRecord } from '../types/shop';
import '../interface/storefront.css';
import { checkoutIdentity } from '../lib/checkoutIdentity';

interface DeliveryAreaOption {
  _id: string;
  district: string;
  deliveryFee: number;
}

export default function CheckoutPage({ onRequestAuth }: { onRequestAuth: () => void }) {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const cart = useCartStore();
  const { summary: loyalty, loading: loyaltyLoading, error: loyaltyError } = useLoyalty(user?.token);
  const shop = useShopRules();
  const [areas, setAreas] = useState<DeliveryAreaOption[]>([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [deliveryAvailable, setDeliveryAvailable] = useState<boolean | null>(null);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [areaError, setAreaError] = useState('');
  const [name, setName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  useEffect(() => {
    setAreasLoading(true);
    shopApi<DeliveryAreaOption[]>('/api/delivery-areas')
      .then(list => {
        setAreas(list);
        if (list.length > 0 && !district) setDistrict(list[0].district);
      })
      .catch(() => setAreaError('Không tải được khu vực giao hàng. Vui lòng tải lại trang.'))
      .finally(() => setAreasLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      shopApi<{ available: boolean }>('/api/delivery-areas/availability')
        .then(result => { if (active) { setDeliveryAvailable(result.available); setAvailabilityError(false); } })
        .catch(() => { if (active) { setDeliveryAvailable(null); setAvailabilityError(true); } });
    };
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  const items = cart.items.filter(item => item.checked);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const step = loyalty?.rules?.points_step || 10;
  const stepValue = loyalty?.rules?.points_step_value ?? 2000;
  const points = loyalty?.canRedeem && stepValue > 0 ? Math.min(Math.floor((cart.pointsToUse || 0) / step), Math.floor(loyalty.totalPoints / step), Math.floor(subtotal / stepValue)) * step : 0;
  const discount = points / step * stepValue;
  const selectedArea = areas.find(a => a.district.toLowerCase() === district.trim().toLowerCase());
  const configuredDistrictFee = selectedArea?.deliveryFee ?? 0;
  const fee = subtotal < shop.rules.freeship_threshold ? configuredDistrictFee : 0;
  const total = subtotal - discount + fee;
  const customer = user?.role === 'CUSTOMER';
  const ready = deliveryAvailable === true && !areasLoading && !!customer && !!selectedArea && !areaError && cart.ready && cart.ownerId === user?._id && !cart.syncError && !shop.loading && !shop.error && !loyaltyLoading && !loyaltyError;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) { onRequestAuth(); return; }
    if (!customer) { setError('Hãy đăng nhập bằng tài khoản khách hàng để đặt món.'); return; }
    if (!ready || pending.current || !items.length) return;
    const recipientPhone = phone.replace(/[\s.]/g, '');
    if (!/^0\d{9,10}$/.test(recipientPhone)) { setError('Số điện thoại cần 10–11 chữ số, bắt đầu bằng số 0.'); return; }
    pending.current = true; setBusy(true); setError('');
    try {
      const payload = { checkoutFlow: true, items: cartPayload(items), orderType: 'ONLINE', recipientName: name.trim(), recipientPhone, district: district.trim(), ward: ward.trim(), addressDetail: addressDetail.trim(), orderNote: note.trim(), pointsToRedeem: points || undefined, expectedTotal: total };
      const order = await shopApi<OrderRecord>('/api/orders', { method: 'POST', token: user.token, body: { ...payload, ...checkoutIdentity(user._id, payload) } });
      cart.setRewardId(null);
      navigate('/payment?orderId=' + order._id);
    } catch (failure) {
      if (failure instanceof ShopApiError && typeof failure.data?.pendingOrderId === 'string') navigate('/payment?orderId=' + encodeURIComponent(failure.data.pendingOrderId));
      else setError((failure as Error).message);
    }
    finally { pending.current = false; setBusy(false); }
  };
  return <div className="bg-[#f8fafc] px-3 py-6"><div className="mx-auto max-w-[1140px]">
    <div className="mx-auto mb-6 grid max-w-xl grid-cols-3 text-center text-xs font-semibold">{['Giỏ hàng', 'Xác nhận đơn', 'Thanh toán'].map((label, index) => <div key={label} className={index < 2 ? 'text-primary' : 'text-stone-400'}><span className={`mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full ${index < 2 ? 'bg-primary text-white' : 'bg-stone-200'}`}>{index === 0 ? '✓' : index + 1}</span>{label}</div>)}</div>
    {!customer && <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><p>{user ? 'Tài khoản quản trị/nhân viên chỉ dùng cho nghiệp vụ nội bộ. Hãy đăng nhập bằng tài khoản CUSTOMER.' : 'Bạn có thể nhập trước thông tin giao hàng. Đăng nhập bằng tài khoản khách hàng để xác nhận đơn.'}</p><button className="swp-primary-button" onClick={onRequestAuth}>Đăng nhập tài khoản khách hàng</button></div>}
    {deliveryAvailable !== true && <p role="status" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{availabilityError ? 'Chưa kiểm tra được shipper đang trong ca. Hệ thống sẽ thử lại sau ít phút.' : deliveryAvailable === false ? 'Hiện chưa có shipper đang trong ca. Vui lòng quay lại khi có nhân viên giao hàng.' : 'Đang kiểm tra nhân viên giao hàng...'}</p>}
    {(error || areaError || (!areasLoading && !areas.length && 'Chưa có khu vực giao hàng được cấu hình.') || loyaltyError || shop.error || cart.syncError) && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error || areaError || (!areasLoading && !areas.length && 'Chưa có khu vực giao hàng được cấu hình.') || loyaltyError || shop.error || cart.syncError}</p>}
    <form onSubmit={submit} className="swp-checkout-grid"><div>
      <section className="swp-checkout-card"><h2><span className="material-symbols-outlined">person</span>Thông tin người nhận <small className="ml-auto text-xs font-normal text-primary">Bước 2 / 3</small></h2><div className="rounded-xl border border-red-100 bg-[#fffafa] p-4">
        <div className="swp-checkout-pair"><label>Họ tên người nhận *<input className="swp-form-control" maxLength={100} required autoComplete="name" placeholder="Nguyễn Văn An" value={name} onChange={event => setName(event.target.value)} /></label><label>Số điện thoại *<input className="swp-form-control" type="tel" maxLength={15} required autoComplete="tel" placeholder="0908 123 456" value={phone} onChange={event => setPhone(event.target.value)} /></label></div>
        <div className="swp-checkout-address">
          <label>Tỉnh / Thành phố<input className="swp-form-control" value="Hà Nội" readOnly /></label>
          <label>Quận / Huyện *
            {areas.length > 0 ? (
              <select
                className="swp-form-control"
                required
                value={district}
                onChange={event => setDistrict(event.target.value)}
              >
                <option value="">-- Chọn Quận / Huyện --</option>
                {areas.map(a => (
                  <option key={a._id} value={a.district}>
                    {a.district} ({formatVnd(a.deliveryFee)})
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="swp-form-control"
                minLength={2}
                maxLength={100}
                required
                placeholder="VD: Cầu Giấy"
                value={district}
                onChange={event => setDistrict(event.target.value)}
              />
            )}
          </label>
          <label>Phường / Xã *<input className="swp-form-control" minLength={2} maxLength={100} required placeholder="VD: Tràng Tiền" value={ward} onChange={event => setWard(event.target.value)} /></label>
        </div>
        <label>Địa chỉ chi tiết *<input className="swp-form-control" minLength={5} maxLength={150} required placeholder="Số nhà, tên đường, toà nhà, tầng / phòng" value={addressDetail} onChange={event => setAddressDetail(event.target.value)} /></label>
      </div></section>
      <section className="swp-checkout-card"><h2><span className="material-symbols-outlined">edit_note</span>Ghi chú cho quán & shipper</h2><textarea className="swp-form-control" rows={3} maxLength={500} placeholder="VD: Ít đá, gửi bảo vệ tầng hầm B1, gọi điện trước khi giao." value={note} onChange={event => setNote(event.target.value)} /></section>
    </div><aside><section className="swp-checkout-card sticky top-28"><div className="mb-3 flex justify-between gap-3"><h2><span className="material-symbols-outlined">receipt_long</span>Kiểm tra đơn hàng ({items.length} món)</h2><Link to="/cart" className="text-xs font-semibold text-primary">Sửa giỏ</Link></div>
      {items.map(item => <div key={item.cartId} className="mb-4 flex items-center gap-3"><img className="h-14 w-14 rounded-lg object-cover" src={item.image || '/cafe-placeholder.svg'} alt={item.name} /><div className="min-w-0 flex-1"><strong className="text-sm">{item.name}</strong><p className="text-xs text-stone-500">{item.quantity}x · Size {item.size}{(item.customization?.topping || []).map(name => ` · ${repairDisplayText(name)}`).join('')}</p></div><strong className="text-sm">{formatVnd(item.unitPrice * item.quantity)}</strong></div>)}
      {!items.length && <p className="mb-5 text-sm text-stone-500">Chưa chọn món. <Link to="/menu" className="text-primary">Xem thực đơn</Link></p>}
      <div className="space-y-3 border-y py-4 text-sm"><p className="flex justify-between"><span>Tổng tiền món ({items.length} món):</span><strong>{formatVnd(subtotal)}</strong></p><p className="flex justify-between"><span>Phí giao hàng:</span><strong>{fee ? formatVnd(fee) : 'Miễn phí'}</strong></p>{points > 0 && <p className="flex justify-between text-primary"><span>Dùng {points} điểm Aura:</span><strong>−{formatVnd(discount)}</strong></p>}</div><p className="my-5 flex items-end justify-between"><strong className="text-lg">Tổng thanh toán</strong><strong className="text-3xl text-primary">{formatVnd(total)}</strong></p><button type={user ? 'submit' : 'button'} onClick={user ? undefined : onRequestAuth} disabled={busy || !items.length || (!!user && !ready)} className="swp-primary-button w-full disabled:opacity-50">{busy ? 'Đang tạo đơn...' : 'Xác nhận & Tiếp tục thanh toán →'}</button><p className="mt-3 text-xs leading-relaxed text-stone-500">Chọn thanh toán QR hoặc COD ở bước tiếp theo. Món được giữ trong giỏ đến khi xác nhận phương thức thanh toán.</p><Link to="/cart" className="mt-4 block text-center text-sm font-semibold text-stone-500">← Quay lại giỏ hàng</Link>
    </section></aside></form>
  </div></div>;
}
