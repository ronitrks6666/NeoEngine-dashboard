import { memo } from 'react';
import type { Outlet } from './operations.data';

type OutletMarkerProps = {
  outlet: Outlet;
  active: boolean;
  onActivate: (id: string) => void;
  onDeactivate: () => void;
};

export const OutletMarker = memo(function OutletMarker({
  outlet,
  active,
  onActivate,
  onDeactivate,
}: OutletMarkerProps) {
  return (
    <g
      transform={`translate(${outlet.x}, ${outlet.y})`}
      className="cursor-pointer"
      onMouseEnter={() => onActivate(outlet.id)}
      onMouseLeave={onDeactivate}
      onFocus={() => onActivate(outlet.id)}
      onBlur={onDeactivate}
    >
      <foreignObject x={-16} y={-16} width={32} height={32}>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8F68] focus-visible:ring-offset-2"
          aria-label={`${outlet.name}, ${outlet.city}. Health ${outlet.healthScore} percent. ${outlet.status}`}
          onFocus={() => onActivate(outlet.id)}
          onBlur={onDeactivate}
        >
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-50 motion-reduce:animate-none" />
            <span
              className={`relative inline-flex h-3 w-3 rounded-full bg-[#0F8F68] transition-transform duration-200 ${
                active ? 'scale-[1.6]' : 'scale-100'
              }`}
            />
          </span>
        </button>
      </foreignObject>
    </g>
  );
});
