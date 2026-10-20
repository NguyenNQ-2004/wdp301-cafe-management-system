import React, { useState, useEffect } from 'react';
import type { PageRoute } from '../../types';
import { useDb } from '../../data/DbContext';
import { POSITION_LABEL, SHIFT_LABEL, initials, shiftTimeRange } from '../../data/dbUtils';

interface PosHeaderProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
}

export const PosHeader: React.FC<PosHeaderProps> = ({ currentRoute, onNavigate }) => {
  const { db, session } = useDb();
  const [timeStr, setTimeStr] = useState('');
  const cashier = db.users.find(u => u.id === session.cashierId);
  // Ca đang làm của thu ngân (work_schedules.status = PRESENT)
  const schedule = db.work_schedules.find(s => s.user_id === session.cashierId && s.status === 'PRESENT');

  useEffect(() => {
    const update = () => setTimeStr(new Date().toLocaleTimeString('vi-VN', { hour12: false }));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 w-full z-40 bg-white/95 backdrop-blur-xl shadow-xs border-b border-stone-200">
      <div className="h-16 sm:h-20 w-full px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
              <span className="material-symbols-outlined text-[20px]">local_cafe</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm sm:text-base text-stone-900 tracking-tight uppercase">Aura Café</span>
              <span className="text-[10px] text-primary font-bold tracking-wider uppercase">POS Thu ngân</span>
            </div>
          </div>

          <div className="hidden xl:flex flex-col justify-center px-3 py-1 bg-stone-100/80 rounded-xl border border-stone-200/60">
            <div className="flex items-center gap-2 text-xs text-stone-700">
              <span className="material-symbols-outlined text-[15px] text-primary">schedule</span>
              {schedule ? (
                <span className="font-semibold">
                  {SHIFT_LABEL[schedule.shift_name]} ({shiftTimeRange(db, schedule.shift_name)}) • {schedule.work_date}
                </span>
              ) : (
                <span className="font-semibold text-amber-700">Chưa vào ca</span>
              )}
              <span className="text-stone-300">•</span>
              <span>
                {cashier?.position ? POSITION_LABEL[cashier.position] : 'Nhân viên'}:{' '}
                <strong className="font-semibold text-stone-900">{cashier?.full_name ?? '—'}</strong>
              </span>
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto py-1">
          {[
            { id: 'pos-create', label: 'Tạo đơn tại quầy', icon: 'point_of_sale' },
            { id: 'pos-orders', label: 'Danh sách đơn', icon: 'receipt_long' },
            { id: 'pos-shift', label: 'Chốt ca', icon: 'calculate' },
            { id: 'pos-handover', label: 'Bàn giao ca', icon: 'assignment_turned_in' }
          ].map(tab => {
            const active = currentRoute === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id as PageRoute)}
                className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  active ? 'bg-primary text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end text-right">
            <span className="text-base font-bold font-mono text-primary leading-tight">{timeStr}</span>
            <span className="text-[10px] text-stone-400 uppercase font-medium">{new Date().toLocaleDateString('vi-VN')}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-xs" title={cashier?.full_name}>
            {cashier ? initials(cashier.full_name) : '--'}
          </div>
        </div>
      </div>
    </header>
  );
};
