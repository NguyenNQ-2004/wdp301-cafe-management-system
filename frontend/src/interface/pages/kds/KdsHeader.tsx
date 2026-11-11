import React from 'react';
import type { PageRoute } from '../../types';
import { useDb } from '../../data/DbContext';
import { POSITION_LABEL, SHIFT_LABEL, initials, shiftTimeRange } from '../../data/dbUtils';

interface KdsHeaderProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onShowToast?: (msg: string) => void;
}

export const KdsHeader: React.FC<KdsHeaderProps> = ({ currentRoute, onNavigate }) => {
  const { db, session } = useDb();
  const barista = db.users.find(u => u.id === session.baristaId);
  const schedule = db.work_schedules.find(s => s.user_id === session.baristaId && s.status === 'PRESENT');

  return (
    <header className="sticky top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl shadow-xs border-b border-stone-200">
      <div className="h-16 w-full px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-base sm:text-lg tracking-tight text-primary">Aura Café</span>
            <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              Screen 13 • Barista KDS
            </span>
          </div>
          <div className="hidden lg:block h-6 w-px bg-stone-200" />
          <div className="hidden lg:flex flex-col">
            <span className="text-xs font-bold text-stone-900 leading-tight">{barista?.full_name ?? '—'}</span>
            <span className="text-[11px] text-stone-500">
              {barista?.position ? POSITION_LABEL[barista.position] : 'Nhân viên'} • {barista?.phone}
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => onNavigate('kds-terminal')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              currentRoute === 'kds-terminal' ? 'bg-primary text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">blender</span>
            <span>Màn hình KDS</span>
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right text-xs">
            {schedule ? (
              <>
                <span className="font-mono font-bold text-stone-900">
                  {SHIFT_LABEL[schedule.shift_name]}: {shiftTimeRange(db, schedule.shift_name)}
                </span>
                <span className="text-[11px] text-stone-500">Ngày {schedule.work_date}</span>
              </>
            ) : (
              <span className="font-semibold text-amber-700">Chưa vào ca</span>
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {barista ? initials(barista.full_name) : '--'}
          </div>
        </div>
      </div>
    </header>
  );
};
