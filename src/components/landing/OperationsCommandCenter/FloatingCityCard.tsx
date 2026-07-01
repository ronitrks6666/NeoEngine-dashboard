import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type FloatingCityCardProps = {
  city: string;
  health: number;
  className: string;
};

export const FloatingCityCard = memo(function FloatingCityCard({
  city,
  health,
  className,
}: FloatingCityCardProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={`pointer-events-none absolute z-10 hidden h-[60px] w-[100px] rounded-[18px] border border-[#EEF2F7] bg-white px-4 py-[14px] shadow-[0_12px_30px_rgba(15,23,42,0.08)] md:block ${className}`}
      animate={reducedMotion ? undefined : { y: [0, -3, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      <p className="text-[11px] font-semibold text-slate-900">{city}</p>
      <p className="text-[11px] text-[#0F8F68]">{health}%</p>
    </motion.div>
  );
});
