import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useCountUp } from '@/components/landing/TrustMetrics/useCountUp';
import { formatROIValue } from './pricing.logic';
import type { ROIMetricResult } from './pricing.types';

type ROICardProps = {
  metric: ROIMetricResult;
  animate: boolean;
  index: number;
};

export const ROICard = memo(function ROICard({ metric, animate, index }: ROICardProps) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animate && !reducedMotion;

  const count = useCountUp(metric.value, shouldAnimate, 1200, metric.decimals ?? 0);

  const display = shouldAnimate
    ? formatROIValue(
        count,
        metric.prefix,
        metric.suffix,
        metric.format,
      )
    : formatROIValue(
        metric.value,
        metric.prefix,
        metric.suffix,
        metric.format,
      );

  // For currency with count animation, use numeric count then format
  const currencyDisplay =
    shouldAnimate && metric.format === 'currency'
      ? formatROIValue(count, metric.prefix, metric.suffix, 'currency')
      : display;

  const finalDisplay = metric.format === 'currency' ? currencyDisplay : display;

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reducedMotion ? undefined : { y: -4, transition: { duration: 0.2 } }}
      className="rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-sm"
    >
      <p
        className="text-2xl font-bold tracking-tight text-[#0F8F68] md:text-[28px]"
        aria-live="polite"
      >
        {finalDisplay}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-600">{metric.label}</p>
    </motion.article>
  );
});
