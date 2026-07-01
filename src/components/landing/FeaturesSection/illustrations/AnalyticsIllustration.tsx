import { memo, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const ATTENDANCE = [91, 93, 92, 95, 94, 96, 97];

const OUTLET_LABOR = [
  { name: 'Koramangala', pct: 28, color: '#0F8F68' },
  { name: 'Indiranagar', pct: 24, color: '#22C55E' },
  { name: 'HSR Layout', pct: 31, color: '#86EFAC' },
];

function buildAttendancePath(values: number[], w: number, h: number, pad: number): string {
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const max = 100;
  const min = 88;
  const step = innerW / (values.length - 1);

  const points = values.map((v, i) => ({
    x: pad + i * step,
    y: pad + innerH - ((v - min) / (max - min)) * innerH,
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

export const AnalyticsIllustration = memo(function AnalyticsIllustration() {
  const reducedMotion = useReducedMotion();
  const chartW = 120;
  const chartH = 52;
  const attendancePath = useMemo(() => buildAttendancePath(ATTENDANCE, chartW, chartH, 6), []);

  return (
    <motion.div
      className="grid h-full grid-cols-1 gap-3 sm:grid-cols-[1.35fr_1fr]"
      animate={reducedMotion ? undefined : { y: [0, -3, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Attendance trend — operational KPI */}
      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <p className="text-[10px] font-semibold text-slate-700">Attendance %</p>
          <span className="text-[10px] font-bold text-[#0F8F68]">97% today</span>
        </div>
        <p className="mb-2 text-[9px] text-slate-400">Last 7 days · all outlets</p>
        <svg viewBox={`0 0 ${chartW} ${chartH + 14}`} className="h-[72px] w-full" aria-hidden="true">
          {/* Y-axis guide */}
          <line x1="6" y1="8" x2="6" y2={chartH - 2} stroke="#E2E8F0" strokeWidth="1" />
          <text x="4" y="12" textAnchor="end" className="fill-slate-400 text-[5px]">100</text>
          <text x="4" y={chartH - 4} textAnchor="end" className="fill-slate-400 text-[5px]">88</text>
          <motion.path
            d={attendancePath}
            fill="none"
            stroke="#0F8F68"
            strokeWidth="2"
            strokeLinecap="round"
            initial={reducedMotion ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
          {ATTENDANCE.map((v, i) => {
            const pad = 6;
            const innerW = chartW - pad * 2;
            const innerH = chartH - pad * 2;
            const x = pad + (i * innerW) / (ATTENDANCE.length - 1);
            const y = pad + innerH - ((v - 88) / 12) * innerH;
            return (
              <circle key={i} cx={x} cy={y} r="2" fill="#0F8F68" opacity="0.85" />
            );
          })}
          {DAYS.map((day, i) => {
            const pad = 6;
            const innerW = chartW - pad * 2;
            const x = pad + (i * innerW) / (DAYS.length - 1);
            return (
              <text
                key={day + i}
                x={x}
                y={chartH + 10}
                textAnchor="middle"
                className="fill-slate-400 text-[5.5px] font-medium"
              >
                {day}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Labor cost % by outlet */}
      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
        <p className="text-[10px] font-semibold text-slate-700">Labor cost %</p>
        <p className="mb-3 text-[9px] text-slate-400">By outlet · this week</p>
        <ul className="space-y-2.5" aria-hidden="true">
          {OUTLET_LABOR.map((outlet, i) => (
            <li key={outlet.name}>
              <div className="mb-1 flex items-center justify-between text-[9px]">
                <span className="truncate font-medium text-slate-600">{outlet.name}</span>
                <span className="shrink-0 font-bold text-slate-800">{outlet.pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: outlet.color }}
                  initial={reducedMotion ? false : { width: 0 }}
                  whileInView={{ width: `${(outlet.pct / 35) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.15 + i * 0.1 }}
                />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-slate-100 pt-2 text-[9px] text-slate-400">
          Target: ≤ 30% of revenue
        </p>
      </div>
    </motion.div>
  );
});
