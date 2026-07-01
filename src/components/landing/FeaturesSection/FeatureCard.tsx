import { memo, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { FeatureBentoItem } from './features-section.data';

type FeatureCardProps = {
  feature: FeatureBentoItem;
  index: number;
  illustration: ReactNode;
};

export const FeatureCard = memo(function FeatureCard({
  feature,
  index,
  illustration,
}: FeatureCardProps) {
  const reducedMotion = useReducedMotion();
  const Icon = feature.icon;

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 28 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{ duration: 0.55, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reducedMotion ? undefined : { y: -6, transition: { duration: 0.3 } }}
      className={`group relative flex flex-col overflow-hidden rounded-[28px] border border-slate-900/[0.05] bg-white p-8 shadow-[0_4px_24px_rgba(15,23,42,0.04)] transition-[box-shadow,border-color] duration-300 hover:border-[#0F8F68]/30 hover:shadow-[0_20px_48px_rgba(15,23,42,0.08)] ${feature.gridClass}`}
    >
      <div
        className="pointer-events-none absolute -bottom-8 -right-8 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(15,143,104,0.04)_0%,transparent_70%)]"
        aria-hidden="true"
      />

      <div
        className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-emerald-50 transition-transform duration-300 group-hover:rotate-[6deg] group-hover:scale-105"
        aria-hidden="true"
      >
        <Icon className="h-7 w-7 text-[#0F8F68]" strokeWidth={2} />
      </div>

      <h3 className="mt-6 text-2xl font-bold text-slate-900">{feature.title}</h3>
      <p className="mt-3 max-w-xl text-base leading-[30px] text-slate-600">{feature.description}</p>

      <div className={`relative mt-6 min-h-0 flex-1 ${feature.large ? 'min-h-[220px] lg:min-h-[260px]' : 'min-h-[180px]'}`}>
        {illustration}
      </div>
    </motion.article>
  );
});
