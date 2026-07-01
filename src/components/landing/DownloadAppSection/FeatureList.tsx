import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { FEATURE_ITEMS } from './download-app.data';

export const FeatureList = memo(function FeatureList() {
  const reducedMotion = useReducedMotion();

  return (
    <ul className="mt-8 space-y-[18px]">
      {FEATURE_ITEMS.map((item, index) => (
        <motion.li
          key={item}
          initial={reducedMotion ? false : { opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} aria-hidden="true" />
          </span>
          <span className="text-[15px] font-medium text-white/95">{item}</span>
        </motion.li>
      ))}
    </ul>
  );
});
