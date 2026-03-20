import { cn } from '@/lib/utils';

/** One label per trace (lines 1–8), structural order in the artwork */
export const DEFAULT_CPU_NODE_LABELS = [
  'Attendance',
  'Tasks',
  'Payroll',
  'Analytics',
  'Staff',
  'Leave',
  'Roles',
  'Reports',
] as const;

export interface CpuArchitectureSvgProps {
  className?: string;
  width?: string;
  height?: string;
  text?: string;
  nodeLabels?: readonly string[];
  /** Softer traces / chip so the diagram sits visually behind hero copy */
  ambient?: boolean;
  showCpuConnections?: boolean;
  lineMarkerSize?: number;
  animateText?: boolean;
  animateLines?: boolean;
  animateMarkers?: boolean;
  /** Traveling light on all wires + per-cylinder hit glow at the engine */
  animateRightTubeEnergy?: boolean;
}

/** Path `d` values = trace order (Attendance → Reports), same as base wires */
const ALL_WIRE_ENERGY_PATHS = [
  'M 10 20 h 79.5 q 5 0 5 5 v 30',
  'M 180 10 h -69.7 q -5 0 -5 5 v 30',
  'M 130 20 v 21.8 q 0 5 -5 5 h -10',
  'M 170 80 v -21.8 q 0 -5 -5 -5 h -50',
  'M 135 65 h 15 q 5 0 5 5 v 10 q 0 5 -5 5 h -39.8 q -5 0 -5 -5 v -20',
  'M 94.8 95 v -36',
  'M 88 88 v -15 q 0 -5 -5 -5 h -10 q -5 0 -5 -5 v -5 q 0 -5 5 -5 h 14',
  'M 30 30 h 25 q 5 0 5 5 v 6.5 q 0 5 5 5 h 20',
] as const;

type EngineIoPad = { x: number; y: number; w: number; h: number; rx: number; transform?: string };

/** Eight physical IO pads on the chip (DOM order). */
const ENGINE_IO_PADS: readonly EngineIoPad[] = [
  { x: 92.4, y: 36.2, w: 3.2, h: 5.2, rx: 1.1 },
  { x: 103.4, y: 36.2, w: 3.2, h: 5.2, rx: 1.1 },
  { x: 116.15, y: 43.2, w: 3.2, h: 5.2, rx: 1.1, transform: 'rotate(90 116.25 45.5)' },
  { x: 122.65, y: 43.2, w: 3.2, h: 5.2, rx: 1.1, transform: 'rotate(90 116.25 45.5)' },
  { x: 103.4, y: 14.7, w: 3.2, h: 5.2, rx: 1.1, transform: 'rotate(180 105.25 39.5)' },
  { x: 113.9, y: 14.7, w: 3.2, h: 5.2, rx: 1.1, transform: 'rotate(180 105.25 39.5)' },
  { x: 79.4, y: -14.2, w: 3.2, h: 5.2, rx: 1.1, transform: 'rotate(270 115.25 19.5)' },
  { x: 86.4, y: -14.2, w: 3.2, h: 5.2, rx: 1.1, transform: 'rotate(270 115.25 19.5)' },
];

/**
 * trace index 0–7 → pad slot 0–7 (left pair, bottom pair, top pair, right pair in artwork).
 * Maps each label’s wire to the cylinder it meets at the engine.
 */
const WIRE_TO_PAD_SLOT = [0, 5, 4, 3, 7, 2, 6, 1] as const;

type LabelPlacement = {
  tx: number;
  ty: number;
  anchor: 'start' | 'middle' | 'end';
  rw: number;
  rh: number;
};

/**
 * Labels sit just outside each wire origin (path start), along the outward direction:
 * L/R/U/D from the terminal so text never crosses the trace.
 */
