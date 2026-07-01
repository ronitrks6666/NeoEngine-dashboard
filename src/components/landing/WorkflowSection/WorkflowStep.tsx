import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { InsightsIllustration } from './illustrations/InsightsIllustration';
import type { WorkflowStepData } from './workflow.data';

type WorkflowStepProps = {
  data: WorkflowStepData;
  index: number;
  variant?: 'desktop' | 'mobile';
};

export const WorkflowStep = memo(function WorkflowStep({
  data,
  index,
  variant = 'mobile',
}: WorkflowStepProps) {
  const reducedMotion = useReducedMotion();
  const Icon = data.icon;
  const Illustration = data.illustration;
  const stepLabel = String(data.step).padStart(2, '0');
  const isInsights = data.step === 3;

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reducedMotion ? undefined : { y: -6, transition: { duration: 0.22 } }}
      className={`relative rounded-[28px] border border-slate-900/[0.05] bg-white shadow-[0_16px_48px_rgba(15,23,42,0.05)] focus-within:ring-2 focus-within:ring-[#0F8F68] focus-within:ring-offset-2 ${
        variant === 'desktop'
          ? 'mx-0 w-full min-w-0 p-8 xl:p-9'
          : 'mx-auto w-full max-w-[420px] p-9'
      } ${isInsights && variant === 'desktop' ? 'xl:min-w-[300px]' : ''}`}
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-4">
        <motion.div
          className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0F8F68] to-[#22C55E] text-xl font-bold text-white shadow-[0_8px_24px_rgba(15,143,104,0.3)]"
          animate={
            reducedMotion
              ? undefined
              : { scale: [1, 1.04, 1], opacity: [1, 0.92, 1] }
          }
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          {stepLabel}
        </motion.div>

        <motion.span
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-[#0F8F68]"
          whileHover={reducedMotion ? undefined : { rotate: 5, transition: { duration: 0.2 } }}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </motion.span>
      </div>

      <h3 className={`mt-6 font-bold text-slate-900 ${isInsights ? 'text-2xl' : 'text-xl'}`}>
        {data.title}
      </h3>
      <p
        className={`mt-2 leading-relaxed text-slate-600 ${
          isInsights ? 'text-base' : 'text-sm'
        }`}
      >
        {data.description}
      </p>

      {data.step === 3 ? <InsightsIllustration large /> : <Illustration />}
    </motion.article>
  );
});
