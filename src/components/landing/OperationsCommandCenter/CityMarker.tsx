import { memo, useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Outlet } from './operations.data';

type CityMarkerProps = {
  outlet: Outlet;
  active: boolean;
  onActivate: (id: string) => void;
  onDeactivate: () => void;
};

export const CityMarker = memo(function CityMarker({
  outlet,
  active,
  onActivate,
  onDeactivate,
}: CityMarkerProps) {
  const reducedMotion = useReducedMotion();
  const tooltipId = useId();
  const glowId = useId();
  const size = 5;
  const ring = 10;

  return (
    <g transform={`translate(${outlet.x}, ${outlet.y})`} className="cursor-pointer">
      <defs>
        <filter id={glowId} x="-200%" y="-200%" width="400%" height="400%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#10B981" floodOpacity="0.25" />
        </filter>
      </defs>
      <motion.circle
        r={ring}
        fill="rgba(16,185,129,0.18)"
        animate={reducedMotion ? undefined : { scale: [1, 1.22, 1], opacity: [0.3, 0.06, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.circle
        r={size}
        fill="#10B981"
        stroke="#ffffff"
        strokeWidth={2}
        filter={`url(#${glowId})`}
        animate={active && !reducedMotion ? { scale: 1.15 } : { scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      />
      <foreignObject x={-16} y={-16} width={32} height={32}>
        <button
          type="button"
          className="h-8 w-8 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8F68] focus-visible:ring-offset-2"
          onMouseEnter={() => onActivate(outlet.id)}
          onMouseLeave={onDeactivate}
          onFocus={() => onActivate(outlet.id)}
          onBlur={onDeactivate}
          aria-describedby={tooltipId}
          aria-label={`${outlet.city}. Health ${outlet.healthScore} percent. ${outlet.outletCount} outlets.`}
        />
      </foreignObject>
      {/* Hidden accessible label — display="none" hides SVG text natively */}
      <text id={tooltipId} display="none">
        {outlet.city}, health {outlet.healthScore}%, {outlet.outletCount} outlets
      </text>
    </g>
  );
});