const LABEL_LAYOUT: readonly LabelPlacement[] = [
  { tx: 4, ty: 20.5, anchor: 'end', rw: 34, rh: 9 }, // (10,20) → west
  { tx: 187, ty: 10.5, anchor: 'start', rw: 28, rh: 9 }, // (180,10) → east — Tasks wire runs y≈10
  // Payroll (130,20): wire runs downward; Tasks bus is y≈10 — label east of node, same y as terminal
  { tx: 133, ty: 20.5, anchor: 'start', rw: 34, rh: 9 },
  { tx: 170, ty: 91, anchor: 'middle', rw: 42, rh: 8 }, // (170,80) → south
  // Staff (135,65): first segment goes east — keep under engine footprint clear; sit south on node column
  { tx: 135, ty: 73, anchor: 'middle', rw: 28, rh: 8 },
  { tx: 95, ty: 101, anchor: 'middle', rw: 32, rh: 8 }, // (95,95) → south, nudged up vs view edge
  { tx: 76, ty: 88, anchor: 'end', rw: 36, rh: 9 }, // (88,88) → west
  { tx: 22, ty: 30.5, anchor: 'end', rw: 38, rh: 9 }, // (30,30) → west
] as const;

function NodeLabelGroup({
  tx,
  ty,
  anchor,
  rw,
  rh,
  children,
}: LabelPlacement & { children: string }) {
  const pad = 2;
  const rectX =
    anchor === 'end' ? -(rw + pad) : anchor === 'middle' ? -(rw + pad) / 2 : -pad;
  const rectY = -rh / 2;
  const w = rw + pad * 2;
  const h = rh;
  return (
    <g transform={`translate(${tx} ${ty})`}>
      <g className="cpu-node-label-hit">
        <rect
          x={rectX}
          y={rectY}
          width={w}
          height={h}
          rx={1.2}
          fill="transparent"
          stroke="none"
        />
        <text
          className="cpu-node-label"
          x={0}
          y={0}
          textAnchor={anchor}
          dominantBaseline="middle"
        >
          {children}
        </text>
      </g>
    </g>
  );
}

