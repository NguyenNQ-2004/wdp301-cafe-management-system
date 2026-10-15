import React, { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../store/authStore';
import { AdminLayout, Badge, Field, FormActions, Modal, StatCard, PrimaryButton, inputCls } from './AdminUi';

interface TierConfig {
  _id?: string;
  tierCode: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  tierName: string;
  minPoints: number;
  minSpent: number;
  discountPercent: number;
  pointMultiplier: number;
  description?: string;
  color?: string;
}

interface LoyaltyRules {
  points_earn_unit: number;
  points_step: number;
  points_step_value: number;
  tiers: TierConfig[];
}

interface CustomerLookup {
  user: {
    _id: string;
    fullName: string;
    phone: string;
    email?: string;
    tierName: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
    totalPoints: number;
  };
  totalSpent: number;
  completedOrdersCount: number;
  cashValue: number;
  lastOrder?: {
    orderCode: string;
    finalAmount: number;
    createdAt: string;
  };
  recentTransactions?: LoyaltyLogItem[];
}

interface LoyaltyLogItem {
  _id: string;
  customer?: {
    _id: string;
    fullName: string;
    phone: string;
    tierName: string;
    totalPoints: number;
  };
  order?: {
    orderCode: string;
    finalAmount: number;
    createdAt: string;
  };
  pointsChange: number;
  balanceAfter?: number;
  transactionType: 'EARN' | 'REDEEM';
  reason?: string;
  performedBy?: {
    fullName: string;
    position?: string;
  };
  createdAt: string;
}

interface LoyaltyStats {
  customersWithPoints: number;
  totalPoints: number;
  totalPointsValue: number;
  totalTransactions: number;
}

const TIER_BADGES: Record<string, { label: string; cls: string; icon: string }> = {
  BRONZE: { label: 'Đồng', cls: 'bg-amber-100 text-amber-900 border border-amber-300', icon: 'military_tech' },
  SILVER: { label: 'Bạc', cls: 'bg-slate-200 text-slate-800 border border-slate-300', icon: 'workspace_premium' },
  GOLD: { label: 'Vàng', cls: 'bg-yellow-100 text-yellow-800 border border-yellow-300', icon: 'stars' },
  DIAMOND: { label: 'Kim Cương', cls: 'bg-cyan-100 text-cyan-900 border border-cyan-300 font-bold', icon: 'diamond' }
};

const fmtMoney = (n: number = 0) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))}₫`;
const fmtNumber = (n: number = 0) => new Intl.NumberFormat('vi-VN').format(n);
const fmtDateTime = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

export const AdminMembershipsPage: React.FC = () => {
  const { user } = useAuthStore();

  const [rules, setRules] = useState<LoyaltyRules>({
    points_earn_unit: 1000,
    points_step: 10,
    points_step_value: 2000,
    tiers: []
  });

  const [stats, setStats] = useState<LoyaltyStats>({
    customersWithPoints: 0,
    totalPoints: 0,
    totalPointsValue: 0,
    totalTransactions: 0
  });

  const [logs, setLogs] = useState<LoyaltyLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'EARN' | 'REDEEM'>('ALL');

  // Customer Lookup
  const [searchPhone, setSearchPhone] = useState('');
  const [lookupResult, setLookupResult] = useState<CustomerLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Adjustment Modal
  const [adjustModal, setAdjustModal] = useState<{
    type: 'add' | 'subtract';
    points: number;
    reason: string;
  } | null>(null);

  const [savingRules, setSavingRules] = useState(false);
  const [submittingAdjust, setSubmittingAdjust] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Fetch Rules & Tiers
  const fetchRules = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await fetch('http://localhost:5000/api/loyalty-transactions/rules', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRules({
          points_earn_unit: data.points_earn_unit || 1000,
          points_step: data.points_step || 10,
          points_step_value: data.points_step_value || 2000,
          tiers: data.tiers || []
        });
      }
    } catch (err: any) {
      console.error(err);
    }
  }, [user?.token]);

  // 2. Fetch Stats
  const fetchStats = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await fetch('http://localhost:5000/api/loyalty-transactions/stats', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (err: any) {
      console.error(err);
    }
  }, [user?.token]);

  // 3. Fetch Real-time Logs
  const fetchLogs = useCallback(async () => {
    if (!user?.token) return;
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'ALL') params.append('type', filterType);
      params.append('limit', '50');

      const res = await fetch(`http://localhost:5000/api/loyalty-transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (res.ok) setLogs(data.transactions || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  }, [user?.token, filterType]);

  useEffect(() => {
    fetchRules();
    fetchStats();
  }, [fetchRules, fetchStats]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle Search Phone Lookup
  const handleSearchPhone = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchPhone.trim() || !user?.token) return;
    setLookupLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/loyalty-transactions/lookup?phone=${encodeURIComponent(searchPhone.trim())}`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không tìm thấy khách hàng');
      setLookupResult(data);
      showToast(`Đã tìm thấy hội viên: ${data.user.fullName}`);
    } catch (err: any) {
      setLookupResult(null);
      showToast(err.message, 'error');
    } finally {
      setLookupLoading(false);
    }
  };

  // Handle Save Rules & Tiers
  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;
    if (rules.points_earn_unit <= 0 || rules.points_step <= 0 || rules.points_step_value < 0) {
      showToast('Giá trị quy tắc tích & đổi điểm không hợp lệ.', 'error');
      return;
    }
    setSavingRules(true);
    try {
      const res = await fetch('http://localhost:5000/api/loyalty-transactions/rules', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify(rules)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lưu quy tắc');
      showToast(data.message || 'Đã lưu cấu hình quy tắc thành công!');
      fetchRules();
      fetchStats();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingRules(false);
    }
  };

  // Handle Tier threshold change in form
  const handleTierChange = (index: number, field: keyof TierConfig, value: any) => {
    const updatedTiers = [...rules.tiers];
    updatedTiers[index] = { ...updatedTiers[index], [field]: value };
    setRules({ ...rules, tiers: updatedTiers });
  };

  // Handle Adjust Points (Earn / Redeem)
  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal || !lookupResult || !user?.token) return;
    if (adjustModal.points <= 0) {
      showToast('Số điểm thay đổi phải lớn hơn 0.', 'error');
      return;
    }

    const pointsDelta = adjustModal.type === 'add' ? adjustModal.points : -adjustModal.points;

    if (adjustModal.type === 'subtract' && adjustModal.points > lookupResult.user.totalPoints) {
      showToast('Khách hàng không đủ điểm để trừ.', 'error');
      return;
    }

    setSubmittingAdjust(true);
    try {
      const res = await fetch('http://localhost:5000/api/loyalty-transactions/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          customerId: lookupResult.user._id,
          pointsChange: pointsDelta,
          reason:
            adjustModal.reason.trim() ||
            (adjustModal.type === 'add' ? 'Cộng điểm thủ công tại quầy' : 'Đổi điểm giảm giá tại quầy')
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi điều chỉnh điểm');

      showToast(data.message);
      setAdjustModal(null);

      // Refresh lookup, stats & logs
      handleSearchPhone();
      fetchStats();
      fetchLogs();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  return (
    <AdminLayout
      activePath="/admin/memberships"
      table="loyalty_transactions, users.total_points, shop_settings, membership_tiers"
      title="Quản lý tích điểm theo Số điện thoại (Loyalty & Tiers)"
      subtitle="Chương trình khách hàng thân thiết Aura: Quản lý tỷ lệ tích/đổi điểm, điều kiện nâng hạng thẻ (Đồng, Bạc, Vàng, Kim Cương) và lịch sử biến động điểm."
      stats={
        <>
          <StatCard label="Khách hàng có điểm" value={fmtNumber(stats.customersWithPoints)} />
          <StatCard label="Tổng điểm lưu hành" value={fmtNumber(stats.totalPoints)} tone="primary" />
          <StatCard label="Giá trị quy đổi" value={fmtMoney(stats.totalPointsValue)} tone="success" hint="Giá trị tiền giảm" />
          <StatCard label="Tổng giao dịch điểm" value={fmtNumber(stats.totalTransactions)} />
        </>
      }
    >
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-sm ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{toast.msg}</span>
          </div>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Top 2 Columns: Rules & Tra cứu theo SĐT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Rules & Tiers Configuration Form */}
        <form
          onSubmit={handleSaveRules}
          className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-4 text-xs"
        >
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-600 text-[20px]">tune</span>
                Cấu hình tỷ lệ tích điểm & Hạng thẻ
              </h2>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Thiết lập công thức tích/đổi điểm và điều kiện ngưỡng thăng hạng thành viên.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-mono text-[10px] font-bold">
              ADMIN ONLY
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Chi tiêu để được 1 điểm (VNĐ) *" column="points_earn_unit">
              <input
                type="number"
                min={1}
                required
                value={rules.points_earn_unit}
                onChange={(e) => setRules({ ...rules, points_earn_unit: Number(e.target.value) })}
                className={inputCls}
              />
            </Field>

            <Field label="Bậc đổi điểm (điểm) *" column="points_step">
              <input
                type="number"
                min={1}
                required
                value={rules.points_step}
                onChange={(e) => setRules({ ...rules, points_step: Number(e.target.value) })}
                className={inputCls}
              />
            </Field>

            <Field label="Giá trị mỗi bậc (VNĐ) *" column="points_step_value">
              <input
                type="number"
                min={0}
                required
                value={rules.points_step_value}
                onChange={(e) => setRules({ ...rules, points_step_value: Number(e.target.value) })}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-600 leading-relaxed">
            💡 <strong>Ví dụ thực tế:</strong> Đơn hàng <strong>{fmtMoney(100000)}</strong> tích được{' '}
            <strong className="text-red-700 font-mono">
              {Math.floor(100000 / (rules.points_earn_unit || 1))} điểm
            </strong>
            ; Đổi <strong>{rules.points_step} điểm</strong> được giảm trừ trực tiếp{' '}
            <strong className="text-emerald-700 font-mono">{fmtMoney(rules.points_step_value)}</strong> trên hóa đơn.
          </div>

          {/* Membership Tiers Settings */}
          <div>
            <h3 className="text-xs font-bold text-stone-800 mb-2 uppercase tracking-wider">
              Ngưỡng điều kiện & Quyền lợi 4 hạng thẻ:
            </h3>
            <div className="space-y-2">
              {rules.tiers.map((tier, idx) => {
                const badge = TIER_BADGES[tier.tierCode] || TIER_BADGES.BRONZE;
                return (
                  <div
                    key={tier.tierCode}
                    className="p-3 bg-stone-50/70 border border-stone-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                  >
                    <div className="sm:col-span-3 flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${badge.cls} inline-flex items-center gap-1`}>
                        <span className="material-symbols-outlined text-[12px]">{badge.icon}</span>
                        {tier.tierName}
                      </span>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-stone-400 block font-semibold">Ngưỡng điểm</label>
                      <input
                        type="number"
                        min={0}
                        value={tier.minPoints}
                        onChange={(e) => handleTierChange(idx, 'minPoints', Number(e.target.value))}
                        className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-stone-400 block font-semibold">Ngưỡng chi tiêu (VNĐ)</label>
                      <input
                        type="number"
                        min={0}
                        value={tier.minSpent}
                        onChange={(e) => handleTierChange(idx, 'minSpent', Number(e.target.value))}
                        className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs font-mono"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-stone-400 block font-semibold">Giảm giá (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={tier.discountPercent}
                        onChange={(e) => handleTierChange(idx, 'discountPercent', Number(e.target.value))}
                        className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <PrimaryButton icon="save" type="submit" disabled={savingRules}>
              {savingRules ? 'Đang lưu quy tắc...' : 'Lưu quy tắc & Hạng thẻ'}
            </PrimaryButton>
          </div>
        </form>

        {/* Right Column: Phone Lookup & Points Adjustment Tool */}
        <section className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-4 text-xs">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-blue-600 text-[20px]">phone_iphone</span>
              Tra cứu & Tích/Đổi điểm theo Số điện thoại
            </h2>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Dành cho Thu ngân & Quản trị viên phục vụ khách tại quầy.
            </p>
          </div>

          <form onSubmit={handleSearchPhone} className="flex gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[18px]">
                dialpad
              </span>
              <input
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder="Nhập số điện thoại khách..."
                className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl outline-none focus:border-red-600 font-mono text-xs text-stone-900"
              />
            </div>
            <button
              type="submit"
              disabled={lookupLoading}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              {lookupLoading ? '...' : 'Tra cứu'}
            </button>
          </form>

          {/* Customer Lookup Result Card */}
          {lookupResult ? (
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/80 space-y-3.5 animate-fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                    {lookupResult.user.fullName}
                  </h3>
                  <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                    {lookupResult.user.phone} {lookupResult.user.email && `• ${lookupResult.user.email}`}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                    TIER_BADGES[lookupResult.user.tierName]?.cls || TIER_BADGES.BRONZE.cls
                  } inline-flex items-center gap-1`}
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {TIER_BADGES[lookupResult.user.tierName]?.icon}
                  </span>
                  {TIER_BADGES[lookupResult.user.tierName]?.label || lookupResult.user.tierName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Điểm thưởng hiện có</span>
                  <p className="text-lg font-black text-red-700 font-mono mt-0.5">
                    {fmtNumber(lookupResult.user.totalPoints)}
                  </p>
                  <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                    = {fmtMoney(lookupResult.cashValue)} giảm giá
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Tổng chi tiêu</span>
                  <p className="text-lg font-bold text-stone-900 font-mono mt-0.5">
                    {fmtMoney(lookupResult.totalSpent)}
                  </p>
                  <span className="text-[10px] text-stone-500 block mt-0.5 truncate">
                    {lookupResult.completedOrdersCount} đơn hoàn thành
                  </span>
                </div>
              </div>

              {lookupResult.lastOrder && (
                <div className="text-[11px] text-stone-500 bg-white/70 p-2.5 rounded-lg border border-stone-200">
                  <span>Đơn gần nhất: </span>
                  <strong className="font-mono text-red-700">{lookupResult.lastOrder.orderCode}</strong>
                  <span> ({fmtDateTime(lookupResult.lastOrder.createdAt)}) - </span>
                  <strong className="text-stone-900">{fmtMoney(lookupResult.lastOrder.finalAmount)}</strong>
                </div>
              )}

              {/* Action Buttons for Cashier / Staff */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAdjustModal({ type: 'add', points: 10, reason: '' })}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  Cộng điểm
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustModal({ type: 'subtract', points: 10, reason: '' })}
                  className="flex-1 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">remove_circle</span>
                  Đổi / Trừ điểm
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200 text-stone-400">
              <span className="material-symbols-outlined text-3xl mb-1 text-stone-300 block">contact_phone</span>
              Nhập số điện thoại khách hàng và nhấn "Tra cứu" để tích điểm hoặc đổi điểm giảm giá ngay tại quầy.
            </div>
          )}
        </section>
      </div>

      {/* Bottom Section: Real-time Points Logs Table */}
      <section className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-red-700 text-[20px]">history_toggle_off</span>
              Nhật ký biến động điểm Aura Rewards
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Ghi nhận theo thời gian thực mọi giao dịch tích điểm đơn hàng, đổi điểm giảm giá và điều chỉnh thủ công.
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
            <span className="text-stone-400 font-medium">Lọc:</span>
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                filterType === 'ALL' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterType('EARN')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                filterType === 'EARN' ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Tích điểm (+EARN)
            </button>
            <button
              onClick={() => setFilterType('REDEEM')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                filterType === 'REDEEM' ? 'bg-amber-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Đổi điểm (-REDEEM)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-stone-50 text-stone-600 uppercase tracking-wider font-bold border-b border-stone-200">
              <tr>
                <th className="p-3.5">Mã GD</th>
                <th className="p-3.5">Thời gian</th>
                <th className="p-3.5">Khách hàng</th>
                <th className="p-3.5 text-center">Hạng thẻ</th>
                <th className="p-3.5">Loại</th>
                <th className="p-3.5 text-right">Biến động điểm</th>
                <th className="p-3.5 text-right">Số dư sau GD</th>
                <th className="p-3.5">Lý do / Ghi chú</th>
                <th className="p-3.5">Đơn hàng</th>
                <th className="p-3.5">Người thực hiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {logsLoading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-stone-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-red-700 border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang tải nhật ký điểm...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-stone-400">
                    Chưa có giao dịch biến động điểm nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                logs.map((l) => {
                  const isEarn = l.transactionType === 'EARN';
                  const tier = TIER_BADGES[l.customer?.tierName || ''] || TIER_BADGES.BRONZE;
                  return (
                    <tr key={l._id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-stone-400">#{l._id.slice(-6).toUpperCase()}</td>
                      <td className="p-3.5 text-stone-500 font-mono">{fmtDateTime(l.createdAt)}</td>
                      <td className="p-3.5">
                        <strong className="text-stone-900 block font-semibold">
                          {l.customer?.fullName || 'Khách vãng lai'}
                        </strong>
                        <span className="font-mono text-stone-400 text-[11px]">{l.customer?.phone}</span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${tier.cls}`}>
                          {tier.label}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <Badge
                          className={
                            isEarn ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }
                        >
                          {isEarn ? 'Tích điểm (EARN)' : 'Đổi điểm (REDEEM)'}
                        </Badge>
                      </td>
                      <td
                        className={`p-3.5 text-right font-mono font-bold ${
                          l.pointsChange > 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {l.pointsChange > 0 ? `+${l.pointsChange}` : l.pointsChange}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-stone-900">
                        {fmtNumber(l.balanceAfter ?? l.customer?.totalPoints ?? 0)}
                      </td>
                      <td className="p-3.5 text-stone-600 max-w-xs truncate">{l.reason || '—'}</td>
                      <td className="p-3.5">
                        {l.order ? (
                          <span className="font-mono text-red-700 font-bold">{l.order.orderCode}</span>
                        ) : (
                          <span className="text-stone-400 italic">Thủ công</span>
                        )}
                      </td>
                      <td className="p-3.5 text-stone-500">
                        {l.performedBy ? (
                          <span>
                            {l.performedBy.fullName} {l.performedBy.position && `(${l.performedBy.position})`}
                          </span>
                        ) : (
                          'Hệ thống'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL: ĐIỀU CHỈNH ĐIỂM (CỘNG / TRỪ) */}
      {adjustModal && lookupResult && (
        <Modal
          title={
            adjustModal.type === 'add'
              ? `Cộng điểm tích lũy: ${lookupResult.user.fullName}`
              : `Trừ / Đổi điểm giảm giá: ${lookupResult.user.fullName}`
          }
          onClose={() => setAdjustModal(null)}
        >
          <form onSubmit={handleAdjustPoints} className="space-y-3.5 text-xs">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-500">Khách hàng:</span>
                <strong className="text-stone-900 font-bold">{lookupResult.user.fullName} ({lookupResult.user.phone})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Số dư điểm hiện tại:</span>
                <strong className="font-mono text-red-700 font-bold">
                  {fmtNumber(lookupResult.user.totalPoints)} điểm
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Hạng thẻ hiện tại:</span>
                <strong className="text-amber-800 font-bold">
                  {TIER_BADGES[lookupResult.user.tierName]?.label || lookupResult.user.tierName}
                </strong>
              </div>
            </div>

            <Field
              label={adjustModal.type === 'add' ? 'Số điểm cộng thêm *' : 'Số điểm trừ/quy đổi *'}
              column={adjustModal.type === 'add' ? 'points_change > 0 (EARN)' : 'points_change < 0 (REDEEM)'}
            >
              <input
                type="number"
                min={1}
                required
                value={adjustModal.points}
                onChange={(e) => setAdjustModal({ ...adjustModal, points: Math.max(1, parseInt(e.target.value) || 0) })}
                className={inputCls}
              />
            </Field>

            <Field label="Lý do / Ghi chú giao dịch" column="loyalty_transactions.reason">
              <input
                value={adjustModal.reason}
                onChange={(e) => setAdjustModal({ ...adjustModal, reason: e.target.value })}
                placeholder={
                  adjustModal.type === 'add'
                    ? 'Ví dụ: Tặng điểm sinh nhật, bù đơn trễ...'
                    : 'Ví dụ: Đổi voucher giảm giá 20.000đ tại quầy...'
                }
                className={inputCls}
              />
            </Field>

            <FormActions
              onCancel={() => setAdjustModal(null)}
              submitLabel={adjustModal.type === 'add' ? 'Xác nhận cộng điểm' : 'Xác nhận trừ điểm'}
              loading={submittingAdjust}
            />
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
};

export default AdminMembershipsPage;
