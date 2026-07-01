import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';

const ITEMS = [
  { label: 'Create Outlet', done: true },
  { label: 'Staff Invite', done: true },
  { label: 'Role Assignment', done: true },
  { label: 'Set Shift Timings', done: true },
  { label: 'Define SOPs & Checklists', done: true },
];

export const OnboardingIllustration = memo(function OnboardingIllustration() {
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
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Setup Progress
      </p>
      <ul className="space-y-2">
        {ITEMS.map((item, index) => (
          <motion.li
            key={item.label}
            initial={reducedMotion ? false : { opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + index * 0.07, duration: 0.3 }}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2"
          >
            <span className="text-xs font-medium text-slate-700">{item.label}</span>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50">
              <Check className="h-3 w-3 text-[#0F8F68]" strokeWidth={3} />
            </span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
});
