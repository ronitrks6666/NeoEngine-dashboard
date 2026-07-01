import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { formatCountUpValue, useCountUp } from '@/components/landing/TrustMetrics/useCountUp';
import type { FeaturedStoryData } from './customer-success.data';
import { useInViewOnce } from './useInViewOnce';

const CHART_W = 280;
const CHART_H = 100;
const PAD = { top: 8, right: 8, bottom: 20, left: 8 };

function buildPath(values: number[], max: number): string {
  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const step = innerW / (values.length - 1);

  const points = values.map((v, i) => ({
    x: PAD.left + i * step,
    y: PAD.top + innerH - (v / max) * innerH,
  }));

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const c = points[i];
    const n = points[i + 1];
    const cx = (c.x + n.x) / 2;
    path += ` C ${cx} ${c.y}, ${cx} ${n.y}, ${n.x} ${n.y}`;
  }
  return path;
}

type MetricItemProps = {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  animate: boolean;
};

const MetricItem = memo(function MetricItem({
  label,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  animate,
}: MetricItemProps) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animate && !reducedMotion;
  const count = useCountUp(value, shouldAnimate, 1600, decimals);
  const display = shouldAnimate
    ? formatCountUpValue(count, suffix, prefix, decimals)
    : formatCountUpValue(value, suffix, prefix, decimals);

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-4">
      <p className="text-[28px] font-bold leading-none tracking-tight text-slate-900 md:text-[32px]">
        {display}
      </p>
      <p className="mt-2 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
});

type MetricsPanelProps = {
  data: FeaturedStoryData;
};

export const MetricsPanel = memo(function MetricsPanel({ data }: MetricsPanelProps) {
  const reducedMotion = useReducedMotion();
  const { ref, inView } = useInViewOnce<HTMLDivElement>();

  const max = Math.max(...data.beforeValues, ...data.afterValues, 1);
  const beforePath = buildPath(data.beforeValues, max);
  const afterPath = buildPath(data.afterValues, max);

  return (
    <div
      ref={ref}
      className="flex h-full flex-col rounded-[24px] border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-6 md:p-8"
    >
      <p className="mb-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Performance Dashboard
      </p>

      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {data.metrics.map((metric) => (
          <MetricItem
            key={metric.id}
            label={metric.label}
            value={metric.value}
            prefix={metric.prefix}
            suffix={metric.suffix}
            decimals={metric.decimals}
            animate={inView}
          />
        ))}
      </div>

      <div className="mt-6 flex-1 rounded-2xl border border-slate-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between text-[11px] font-medium text-slate-500">
          <span>Before NeoEngine</span>
          <span className="text-[#0F8F68]">After NeoEngine</span>
        </div>

        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="h-auto w-full"
          role="img"
          aria-label="Before and after performance comparison chart"
        >
          {[0.33, 0.66].map((ratio) => {
            const y = PAD.top + (CHART_H - PAD.top - PAD.bottom) * (1 - ratio);
            return (
              <line
                key={ratio}
                x1={PAD.left}
                y1={y}
                x2={CHART_W - PAD.right}
                y2={y}
                stroke="#E2E8F0"
                strokeWidth="1"
              />
            );
          })}

          <motion.path
            d={beforePath}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2"
            strokeLinecap="round"
            initial={reducedMotion ? false : { pathLength: 0, opacity: 0.6 }}
            animate={inView || reducedMotion ? { pathLength: 1, opacity: 0.7 } : undefined}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />

          <motion.path
            d={afterPath}
            fill="none"
            stroke="#0F8F68"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
            animate={inView || reducedMotion ? { pathLength: 1, opacity: 1 } : undefined}
            transition={{ duration: 1.4, delay: 0.3, ease: 'easeOut' }}
          />
        </svg>

        <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-slate-400" aria-hidden="true" />
            Before
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-[#0F8F68]" aria-hidden="true" />
            After
          </span>
        </div>
      </div>
    </div>
  );
});
