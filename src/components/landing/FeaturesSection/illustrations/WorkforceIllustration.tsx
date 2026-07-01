import { motion, useReducedMotion } from 'framer-motion';

const ROWS = [
  { name: 'Arjun S.', role: 'Head Chef', outlet: 'Koramangala', status: 'On Shift', present: true },
  { name: 'Priya M.', role: 'Floor Manager', outlet: 'Indiranagar', status: 'On Shift', present: true },
  { name: 'Rahul K.', role: 'Cashier', outlet: 'HSR Layout', status: 'Late', present: false },
];

export function WorkforceIllustration() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="relative h-full w-full"
      animate={reducedMotion ? undefined : { y: [0, -4, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/80">
        <div className="grid grid-cols-[1.1fr_1fr_0.9fr_0.75fr] gap-2 border-b border-slate-100 bg-white px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:text-xs">
          <span>Employee</span>
          <span>Role</span>
          <span>Outlet</span>
          <span>Status</span>
        </div>
        {ROWS.map((row) => (
          <div
            key={row.name}
            className="grid grid-cols-[1.1fr_1fr_0.9fr_0.75fr] items-center gap-2 border-b border-slate-50 px-4 py-3.5 last:border-0"
          >
            <span className="truncate text-sm font-semibold text-slate-800">{row.name}</span>
            <span className="truncate text-xs text-slate-600 sm:text-sm">{row.role}</span>
            <span className="truncate text-xs text-slate-600 sm:text-sm">{row.outlet}</span>
            <span
              className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold sm:text-xs ${
                row.present
                  ? 'bg-emerald-50 text-[#0F8F68]'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {row.status}
            </span>
          </div>
        ))}
      </div>

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="absolute bottom-2 right-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-[#0F8F68] shadow-landing-card sm:text-sm"
      >
        97% Attendance
      </motion.div>
    </motion.div>
  );
}
