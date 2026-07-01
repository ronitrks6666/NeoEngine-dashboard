import { memo } from 'react';
import type { Outlet } from './operations.data';

type OutletPopupProps = {
  outlet: Outlet;
  anchorX: number;
  anchorY: number;
};

export const OutletPopup = memo(function OutletPopup({ outlet, anchorX, anchorY }: OutletPopupProps) {
  const flipLeft = anchorX > 280;
  const leftPercent = (anchorX / 400) * 100;
  const topPercent = (anchorY / 450) * 100;

  return (
    <div
      className={`pointer-events-none absolute z-20 w-[200px] rounded-[18px] border border-slate-100 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.12)] ${
        flipLeft ? '-translate-x-[105%] -translate-y-1/2' : 'translate-x-2 -translate-y-1/2'
      }`}
      style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
      role="tooltip"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-900">{outlet.name}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            outlet.status === 'Healthy'
              ? 'bg-emerald-50 text-[#0F8F68]'
              : outlet.status === 'Attention'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-red-50 text-red-700'
          }`}
        >
          {outlet.status}
        </span>
      </div>
      <dl className="space-y-2 text-xs">
        <div className="flex justify-between">
          <dt className="text-slate-500">Revenue Today</dt>
          <dd className="font-semibold text-slate-800">{outlet.todayRevenue}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Staff Present</dt>
          <dd className="font-semibold text-slate-800">{outlet.staffPresent} Staff</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Open Tasks</dt>
          <dd className="font-semibold text-slate-800">{outlet.tasks} Pending</dd>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-2">
          <dt className="text-slate-500">Health Score</dt>
          <dd className="font-bold text-[#0F8F68]">{outlet.healthScore}%</dd>
        </div>
      </dl>
    </div>
  );
});
