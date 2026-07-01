import { memo } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { Outlet } from './operations.data';
import { HQ_POSITION } from './operations.data';

type ConnectionLinesProps = {
  outlets: Outlet[];
};

function buildCurve(hx: number, hy: number, ox: number, oy: number): string {
  const midX = (hx + ox) / 2;
  const midY = (hy + oy) / 2 - 24;
  return `M ${hx} ${hy} Q ${midX} ${midY} ${ox} ${oy}`;
}

export const ConnectionLines = memo(function ConnectionLines({ outlets }: ConnectionLinesProps) {
  const reducedMotion = useReducedMotion();
  const { x: hx, y: hy } = HQ_POSITION;

  return (
    <g aria-hidden="true">
      {outlets.map((outlet, index) => {
        const path = buildCurve(hx, hy, outlet.x, outlet.y);
        return (
          <g key={outlet.id}>
            <path
              d={path}
              fill="none"
              stroke="rgba(15, 143, 104, 0.12)"
              strokeWidth="1.5"
            />
            <path
              d={path}
              fill="none"
              stroke="#0F8F68"
              strokeWidth="1.5"
              strokeOpacity="0.35"
              strokeDasharray="6 10"
              className={reducedMotion ? undefined : 'ops-connection-flow'}
            />
            {!reducedMotion && (
              <circle r="2.5" fill="#22C55E" className="ops-connection-particle">
                <animateMotion
                  dur={`${4 + index * 0.4}s`}
                  repeatCount="indefinite"
                  path={path}
                />
              </circle>
            )}
          </g>
        );
      })}
      <circle cx={hx} cy={hy} r="6" fill="#ECFDF5" stroke="#0F8F68" strokeWidth="2" />
      <text
        x={hx}
        y={hy - 12}
        textAnchor="middle"
        className="fill-slate-500 text-[9px] font-semibold"
      >
        HQ
      </text>
    </g>
  );
});