const CpuArchitecture = ({
  className,
  width = '100%',
  height = '100%',
  text = 'Engine',
  nodeLabels,
  ambient = false,
  showCpuConnections = true,
  lineMarkerSize = 22,
  animateText = false,
  animateLines = true,
  animateMarkers = true,
  animateRightTubeEnergy = true,
}: CpuArchitectureSvgProps) => {
  const labels: string[] = [...DEFAULT_CPU_NODE_LABELS];
  if (nodeLabels?.length) {
    for (let i = 0; i < 8; i++) {
      const v = nodeLabels[i]?.trim();
      if (v) labels[i] = v;
    }
  }

  return (
    <svg
      className={cn('font-sans', ambient && 'cpu-arch-svg-ambient', className)}
      width={width}
      height={height}
      viewBox="-44 -24 282 174"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="NeoEngine product diagram: features connect into a central engine"
    >
      {/* Traces (behind) */}
      <g
        className="cpu-trace-ambient"
        fill="none"
        stroke="#0f766e"
        strokeOpacity={ambient ? undefined : 0.88}
        strokeWidth="0.48"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="100 100"
        pathLength="100"
        markerStart="url(#cpu-circle-marker)"
      >
        <path
          strokeDasharray="100 100"
          pathLength="100"
          d="M 10 20 h 79.5 q 5 0 5 5 v 30"
        />
        <path
          strokeDasharray="100 100"
          pathLength="100"
          d="M 180 10 h -69.7 q -5 0 -5 5 v 30"
        />
        <path d="M 130 20 v 21.8 q 0 5 -5 5 h -10" />
        <path d="M 170 80 v -21.8 q 0 -5 -5 -5 h -50" />
        <path
          strokeDasharray="100 100"
          pathLength="100"
          d="M 135 65 h 15 q 5 0 5 5 v 10 q 0 5 -5 5 h -39.8 q -5 0 -5 -5 v -20"
        />
        <path d="M 94.8 95 v -36" />
        <path d="M 88 88 v -15 q 0 -5 -5 -5 h -10 q -5 0 -5 -5 v -5 q 0 -5 5 -5 h 14" />
        <path d="M 30 30 h 25 q 5 0 5 5 v 6.5 q 0 5 5 5 h 20" />
        {animateLines && (
          <animate
            attributeName="stroke-dashoffset"
            from="100"
            to="0"
            dur="1s"
            fill="freeze"
            calcMode="spline"
            keySplines="0.25,0.1,0.5,1"
            keyTimes="0; 1"
          />
        )}
      </g>

      {/* All wires: pulse travels node → engine; pad glow syncs in CSS (last 0.8s of cycle) */}
      {animateLines && animateRightTubeEnergy && (
        <g className="cpu-tube-energy" pointerEvents="none">
          <g filter="url(#cpu-tube-energy-bloom-filter)">
            {ALL_WIRE_ENERGY_PATHS.map((d, i) => (
              <path
                key={`bloom-${i}`}
                d={d}
                fill="none"
                className={cn('cpu-tube-energy-bloom', `cpu-tube-energy-delay-${i}`)}
                pathLength={100}
              />
            ))}
          </g>
          <g filter="url(#cpu-tube-energy-hot-filter)">
            {ALL_WIRE_ENERGY_PATHS.map((d, i) => (
              <path
                key={`core-${i}`}
                d={d}
                fill="none"
                className={cn('cpu-tube-energy-core', `cpu-tube-energy-delay-${i}`)}
                pathLength={100}
              />
            ))}
          </g>
        </g>
      )}

      {/* Signal orbs — larger cores + glow for visibility */}
      <g mask="url(#cpu-mask-1)">
        <circle
          className="cpu-architecture cpu-line-1"
          cx="0"
          cy="0"
          r="15"
          fill="url(#cpu-blue-grad)"
          filter="url(#cpu-signal-glow)"
        />
      </g>
      <g mask="url(#cpu-mask-2)">
        <circle
          className="cpu-architecture cpu-line-2"
          cx="0"
          cy="0"
          r="15"
          fill="url(#cpu-yellow-grad)"
          filter="url(#cpu-signal-glow)"
        />
      </g>
      <g mask="url(#cpu-mask-3)">
        <circle
          className="cpu-architecture cpu-line-3"
          cx="0"
          cy="0"
          r="15"
          fill="url(#cpu-pinkish-grad)"
          filter="url(#cpu-signal-glow)"
        />
      </g>
      <g mask="url(#cpu-mask-4)">
        <circle
          className="cpu-architecture cpu-line-4"
          cx="0"
          cy="0"
          r="15"
          fill="url(#cpu-white-grad)"
          filter="url(#cpu-signal-glow)"
        />
      </g>
      <g mask="url(#cpu-mask-5)">
        <circle
          className="cpu-architecture cpu-line-5"
          cx="0"
          cy="0"
          r="15"
          fill="url(#cpu-green-grad)"
          filter="url(#cpu-signal-glow)"
        />
      </g>
      <g mask="url(#cpu-mask-6)">
        <circle
          className="cpu-architecture cpu-line-6"
          cx="0"
          cy="0"
          r="15"
          fill="url(#cpu-orange-grad)"
          filter="url(#cpu-signal-glow)"
        />
      </g>
      <g mask="url(#cpu-mask-7)">
        <circle
          className="cpu-architecture cpu-line-7"
          cx="0"
          cy="0"
          r="15"
          fill="url(#cpu-cyan-grad)"
          filter="url(#cpu-signal-glow)"
        />
      </g>
      <g mask="url(#cpu-mask-8)">
        <circle
          className="cpu-architecture cpu-line-8"
          cx="0"
          cy="0"
          r="15"
          fill="url(#cpu-rose-grad)"
          filter="url(#cpu-signal-glow)"
        />
      </g>

      <g>
        {showCpuConnections && (
          <g filter="url(#cpu-port-matte-shadow)">
            {ENGINE_IO_PADS.map((pad, idx) => (
              <rect
                key={`pad-${idx}`}
                x={pad.x}
                y={pad.y}
                width={pad.w}
                height={pad.h}
                rx={pad.rx}
                fill="url(#cpu-io-pad)"
                stroke="#1c2e29"
                strokeWidth="0.2"
                transform={pad.transform}
              />
            ))}
          </g>
        )}
        <rect
          x="85"
          y="40"
          width="30"
          height="20"
          rx="2.35"
          fill="url(#cpu-chip-fill)"
          stroke="url(#cpu-chip-stroke)"
          strokeWidth="0.38"
          filter="url(#cpu-chip-matte-shadow)"
        />
        {/* Subtle top plane read — matte, not a specular blob */}
        <rect
          x="85.55"
          y="40.45"
          width="28.9"
          height="6.2"
          rx="1.85"
          fill="url(#cpu-chip-sheen)"
          opacity={0.35}
        />
        {/* Per-cylinder glow when each wire’s pulse reaches the engine (~0.8s, synced in CSS) */}
        {animateLines && animateRightTubeEnergy && (
          <g className="cpu-port-energy-layer" pointerEvents="none">
            {WIRE_TO_PAD_SLOT.map((padSlot, wireIdx) => {
              const pad = ENGINE_IO_PADS[padSlot];
              return (
                <rect
                  key={`port-hit-${wireIdx}`}
                  x={pad.x}
                  y={pad.y}
                  width={pad.w}
                  height={pad.h}
                  rx={pad.rx}
                  transform={pad.transform}
                  fill="url(#cpu-port-hit-fill)"
                  className={cn('cpu-port-energy-hit', `cpu-tube-energy-delay-${wireIdx}`)}
                  filter="url(#cpu-port-hit-filter)"
                />
              );
            })}
          </g>
        )}
        <text
          x="100"
          y="52.8"
          textAnchor="middle"
          fontSize="7"
          fill={animateText ? 'url(#cpu-text-gradient)' : '#f0fdf4'}
          fontWeight="700"
          letterSpacing="0.1em"
        >
          {text}
        </text>
      </g>

      {/* Labels on top — no boxes, blend with page; hover on hit rect */}
      <g style={{ fontFamily: 'inherit' }}>
        {LABEL_LAYOUT.map((layout, i) => (
          <NodeLabelGroup key={i} {...layout}>
            {labels[i] ?? ''}
          </NodeLabelGroup>
        ))}
      </g>

      <defs>
        {/* Brushed emerald metal: clear green, low gloss, diagonal grain */}
        {/* Matches --color-primary (#059669) / button gradient (emerald-600 → emerald-700) */}
        <linearGradient id="cpu-chip-fill" x1="82" y1="38" x2="118" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
          <stop offset="35%" stopColor="#059669" stopOpacity="1" />
          <stop offset="70%" stopColor="#059669" stopOpacity="1" />
          <stop offset="100%" stopColor="#047857" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="cpu-chip-sheen" x1="85" y1="40" x2="85" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cpu-chip-stroke" x1="84" y1="39" x2="116" y2="61" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
        <linearGradient id="cpu-io-pad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a8f6c" />
          <stop offset="45%" stopColor="#0e5c46" />
          <stop offset="100%" stopColor="#052e24" />
        </linearGradient>
        <filter id="cpu-port-matte-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0.35" stdDeviation="0.28" floodColor="#0f1c18" floodOpacity="0.28" />
        </filter>
        <filter id="cpu-chip-matte-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.1" stdDeviation="1" floodColor="#022c22" floodOpacity="0.28" />
        </filter>
        <filter id="cpu-signal-glow" x="-90%" y="-90%" width="280%" height="280%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.65" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="cpu-tube-energy-bloom-filter" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.35" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0.12
                    0 0 1 0 0.08
                    0 0 0 0.75 0"
            result="glow"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="cpu-tube-energy-hot-filter" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.45" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="cpu-port-hit-fill" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="35%" stopColor="#a7f3d0" stopOpacity="0.95" />
          <stop offset="70%" stopColor="#34d399" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0" />
        </radialGradient>
        <filter id="cpu-port-hit-filter" x="-250%" y="-250%" width="600%" height="600%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.35" result="b" />
          <feColorMatrix
            in="b"
            type="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0.08
                    0 0 1 0 0.06
                    0 0 0 0.92 0"
            result="glow"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <mask id="cpu-mask-1">
          <path
            d="M 10 20 h 79.5 q 5 0 5 5 v 24"
            strokeWidth="0.55"
            stroke="white"
            fill="none"
          />
        </mask>
        <mask id="cpu-mask-2">
          <path
            d="M 180 10 h -69.7 q -5 0 -5 5 v 24"
            strokeWidth="0.55"
            stroke="white"
            fill="none"
          />
        </mask>
        <mask id="cpu-mask-3">
          <path
            d="M 130 20 v 21.8 q 0 5 -5 5 h -10"
            strokeWidth="0.55"
            stroke="white"
            fill="none"
          />
        </mask>
        <mask id="cpu-mask-4">
          <path
            d="M 170 80 v -21.8 q 0 -5 -5 -5 h -50"
            strokeWidth="0.55"
            stroke="white"
            fill="none"
          />
        </mask>
        <mask id="cpu-mask-5">
          <path
            d="M 135 65 h 15 q 5 0 5 5 v 10 q 0 5 -5 5 h -39.8 q -5 0 -5 -5 v -20"
            strokeWidth="0.55"
            stroke="white"
            fill="none"
          />
        </mask>
        <mask id="cpu-mask-6">
          <path d="M 94.8 95 v -36" strokeWidth="0.55" stroke="white" fill="none" />
        </mask>
        <mask id="cpu-mask-7">
          <path
            d="M 88 88 v -15 q 0 -5 -5 -5 h -10 q -5 0 -5 -5 v -5 q 0 -5 5 -5 h 14"
            strokeWidth="0.55"
            stroke="white"
            fill="none"
          />
        </mask>
        <mask id="cpu-mask-8">
          <path
            d="M 30 30 h 25 q 5 0 5 5 v 6.5 q 0 5 5 5 h 20"
            strokeWidth="0.55"
            stroke="white"
            fill="none"
          />
        </mask>

        <radialGradient id="cpu-blue-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="12%" stopColor="#99f6e4" stopOpacity="1" />
          <stop offset="35%" stopColor="#2dd4bf" stopOpacity="1" />
          <stop offset="65%" stopColor="#0d9488" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cpu-yellow-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="14%" stopColor="#fef08a" stopOpacity="1" />
          <stop offset="38%" stopColor="#eab308" stopOpacity="1" />
          <stop offset="100%" stopColor="#a16207" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cpu-pinkish-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="15%" stopColor="#fbcfe8" stopOpacity="1" />
          <stop offset="40%" stopColor="#ec4899" stopOpacity="1" />
          <stop offset="100%" stopColor="#9d174d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cpu-white-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="28%" stopColor="#ecfdf5" stopOpacity="1" />
          <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cpu-green-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="18%" stopColor="#86efac" stopOpacity="1" />
          <stop offset="45%" stopColor="#22c55e" stopOpacity="1" />
          <stop offset="100%" stopColor="#166534" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cpu-orange-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="16%" stopColor="#fed7aa" stopOpacity="1" />
          <stop offset="42%" stopColor="#fb923c" stopOpacity="1" />
          <stop offset="100%" stopColor="#9a3412" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cpu-cyan-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="16%" stopColor="#a5f3fc" stopOpacity="1" />
          <stop offset="40%" stopColor="#22d3ee" stopOpacity="1" />
          <stop offset="100%" stopColor="#155e75" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cpu-rose-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="16%" stopColor="#fecdd3" stopOpacity="1" />
          <stop offset="40%" stopColor="#fb7185" stopOpacity="1" />
          <stop offset="100%" stopColor="#9f1239" stopOpacity="0" />
        </radialGradient>

        <marker
          id="cpu-circle-marker"
          className="cpu-node-marker-ambient"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth={lineMarkerSize}
          markerHeight={lineMarkerSize}
        >
          <circle
            cx="5"
            cy="5"
            r="2.2"
            fill="#ecfdf5"
            stroke="#047857"
            strokeWidth="0.55"
          >
            {animateMarkers && (
              <animate attributeName="r" values="0; 3.2; 2.2" dur="0.55s" />
            )}
          </circle>
        </marker>
        <linearGradient id="cpu-text-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#bbf7d0">
            <animate
              attributeName="offset"
              values="-2; -1; 0"
              dur="5s"
              repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0; 0.5; 1"
              keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
            />
          </stop>
          <stop offset="25%" stopColor="#ffffff">
            <animate
              attributeName="offset"
              values="-1; 0; 1"
              dur="5s"
              repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0; 0.5; 1"
              keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
            />
          </stop>
          <stop offset="50%" stopColor="#bbf7d0">
            <animate
              attributeName="offset"
              values="0; 1; 2;"
              dur="5s"
              repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0; 0.5; 1"
              keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
            />
          </stop>
        </linearGradient>
      </defs>
    </svg>
  );
};

export { CpuArchitecture };
