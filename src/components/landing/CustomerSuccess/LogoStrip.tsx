import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { BrandLogo } from './customer-success.data';

type LogoStripProps = {
  logos: BrandLogo[];
};

export const LogoStrip = memo(function LogoStrip({ logos }: LogoStripProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-32px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mt-20 text-center"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        Trusted by
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-700">10+ growing brands</p>

      <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-14">
        {logos.map((logo) => (
          <li key={logo.id}>
            <div
              className="group flex h-8 items-center justify-center transition-transform duration-300 hover:scale-105"
            >
              <span
                className="whitespace-nowrap text-sm font-bold tracking-tight text-slate-400 transition-colors duration-300 group-hover:text-[var(--logo-color)]"
                style={{ '--logo-color': logo.color } as React.CSSProperties}
              >
                {logo.name}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </motion.div>
  );
});
