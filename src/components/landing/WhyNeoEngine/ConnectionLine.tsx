import { memo } from 'react';
import { useReducedMotion } from 'framer-motion';

type ConnectionLineProps = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  variant?: 'gray' | 'green';
  dashed?: boolean;
  animated?: boolean;
  /** Inset from endpoints in viewBox units — keeps lines off hub/node centers */
  hubInset?: number;
  nodeInset?: number;
};

function insetPoint(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  inset: number,
) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: toX - (dx / len) * inset,
    y: toY - (dy / len) * inset,
  };
}

export const ConnectionLine = memo(function ConnectionLine({
  x1,
  y1,
  x2,
  y2,
  variant = 'gray',
  dashed = false,
  animated = false,
  hubInset = 0,
  nodeInset = 0,
}: ConnectionLineProps) {
  const reducedMotion = useReducedMotion();

  const start =
    hubInset > 0
      ? insetPoint(x2, y2, x1, y1, hubInset)
      : { x: x1, y: y1 };
  const end =
    nodeInset > 0
      ? insetPoint(x1, y1, x2, y2, nodeInset)
      : { x: x2, y: y2 };

  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2 - 6;
  const path = `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;

  const stroke = variant === 'green' ? '#0F8F68' : '#CBD5E1';
  const opacity = variant === 'green' ? 0.45 : 0.6;

  return (
    <path
      d={path}
      fill="none"
      stroke={stroke}
      strokeWidth="1.5"
      strokeOpacity={opacity}
      strokeDasharray={dashed ? '4 6' : undefined}
      className={animated && !reducedMotion ? 'ops-connection-flow' : undefined}
    />
  );
});
