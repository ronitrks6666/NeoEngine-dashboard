import { useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { HeroVisualGroup } from '@/components/landing/HeroVisualGroup';
import { HERO_DURATION, HERO_EASE, heroStagger } from '@/components/landing/hero.motion';
import { navigateToCallbackSection } from '@/components/landing/landing-scroll';

type HeroProps = {
  onWatchDemo: () => void;
};

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: HERO_DURATION, ease: HERO_EASE },
  },
};

export function Hero({ onWatchDemo }: HeroProps) {
  const reducedMotion = useReducedMotion();
  const staggerProps = heroStagger(reducedMotion);

  const handleBookDemo = useCallback(() => {
    navigateToCallbackSection(Boolean(reducedMotion));
  }, [reducedMotion]);

  const handleWatchDemo = useCallback(() => {
    onWatchDemo();
  }, [onWatchDemo]);

  return (
    <motion.section
      id="demo"
      className="landing-hero relative w-full scroll-mt-[90px] overflow-x-clip overflow-y-visible"
      aria-label="NeoEngine product overview"
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : HERO_DURATION, ease: HERO_EASE }}
    >
      <div className="landing-hero-bg-base pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="landing-hero-bg-glow-dashboard pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="landing-hero-bg-glow-tr pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="landing-hero-bg-mesh pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="landing-hero-bg-vignette pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex w-full items-center px-4 py-0 md:px-6 md:py-0 lg:px-8 lg:pt-6 lg:pb-6 xl:px-10 2xl:px-12">
        <div className="mx-auto grid w-full max-w-[1700px] items-center gap-8 lg:grid-cols-[40%_60%] lg:gap-8">
          <motion.div
            className="mx-auto flex w-full max-w-[520px] flex-col items-center pb-2 text-center lg:mx-0 lg:items-start lg:pb-0 lg:text-left"
            {...staggerProps}
          >
            <motion.div
              variants={itemFade}
              initial={reducedMotion ? false : undefined}
              className="inline-flex h-10 max-w-full items-center rounded-full border border-[rgba(15,143,104,0.08)] bg-[#DDF7EE] px-5 shadow-landing-card"
            >
              <span className="text-center text-xs font-medium uppercase leading-tight tracking-[0.12em] text-[#0F8F68]">
                Workforce management for growing SMEs
              </span>
            </motion.div>

            <motion.h1
              variants={itemFade}
              initial={reducedMotion ? false : undefined}
              className="mt-8 w-full text-[42px] font-extrabold leading-[0.95] tracking-[-0.03em] text-slate-900 md:text-[52px] lg:text-[60px] xl:text-[60px] 2xl:text-[60px]"
            >
              <span className="block">One System.</span>
              <span className="block">Every Outlet.</span>
              <span className="block text-[#0F8F68]">Complete Control.</span>
            </motion.h1>

            <motion.p
              variants={itemFade}
              initial={reducedMotion ? false : undefined}
              className="mt-7 w-full max-w-[500px] text-lg font-normal leading-8 text-slate-600"
            >
              NeoEngine unifies SOPs, attendance, payroll, and daily operations in one platform—for
              restaurants, retail, clinics, factories, and every SME that runs on a frontline team.
            </motion.p>

            <motion.div
              variants={itemFade}
              initial={reducedMotion ? false : undefined}
              className="mt-8 flex w-full max-w-[500px] flex-col gap-4 pb-2 sm:flex-row sm:justify-center lg:justify-start lg:pb-0"
            >
              <button
                type="button"
                onClick={handleBookDemo}
                aria-label="Book a demo with NeoEngine"
                className="group inline-flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#0F8F68] px-8 text-base font-medium text-white shadow-landing-btn transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-[#0d7d5a] hover:shadow-landing-btn-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8F68] focus-visible:ring-offset-2 sm:w-auto"
              >
                Book a Demo
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </button>

              <button
                type="button"
                onClick={handleWatchDemo}
                aria-label="Watch live product demo video"
                className="group inline-flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-6 text-base font-medium text-slate-900 shadow-landing-card transition-[transform,border-color,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[#0F8F68] hover:bg-[#ECFDF5] hover:shadow-landing-card active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8F68] focus-visible:ring-offset-2 sm:w-auto"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DDF7EE] transition-[background-color,transform] duration-200 group-hover:rotate-[10deg] group-hover:bg-[#c9f0e3]">
                  <Play className="h-4 w-4 fill-[#0F8F68] text-[#0F8F68]" aria-hidden="true" />
                </span>
                Watch Live Demo
              </button>
            </motion.div>
          </motion.div>

          <HeroVisualGroup />
        </div>
      </div>
    </motion.section>
  );
}
