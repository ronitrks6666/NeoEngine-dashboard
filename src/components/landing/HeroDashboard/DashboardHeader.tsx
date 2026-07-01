import { Bell, ChevronDown, Store } from 'lucide-react';
import { DASHBOARD_HEADER } from './dashboard.data';

export function DashboardHeader() {
  return (
    <header className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-lg font-bold text-slate-900 lg:text-[28px] lg:font-bold lg:leading-none">
        {DASHBOARD_HEADER.title}
      </h2>

      <div className="flex items-center gap-1.5 lg:gap-2">
        <button
          type="button"
          className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-medium text-slate-600 transition-colors hover:border-[#0F8F68] hover:text-[#0F8F68] sm:inline-flex lg:px-3 lg:text-xs"
          aria-label={`Current outlet: ${DASHBOARD_HEADER.outlet}`}
        >
          <Store className="h-3.5 w-3.5 text-[#0F8F68]" aria-hidden="true" />
          <span className="max-w-[88px] truncate lg:max-w-none">{DASHBOARD_HEADER.outlet}</span>
          <ChevronDown className="h-3 w-3 text-slate-400" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 lg:h-9 lg:w-9"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#22C55E]" aria-hidden="true" />
        </button>

        <div
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0F8F68] to-[#22C55E] text-[10px] font-bold text-white lg:h-9 lg:w-9 lg:text-xs"
          role="img"
          aria-label={`User avatar for ${DASHBOARD_HEADER.user.name}`}
        >
          {DASHBOARD_HEADER.user.initials}
        </div>
      </div>
    </header>
  );
}
