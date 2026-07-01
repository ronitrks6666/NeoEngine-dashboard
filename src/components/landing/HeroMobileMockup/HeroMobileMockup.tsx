import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { HERO_DURATION, HERO_EASE } from '@/components/landing/hero.motion';

export const HeroMobileMockup = memo(function HeroMobileMockup() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="landing-hero-phone-wrap relative z-20 mx-auto w-[76%] max-w-[300px] shrink-0 min-[992px]:w-[260px] min-[992px]:max-w-[260px] min-[1200px]:w-[280px] min-[1200px]:max-w-[280px]"
      aria-hidden="true"
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : HERO_DURATION, delay: reducedMotion ? 0 : 0.35, ease: HERO_EASE }}
    >
      <div className="landing-hero-mobile-float-inner">
        <div className="landing-hero-phone-tilt">
          <div className="landing-hero-mobile-glass rounded-[34px] p-1">
            <div className="landing-hero-phone-depth relative flex h-[min(500px,92vw)] cursor-default flex-col overflow-hidden rounded-[30px] border border-slate-900/[0.06] bg-white p-2.5 ring-1 ring-white/90 min-[992px]:h-[540px] min-[1200px]:h-[600px] min-[1200px]:p-3">
              <div
                className="pointer-events-none absolute left-1/2 top-2.5 z-10 h-1 w-12 -translate-x-1/2 rounded-full bg-slate-200 min-[1200px]:top-3 min-[1200px]:h-1.5 min-[1200px]:w-14"
                aria-hidden="true"
              />
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-[22px] bg-white">
                <img
                  src="/assets/store/neoengine-mobile-dashboard.png"
                  alt="NeoEngine Mobile App Dashboard"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover object-top"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
