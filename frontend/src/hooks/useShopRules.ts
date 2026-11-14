import { useEffect, useState } from 'react';
import { shopApi } from '../lib/shopApi';
export default function useShopRules() {
  const [rules, setRules] = useState({ freeship_threshold: 150000, delivery_fee: 18000, delivery_minutes: 30 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; shopApi<{ settings: Record<string, string> }>('/api/shop-settings').then(data => { if (!active) return; setRules(current => ({ freeship_threshold: Number(data.settings.freeship_threshold ?? current.freeship_threshold), delivery_fee: Number(data.settings.delivery_fee ?? current.delivery_fee), delivery_minutes: Number(data.settings.delivery_minutes ?? current.delivery_minutes) })); }).catch(failure => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  return { rules, loading, error };
}
