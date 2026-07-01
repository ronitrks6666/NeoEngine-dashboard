import { ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';
import type { KpiMetric } from './dashboard.data';

type KPICardProps = {
  metric: KpiMetric;
  index: number;
};

export function KPICard({ metric, index }: KPICardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 + index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-[88px] flex-col justify-between rounded-2xl border border-slate-900/[0.05] bg-white p-4 shadow-landing-card transition-transform duration-200 hover:-translate-y-0.5 lg:h-[110px] lg:rounded-[20px]"
    >
      <p className="text-[10px] font-normal text-slate-500 lg:text-xs">{metric.label}</p>
      <p className="text-lg font-semibold leading-none text-slate-900 lg:text-2xl">{metric.value}</p>
      <div className="flex items-center gap-1 text-[10px] font-medium text-[#0F8F68] lg:text-xs">
        {metric.trendUp && <ArrowUp className="h-3 w-3" aria-hidden="true" />}
        <span>{metric.trend}</span>
      </div>
    </motion.article>
  );
}
