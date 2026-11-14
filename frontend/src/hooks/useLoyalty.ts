import { useEffect, useState } from 'react';
import { shopApi } from '../lib/shopApi';
import type { LoyaltySummary } from '../types/shop';

export default function useLoyalty(token?: string) {
  // [DT13] . Giỏ hàng và checkout đọc số dư/khả năng đổi điểm qua /api/rewards, đọc tỷ lệ qua /api/loyalty-transactions/rules.
  // [DT13] .. Chưa đăng nhập thì không đọc điểm; lỗi API được trả về màn hình, không tự coi là 0 điểm.
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setSummary(null); setLoading(false); setError(''); return; }
    let active = true;
    setSummary(null);
    setLoading(true);
    setError('');
    Promise.all([shopApi<LoyaltySummary>('/api/rewards', { token }), shopApi<NonNullable<LoyaltySummary['rules']>>('/api/loyalty-transactions/rules', { token })])
      .then(([data, rules]) => { if (active) setSummary({ ...data, rules }); })
      .catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  return { summary, loading, error };
}
