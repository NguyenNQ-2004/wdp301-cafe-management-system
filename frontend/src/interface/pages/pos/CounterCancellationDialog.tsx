import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Order } from '../../types';
import { useDb } from '../../data/DbContext';

export default function CounterCancellationDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const { cancelOrder, error, notify } = useDb();
  const title = useId();
  const dialog = useRef<HTMLElement>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector('textarea')?.focus();
    return () => { previous?.focus(); };
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (saving || !reason.trim()) return;
    setSaving(true); setFailed(false);
    try {
      if (await cancelOrder(order.id, reason.trim())) { notify(`Đã hủy đơn ${order.order_code}.`); onClose(); }
      else setFailed(true);
    } catch { setFailed(true); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4">
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby={title} className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white shadow-xl" onKeyDown={event => {
      if (event.key === 'Escape' && !saving) { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const fields = Array.from(dialog.current?.querySelectorAll<HTMLElement>('textarea:not(:disabled), button:not(:disabled)') || []);
      const first = fields[0], last = fields[fields.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <form onSubmit={submit}>
        <div className="border-b border-stone-200 bg-stone-50 p-5"><h2 id={title} className="text-lg font-bold">Hủy đơn {order.order_code}</h2><p className="mt-1 text-sm text-stone-600">Đơn sẽ ngừng phục vụ và khoản thanh toán chờ thu sẽ bị đóng.</p></div>
        <div className="space-y-3 p-5"><label className="block text-sm font-semibold">Lý do hủy<textarea required maxLength={500} disabled={saving} value={reason} onChange={event => setReason(event.target.value)} className="mt-2 block min-h-28 w-full rounded-xl border border-stone-200 p-3 font-normal" /></label>
          {failed && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error || 'Chưa hủy được đơn. Vui lòng thử lại.'}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-stone-200 p-4"><button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-stone-200 px-4 py-2 text-sm">Quay lại</button><button type="submit" disabled={saving || !reason.trim()} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Đang hủy…' : 'Xác nhận hủy đơn'}</button></div>
      </form>
    </section>
  </div>;
}
