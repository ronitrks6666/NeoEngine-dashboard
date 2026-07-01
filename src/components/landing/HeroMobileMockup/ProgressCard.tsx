import { motion } from 'framer-motion';
import type { OutletProgress } from './mobile-mockup.data';

type ProgressCardProps = {
  title: string;
  outlets: OutletProgress[];
};

export function ProgressCard({ title, outlets }: ProgressCardProps) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-bold text-slate-900">{title}</h3>
      <ul className="space-y-3">
        {outlets.map((outlet, index) => (
          <motion.li
            key={outlet.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + index * 0.08, duration: 0.4 }}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="truncate text-[10px] font-medium text-slate-700">{outlet.name}</span>
              <span className="shrink-0 text-[10px] font-semibold text-[#0F8F68]">{outlet.percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className="h-2 rounded-full bg-[#0F8F68]"
                initial={{ width: 0 }}
                animate={{ width: `${outlet.percent}%` }}
                transition={{ delay: 0.45 + index * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                role="progressbar"
                aria-valuenow={outlet.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${outlet.name} performance`}
              />
            </div>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
