import { memo, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type FloatingMetricProps = {
  label: string;
  value: string;
  tone?: 'green' | 'white';
  style?: CSSProperties;
  delay?: number;
};

export const FloatingMetric = memo(function FloatingMetric({
  label,
  value,
  tone = 'white',
  style,
  delay = 0,
}: FloatingMetricProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      style={style}
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      animate={
        reducedMotion
          ? undefined
          : { y: [0, -8, 0], transition: { duration: 5 + delay, repeat: Infinity, ease: 'easeInOut' } }
      }
      className={`absolute z-20 min-w-[112px] max-w-[148px] rounded-2xl border px-3.5 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] backdrop-blur-md sm:min-w-[120px] sm:px-4 sm:py-3 ${
        tone === 'green'
          ? 'border-emerald-200/40 bg-[#0F8F68]/90 text-white'
          : 'border-white/40 bg-white/90 text-slate-900'
      }`}
    >
      <p
        className={`text-[9px] font-semibold uppercase tracking-wide sm:text-[10px] ${
          tone === 'green' ? 'text-white/80' : 'text-slate-500'
        }`}
      >
        {label}
      </p>
      <p className="mt-0.5 text-xs font-bold sm:text-sm">{value}</p>
    </motion.div>
  );
});
