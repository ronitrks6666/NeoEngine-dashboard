import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { HEALTH_METRICS } from './operations.data';

const LIVE_STATS = [
  { id: 'alerts', label: 'Open Alerts', value: '3', tone: 'amber' as const },
  { id: 'sync', label: 'Last Sync', value: '2 min ago', tone: 'neutral' as const },
  { id: 'compliance', label: 'SOP Compliance', value: '94%', tone: 'green' as const },
];

export const OperationsHealth = memo(function OperationsHealth() {
  const reducedMotion = useReducedMotion();
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const score = 98;

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reducedMotion ? undefined : { y: -3, transition: { duration: 0.2 } }}
      className="rounded-[28px] border border-slate-900/[0.05] bg-white p-8 shadow-landing-card transition-shadow duration-300 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-900">Operations Health</h3>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-[#0F8F68]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#0F8F68]" />
          </span>
          Live
        </span>
      </div>

      <div className="mt-6 flex flex-col items-center">
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="10" />
            <motion.circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#0F8F68"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={reducedMotion ? undefined : { strokeDashoffset: circumference }}
              whileInView={{ strokeDashoffset: circumference * (1 - score / 100) }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-slate-900">
            {score}
          </span>
        </div>
        <p className="mt-3 text-sm font-semibold text-[#0F8F68]">Excellent</p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {HEALTH_METRICS.map((metric) => (
          <div key={metric.id} className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
            <p className="text-[10px] font-medium text-slate-500">{metric.label}</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
        {LIVE_STATS.map((stat) => (
          <div
            key={stat.id}
            className="flex items-center justify-between rounded-lg bg-slate-50/80 px-3 py-2"
          >
            <span className="text-xs font-medium text-slate-500">{stat.label}</span>
            <span
              className={`text-xs font-bold ${
                stat.tone === 'amber'
                  ? 'text-amber-700'
                  : stat.tone === 'green'
                    ? 'text-[#0F8F68]'
                    : 'text-slate-800'
              }`}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </motion.article>
  );
});
