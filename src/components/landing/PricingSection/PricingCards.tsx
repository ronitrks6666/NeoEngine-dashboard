import { memo, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { navigateToCallbackSection } from '@/components/landing/landing-scroll';
import { CUSTOM_PLAN, STANDARD_PLAN } from './pricing.data';
function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export const PricingCards = memo(function PricingCards() {
  const reducedMotion = useReducedMotion();

  const scrollToCallback = useCallback(() => {
    navigateToCallbackSection(Boolean(reducedMotion));
  }, [reducedMotion]);

  return (
    <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
      <motion.article
        initial={reducedMotion ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-48px' }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        whileHover={reducedMotion ? undefined : { y: -4, transition: { duration: 0.22 } }}
        className="relative flex flex-col overflow-hidden rounded-[30px] border-2 border-[#0F8F68]/20 bg-white p-8 shadow-[0_16px_48px_rgba(15,143,104,0.08)] md:p-10"
      >
        <span className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#0F8F68]">
          {STANDARD_PLAN.badge}
        </span>

        <h3 className="mt-4 text-2xl font-bold text-slate-900">{STANDARD_PLAN.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{STANDARD_PLAN.description}</p>

        <div className="mt-6">
          <p className="text-[44px] font-extrabold leading-none tracking-tight text-slate-900 md:text-[52px]">
            {formatPrice(STANDARD_PLAN.price)}
            <span className="text-lg font-semibold text-slate-400">/{STANDARD_PLAN.period}</span>
          </p>
          <p className="mt-2 text-sm font-medium text-[#0F8F68]">{STANDARD_PLAN.unit}</p>
        </div>

        <ul className="mt-8 flex flex-1 flex-col gap-3">
          {STANDARD_PLAN.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                <Check className="h-3 w-3 text-[#0F8F68]" strokeWidth={3} aria-hidden="true" />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={scrollToCallback}
          className="group mt-10 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0F8F68] px-6 text-sm font-semibold text-white shadow-landing-btn transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-landing-btn-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8F68] focus-visible:ring-offset-2"
        >
          Book Demo
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
      </motion.article>

      <motion.article
        initial={reducedMotion ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-48px' }}
        transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        whileHover={reducedMotion ? undefined : { y: -4, transition: { duration: 0.22 } }}
        className="relative flex flex-col overflow-hidden rounded-[30px] border border-slate-900/[0.06] bg-gradient-to-br from-slate-900 via-slate-900 to-[#0A3D2E] p-8 text-white shadow-[0_16px_48px_rgba(15,23,42,0.12)] md:p-10"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(15,143,104,0.35),transparent_70%)]"
          aria-hidden="true"
        />

        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-emerald-200">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Enterprise & Growth
        </span>

        <h3 className="mt-4 text-2xl font-bold">{CUSTOM_PLAN.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{CUSTOM_PLAN.description}</p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
            Includes advanced modules
          </p>
          <ul className="mt-4 space-y-3">
            {CUSTOM_PLAN.features.slice(0, 3).map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm font-medium text-white">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0F8F68]/30">
                  <Check className="h-3.5 w-3.5 text-emerald-200" strokeWidth={3} aria-hidden="true" />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <ul className="mt-6 flex flex-1 flex-col gap-2.5">
          {CUSTOM_PLAN.features.slice(3).map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10">
                <Check className="h-3 w-3 text-emerald-300" strokeWidth={3} aria-hidden="true" />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={scrollToCallback}
          className="mt-10 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-white/20 bg-white px-6 text-sm font-semibold text-slate-900 transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          {CUSTOM_PLAN.cta}
        </button>
      </motion.article>
    </div>
  );
});
