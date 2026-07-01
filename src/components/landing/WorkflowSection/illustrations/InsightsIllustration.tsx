import { memo, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const CHART_W = 200;
const CHART_H = 64;

function buildPath(values: number[], max: number): string {
  const pad = 4;
  const innerW = CHART_W - pad * 2;
  const innerH = CHART_H - pad * 2;
  const step = innerW / (values.length - 1);

  const points = values.map((v, i) => ({
    x: pad + i * step,
    y: pad + innerH - (v / max) * innerH,
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

const REVENUE = [32, 38, 42, 48, 55, 62, 71];
const ATTENDANCE = [88, 90, 91, 93, 94, 96, 97];

type InsightsIllustrationProps = {
  large?: boolean;
};

export const InsightsIllustration = memo(function InsightsIllustration({
  large = false,
}: InsightsIllustrationProps) {
  const reducedMotion = useReducedMotion();
  const max = 100;

  const revenuePath = useMemo(() => buildPath(REVENUE, max), []);
  const attendancePath = useMemo(() => buildPath(ATTENDANCE, max), []);

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: 0.15 }}
      className={`mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60 ${
        large ? 'p-5' : 'p-4'
      }`}
      aria-hidden="true"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p
          className={`font-semibold uppercase tracking-wide text-slate-400 ${
            large ? 'text-xs' : 'text-[10px]'
          }`}
        >
          Outlet Comparison
        </p>
        <span className={`font-bold text-[#0F8F68] ${large ? 'text-xs' : 'text-[10px]'}`}>
          +18% vs last week
        </span>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-3">
        <p className={`mb-1 font-medium text-slate-500 ${large ? 'text-xs' : 'text-[10px]'}`}>
          Revenue Trend
        </p>
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className={`w-full ${large ? 'h-20' : 'h-14'}`}>
          <motion.path
            d={revenuePath}
            fill="none"
            stroke="#0F8F68"
            strokeWidth="2"
            strokeLinecap="round"
            initial={reducedMotion ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
      </div>

      <div className="mt-2 rounded-xl border border-slate-100 bg-white p-3">
        <p className={`mb-1 font-medium text-slate-500 ${large ? 'text-xs' : 'text-[10px]'}`}>
          Attendance
        </p>
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className={`w-full ${large ? 'h-20' : 'h-14'}`}>
          <motion.path
            d={attendancePath}
            fill="none"
            stroke="#22C55E"
            strokeWidth="2"
            strokeLinecap="round"
            initial={reducedMotion ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
          />
        </svg>
      </div>
    </motion.div>
  );
});
