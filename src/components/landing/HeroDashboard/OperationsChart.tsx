import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { ChartSeries } from './dashboard.data';

type OperationsChartProps = {
  labels: string[];
  series: ChartSeries[];
};

const CHART_WIDTH = 360;
const CHART_HEIGHT = 140;
const PADDING = { top: 8, right: 8, bottom: 22, left: 8 };

function buildSmoothPath(values: number[], maxValue: number): string {
  const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const step = innerW / (values.length - 1);

  const points = values.map((value, index) => ({
    x: PADDING.left + index * step,
    y: PADDING.top + innerH - (value / maxValue) * innerH,
  }));

  if (points.length < 2) return '';

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const cx = (current.x + next.x) / 2;
    path += ` C ${cx} ${current.y}, ${cx} ${next.y}, ${next.x} ${next.y}`;
  }
  return path;
}

function buildAreaPath(values: number[], maxValue: number): string {
  const line = buildSmoothPath(values, maxValue);
  if (!line) return '';

  const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const baseY = PADDING.top + innerH;
  const endX = PADDING.left + innerW;

  return `${line} L ${endX} ${baseY} L ${PADDING.left} ${baseY} Z`;
}

const LEGEND_DOT_CLASS: Record<string, string> = {
  attendance: 'bg-[#0F8F68]',
  tasks: 'bg-[#16A34A]',
  payroll: 'bg-[#22C55E]',
};

export function OperationsChart({ labels, series }: OperationsChartProps) {
  const maxValue = useMemo(
    () => Math.max(...series.flatMap((item) => item.values), 1),
    [series],
  );

  const gridLines = [0.25, 0.5, 0.75].map((ratio) => {
    const y = PADDING.top + (CHART_HEIGHT - PADDING.top - PADDING.bottom) * (1 - ratio);
    return y;
  });

  return (
    <article className="flex h-[220px] flex-col rounded-[20px] border border-slate-900/[0.05] bg-white p-4 shadow-landing-card lg:h-[260px]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-slate-900 lg:text-sm">Operations Overview</h3>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 transition-colors hover:border-[#0F8F68] hover:text-[#0F8F68] lg:text-xs"
          aria-label="Filter by Today"
        >
          Today
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-3">
        {series.map((item) => (
          <div key={item.id} className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${LEGEND_DOT_CLASS[item.id] ?? 'bg-[#0F8F68]'}`}
              aria-hidden="true"
            />
            <span className="text-[10px] font-medium text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-full w-full"
          role="img"
          aria-label="Operations overview chart showing attendance, tasks, and payroll trends"
        >
          {gridLines.map((y) => (
            <line
              key={y}
              x1={PADDING.left}
              x2={CHART_WIDTH - PADDING.right}
              y1={y}
              y2={y}
              stroke="rgba(148, 163, 184, 0.25)"
              strokeWidth="1"
            />
          ))}

          {series.map((item, seriesIndex) => {
            const areaPath = buildAreaPath(item.values, maxValue);
            const linePath = buildSmoothPath(item.values, maxValue);

            return (
              <g key={item.id}>
                <motion.path
                  d={areaPath}
                  fill={item.fill}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 + seriesIndex * 0.1, duration: 0.6 }}
                />
                <motion.path
                  d={linePath}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0.6 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.35 + seriesIndex * 0.12, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                />
              </g>
            );
          })}

          {labels.map((label, index) => {
            const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
            const x = PADDING.left + (innerW / (labels.length - 1)) * index;
            return (
              <text
                key={label}
                x={x}
                y={CHART_HEIGHT - 4}
                textAnchor="middle"
                className="fill-slate-400 text-[9px] font-medium"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </article>
  );
}
