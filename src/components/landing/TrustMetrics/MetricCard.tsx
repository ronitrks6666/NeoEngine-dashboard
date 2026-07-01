import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { TrustMetric } from './trust-metrics.data';
import { formatCountUpValue, useCountUp } from './useCountUp';

type MetricCardProps = {
  metric: TrustMetric;
  index: number;
  animate: boolean;
};

export const MetricCard = memo(function MetricCard({ metric, index, animate }: MetricCardProps) {
  const reducedMotion = useReducedMotion();
  const Icon = metric.icon;
  const shouldAnimate = animate && !reducedMotion && metric.format !== 'static';

  const count = useCountUp(
    metric.numericValue ?? 0,
    shouldAnimate,
    1800,
    metric.decimals ?? 0,
  );

  const display =
    metric.format === 'static' || !shouldAnimate
      ? metric.displayValue
      : formatCountUpValue(
          count,
          metric.suffix,
          metric.prefix,
          metric.decimals ?? 0,
        );

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reducedMotion ? undefined : { y: -4, transition: { duration: 0.2 } }}
      className="group flex flex-col items-center px-2 text-center"
    >
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 transition-transform duration-200 group-hover:rotate-[5deg] group-hover:scale-[1.08]"
        aria-hidden="true"
      >
        <Icon className="h-6 w-6 text-[#0F8F68]" strokeWidth={2} />
      </div>

      <p className="text-[44px] font-bold leading-none tracking-tight text-slate-900">{display}</p>
      <p className="mt-3 text-[15px] font-medium text-slate-600">{metric.label}</p>
      <p className="mt-1 text-[13px] font-normal text-slate-500">{metric.description}</p>
    </motion.article>
  );
});
