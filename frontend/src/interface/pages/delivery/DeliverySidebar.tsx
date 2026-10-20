import React from 'react';
import type { PageRoute } from '../../types';
import { useDb } from '../../data/DbContext';
import { SCHEDULE_STATUS_LABEL, SHIFT_LABEL, initials } from '../../data/dbUtils';

interface DeliverySidebarProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
}

export const DeliverySidebar: React.FC<DeliverySidebarProps> = ({ currentRoute, onNavigate }) => {
  const { db, session } = useDb();
  const shipper = db.users.find(u => u.id === session.shipperId);
  const schedule = db.work_schedules
    .filter(s => s.user_id === session.shipperId && s.status !== 'COMPLETED')
    .sort((a, b) => (a.work_date < b.work_date ? -1 : 1))[0];
  const activeCount = db.orders.filter(o => o.shipper_id === session.shipperId && (o.status === 'READY' || o.status === 'DELIVERING')).length;

  return (
    <aside className="w-full lg:w-64 bg-stone-100 border-r border-stone-200 flex flex-col justify-between shrink-0 p-4 space-y-4">
      <div className="space-y-4">
        <div className="px-2">
          <span className="font-bold text-base sm:text-lg text-primary tracking-tight">Aura Café</span>
          <span className="block mt-1 w-fit bg-amber-800 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
            Delivery Portal
          </span>
        </div>

        {/* users (position = SHIPPER) + work_schedules */}
        <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
              {shipper ? initials(shipper.full_name) : '--'}
            </div>
            <div>
              <span className="font-bold text-sm text-stone-900 block leading-tight">{shipper?.full_name ?? '—'}</span>
              <span className="font-mono text-xs text-stone-500">{shipper?.phone}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-stone-100 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Ca:</span>
              <span className="font-semibold text-stone-800">
                {schedule ? `${SHIFT_LABEL[schedule.shift_name]} ${schedule.work_date}` : 'Chưa xếp ca'}
              </span>
            </div>
            {schedule && (
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Trạng thái ca:</span>
                <span className="font-semibold text-emerald-700">{SCHEDULE_STATUS_LABEL[schedule.status]}</span>
              </div>
            )}
          </div>
        </div>

        <nav className="space-y-1 text-xs sm:text-sm font-semibold">
          {[
            { id: 'delivery-orders', label: `Đơn được giao (${activeCount})`, icon: 'local_shipping' },
            { id: 'delivery-report', label: 'Báo sự cố giao hàng', icon: 'report_problem' },
            { id: 'delivery-cod', label: 'Đối soát tiền COD', icon: 'payments' }
          ].map(tab => {
            const active = currentRoute === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id as PageRoute)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left ${
                  active ? 'bg-primary text-white shadow-xs' : 'text-stone-600 hover:bg-stone-200/70 hover:text-stone-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
