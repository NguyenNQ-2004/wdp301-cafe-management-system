export type PaymentChoice = 'MOMO' | 'VNPAY' | 'BANK_TRANSFER' | 'COD';

interface PaymentChoicesProps {
  demoEnabled: boolean;
  canPay: boolean;
  busy: boolean;
  selected: PaymentChoice | null;
  onSelect: (method: PaymentChoice) => void;
}

export default function PaymentChoices({ demoEnabled, canPay, busy, selected, onSelect }: PaymentChoicesProps) {
  if (!canPay) return null;

  return <div className="space-y-4" role="radiogroup" aria-label="Chọn phương thức thanh toán">
    {demoEnabled && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <h3 className="text-lg font-bold text-emerald-950">1. Thanh toán trước khi giao</h3>
      <p className="mt-2 text-sm text-emerald-900">Xác nhận thanh toán xong, đơn được ghi nhận đã trả tiền và chuyển sang chuẩn bị món. Khi nhận hàng, bạn không cần trả thêm.</p>
      <p className="mt-2 text-xs text-emerald-800">Bản demo chỉ mô phỏng giao dịch; không quét mã hoặc chuyển tiền thật.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {([['MOMO', 'MoMo'], ['VNPAY', 'VNPay'], ['BANK_TRANSFER', 'Chuyển khoản']] as const).map(([provider, label]) =>
          <label key={provider} className={`flex items-center gap-2 rounded-lg border px-3 py-3 text-sm font-bold cursor-pointer ${selected === provider ? 'border-emerald-700 bg-emerald-800 text-white' : 'border-emerald-300 bg-white text-emerald-950'}`}>
            <input type="radio" name="payment-method" value={provider} checked={selected === provider} disabled={busy} onChange={() => onSelect(provider)} className="accent-emerald-800" />
            {label}
          </label>
        )}
      </div>
    </section>}

    {!demoEnabled && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <h3 className="text-lg font-bold text-emerald-950">1. Thanh toán trước bằng VietQR</h3>
      <p className="mt-2 text-sm text-emerald-900">Quét mã chuyển khoản ở phía trên. Đơn chỉ được ghi nhận đã thanh toán khi hệ thống nhận xác nhận từ cổng thanh toán.</p>
      <label className={`mt-4 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-bold cursor-pointer ${selected === 'BANK_TRANSFER' ? 'border-emerald-700 bg-emerald-800 text-white' : 'border-emerald-300 bg-white text-emerald-950'}`}>
        <input type="radio" name="payment-method" value="BANK_TRANSFER" checked={selected === 'BANK_TRANSFER'} disabled={busy} onChange={() => onSelect('BANK_TRANSFER')} className="accent-emerald-800" />
        Chọn chuyển khoản VietQR
      </label>
    </section>}

    <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
      <h3 className="text-lg font-bold text-rose-950">2. Thanh toán khi nhận hàng (COD)</h3>
      <p className="mt-2 text-sm text-rose-900">Đơn được xác nhận và chuẩn bị ngay. Bạn trả tiền cho nhân viên giao hàng khi nhận món; trạng thái tiền vẫn là chờ thu cho đến lúc giao thành công.</p>
      <label className={`mt-4 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-bold cursor-pointer ${selected === 'COD' ? 'border-primary bg-primary text-white' : 'border-rose-300 bg-white text-rose-950'}`}>
        <input type="radio" name="payment-method" value="COD" checked={selected === 'COD'} disabled={busy} onChange={() => onSelect('COD')} className="accent-primary" />
        Chọn COD — trả tiền lúc nhận hàng
      </label>
    </section>
  </div>;
}
