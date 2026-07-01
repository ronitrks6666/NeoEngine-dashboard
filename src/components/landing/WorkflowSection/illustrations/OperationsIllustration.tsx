import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const TASKS = [
  { label: 'Opening checklist', done: true },
  { label: 'Attendance verified: 94%', done: true },
  { label: 'Payroll auto-calculated', done: true },
  { label: 'Prep station audit', done: false },
  { label: 'Shift handoff', done: false },
];

export const OperationsIllustration = memo(function OperationsIllustration() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: 0.15 }}
      className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
      aria-hidden="true"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-[#0F8F68]">
          <span className="relative flex h-1.5 w-1.5">
            {!reducedMotion && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-60 motion-reduce:animate-none" />
            )}
            <span className="relative h-1.5 w-1.5 rounded-full bg-[#0F8F68]" />
          </span>
          Live
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500">
          3 / 5 complete
        </span>
      </div>

      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Today&apos;s Checklist
      </p>
      <ul className="space-y-1.5">
        {TASKS.map((task, index) => (
          <motion.li
            key={task.label}
            initial={reducedMotion ? false : { opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + index * 0.07, duration: 0.3 }}
            className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-700"
          >
            <CheckCircle2
              className={`h-3.5 w-3.5 shrink-0 ${task.done ? 'text-[#0F8F68]' : 'text-slate-300'}`}
              strokeWidth={2}
            />
            {task.label}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
});
