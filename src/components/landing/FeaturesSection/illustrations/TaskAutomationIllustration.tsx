import { motion, useReducedMotion } from 'framer-motion';

/** Clockwise cycle: 1 Assign → 2 Notify → 3 Complete → 4 Escalated */
const NODES = [
  { id: 'assign', label: 'Assign', step: 1, x: 50, y: 16 },
  { id: 'notify', label: 'Notify', step: 2, x: 80, y: 44 },
  { id: 'complete', label: 'Complete', step: 3, x: 50, y: 72 },
  { id: 'escalated', label: 'Escalated', step: 4, x: 20, y: 44 },
] as const;

const NODE_RADIUS = 8;

const CONNECTIONS: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delay: number;
  stroke?: string;
}[] = [
  { x1: 54, y1: 20, x2: 74, y2: 40, delay: 0 },
  { x1: 76, y1: 48, x2: 54, y2: 68, delay: 0.15 },
  { x1: 46, y1: 68, x2: 26, y2: 48, delay: 0.3, stroke: '#22C55E' },
  { x1: 24, y1: 40, x2: 46, y2: 20, delay: 0.45, stroke: '#22C55E' },
];

export function TaskAutomationIllustration() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="relative mx-auto flex h-full min-h-[150px] w-full max-w-[260px] items-center justify-center py-2 sm:min-h-[175px] lg:min-h-[195px]"
      animate={reducedMotion ? undefined : { y: [0, -3, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full min-h-[130px] max-h-[190px] sm:max-h-[210px]"
        overflow="visible"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <marker
            id="flow-arrow"
            markerWidth="4"
            markerHeight="4"
            refX="3.2"
            refY="2"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L4,2 L0,4 Z" fill="#0F8F68" fillOpacity="0.55" />
          </marker>
        </defs>

        {CONNECTIONS.map((line, index) => (
          <motion.line
            key={index}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={line.stroke ?? '#0F8F68'}
            strokeWidth="1.25"
            strokeOpacity="0.4"
            markerEnd="url(#flow-arrow)"
            initial={reducedMotion ? undefined : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: line.delay }}
          />
        ))}

        {NODES.map((node, i) => (
          <g key={node.id}>
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={NODE_RADIUS}
              fill="#ECFDF5"
              stroke="#0F8F68"
              strokeWidth="1.5"
              animate={reducedMotion ? undefined : { opacity: [0.75, 1, 0.75] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
            />
            <text
              x={node.x}
              y={node.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-[#0F8F68] text-[7px] font-bold"
            >
              {node.step}
            </text>
            <text
              x={node.x}
              y={node.y + 15}
              textAnchor="middle"
              dominantBaseline="hanging"
              className="fill-slate-600 text-[6px] font-semibold"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </motion.div>
  );
}
