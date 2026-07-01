import { memo } from 'react';
import { useReducedMotion } from 'framer-motion';

type ConnectionLineProps = {
  from: { x: number; y: number };
  to: { x: number; y: number };
};

function buildCurve(from: { x: number; y: number }, to: { x: number; y: number }) {
  const midX = (from.x + to.x) / 2;
  const midY = Math.min(from.y, to.y) - 22;
  return `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
}

export const ConnectionLine = memo(function ConnectionLine({ from, to }: ConnectionLineProps) {
  const reducedMotion = useReducedMotion();
  const path = buildCurve(from, to);

  return (
    <g aria-hidden="true">
      <path d={path} fill="none" stroke="#10B981" strokeWidth="2" strokeOpacity="0.08" />
      <path
        d={path}
        fill="none"
        stroke="#10B981"
        strokeWidth="2"
        strokeOpacity="0.2"
        strokeDasharray="7 12"
        className={reducedMotion ? undefined : 'ops-connection-flow'}
      />
    </g>
  );
});
