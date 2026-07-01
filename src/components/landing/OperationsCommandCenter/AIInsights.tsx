import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { AIInsight } from './operations.data';

type AIInsightsProps = {
  insights: AIInsight[];
};

const PRIORITY_STYLES = {
  High: 'bg-red-50 text-red-700',
  Medium: 'bg-amber-50 text-amber-700',
  Low: 'bg-emerald-50 text-[#0F8F68]',
} as const;

export const AIInsights = memo(function AIInsights({ insights }: AIInsightsProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reducedMotion ? undefined : { y: -3, transition: { duration: 0.2 } }}
      className="rounded-[28px] border border-slate-900/[0.05] bg-white p-8 shadow-landing-card transition-shadow duration-300 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50" aria-hidden="true">
          <Sparkles className="h-5 w-5 text-[#0F8F68]" />
        </span>
        <h3 className="text-lg font-bold text-slate-900">AI Insights</h3>
      </div>

      <ul className="mt-6 space-y-3">
        {insights.map((insight, index) => (
          <motion.li
            key={insight.id}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + index * 0.08, duration: 0.4 }}
            className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition-colors duration-200 hover:bg-slate-50"
          >
            <p className="text-sm font-medium text-slate-700">{insight.message}</p>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[insight.priority]}`}
            >
              {insight.priority}
            </span>
          </motion.li>
        ))}
      </ul>
    </motion.article>
  );
});
