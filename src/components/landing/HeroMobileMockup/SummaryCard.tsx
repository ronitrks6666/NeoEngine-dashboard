import { ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';
import type { SummaryMetric } from './mobile-mockup.data';

type SummaryCardProps = {
  title: string;
  metrics: SummaryMetric[];
};

export function SummaryCard({ title, metrics }: SummaryCardProps) {
  return (
    <article className="rounded-[20px] bg-slate-50 p-[18px]">
      <h3 className="mb-4 text-xs font-semibold text-slate-900">{title}</h3>
      <ul className="space-y-4">
        {metrics.map((metric, index) => (
          <motion.li
            key={metric.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + index * 0.08, duration: 0.4 }}
            className="flex items-center justify-between gap-2"
          >
            <div>
              <p className="text-[10px] font-normal text-slate-500">{metric.label}</p>
              <p className="text-base font-bold text-slate-900">{metric.value}</p>
            </div>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#0F8F68]">
              <ArrowUp className="h-3 w-3" aria-hidden="true" />
              {metric.trend}
            </span>
          </motion.li>
        ))}
      </ul>
    </article>
  );
}
