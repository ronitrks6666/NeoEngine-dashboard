import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { formatCountUpValue, useCountUp } from '@/components/landing/TrustMetrics/useCountUp';
import type { SuccessStory } from './customer-success.data';

type SuccessCardProps = {
  story: SuccessStory;
  index: number;
  animate: boolean;
};

export const SuccessCard = memo(function SuccessCard({ story, index, animate }: SuccessCardProps) {
  const reducedMotion = useReducedMotion();
  const { bigMetric } = story;
  const shouldAnimate = animate && !reducedMotion && bigMetric.numericValue != null;

  const count = useCountUp(
    bigMetric.numericValue ?? 0,
    shouldAnimate,
    1400,
    bigMetric.decimals ?? 0,
  );

  const metricDisplay = shouldAnimate
    ? formatCountUpValue(
        count,
        bigMetric.suffix ?? '',
        bigMetric.prefix ?? '',
        bigMetric.decimals ?? 0,
      )
    : bigMetric.value;

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-32px' }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reducedMotion ? undefined : { y: -6, transition: { duration: 0.22 } }}
      className="flex h-full flex-col rounded-[24px] bg-[#F8FAFC] p-8"
    >
      <div className="mb-5 flex items-center justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xs font-bold text-slate-600 shadow-sm"
          aria-hidden="true"
        >
          {story.logo}
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
          {story.industry}
        </span>
      </div>

      <h3 className="text-base font-bold text-slate-900">{story.company}</h3>
      <p className="mt-0.5 text-sm text-slate-500">{story.location}</p>

      <div className="my-6">
        <p className="text-[40px] font-bold leading-none tracking-tight text-[#0F8F68]">
          {metricDisplay}
        </p>
        <p className="mt-2 text-sm font-medium text-slate-600">{bigMetric.label}</p>
      </div>

      <blockquote className="mt-auto border-t border-slate-200/80 pt-5 text-sm leading-relaxed text-slate-600">
        &ldquo;{story.quote}&rdquo;
      </blockquote>
    </motion.article>
  );
});
