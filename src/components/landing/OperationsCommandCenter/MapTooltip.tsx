import { memo } from 'react';
import type { Outlet } from './operations.data';

type MapTooltipProps = {
  outlet: Outlet;
  anchorX: number;
  anchorY: number;
};

export const MapTooltip = memo(function MapTooltip({ outlet, anchorX, anchorY }: MapTooltipProps) {
  const leftPercent = (anchorX / 612) * 100;
  const topPercent = (anchorY / 696) * 100;
  const flipLeft = anchorX > 360;

  return (
    <div
      className={`pointer-events-none absolute z-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-[0_10px_24px_rgba(15,23,42,0.08)] ${
        flipLeft ? '-translate-x-[105%] -translate-y-1/2' : 'translate-x-2 -translate-y-1/2'
      }`}
      style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
      role="tooltip"
    >
      <p className="text-xs font-semibold text-slate-900">{outlet.city}</p>
      <p className="text-[11px] text-slate-600">
        Health {outlet.healthScore}% · {outlet.outletCount} outlets
      </p>
    </div>
  );
});
