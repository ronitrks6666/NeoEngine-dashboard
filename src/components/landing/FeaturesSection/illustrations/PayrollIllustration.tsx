import { motion, useReducedMotion } from 'framer-motion';

const ITEMS = [
  { label: 'Approved', amount: '₹3.1L', tone: 'green' },
  { label: 'Pending', amount: '₹1.1L', tone: 'amber' },
];

export function PayrollIllustration() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="mx-auto max-w-[260px] rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
      animate={reducedMotion ? undefined : { y: [0, -3, 0] }}
      transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-medium text-slate-500">Total Payroll</p>
          <motion.p
            className="text-2xl font-bold text-slate-900"
            initial={reducedMotion ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            ₹4.2L
          </motion.p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-[#0F8F68]">
          Approved
        </span>
      </div>

      <div className="space-y-2">
        {ITEMS.map((item, i) => (
          <motion.div
            key={item.label}
            initial={reducedMotion ? false : { opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + i * 0.1 }}
            className="flex items-center justify-between rounded-xl bg-white px-3 py-2"
          >
            <span className="text-xs font-medium text-slate-600">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800">{item.amount}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  item.tone === 'green'
                    ? 'bg-emerald-50 text-[#0F8F68]'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {item.label}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
