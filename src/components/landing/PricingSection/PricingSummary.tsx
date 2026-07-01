import { memo, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Clock, Headphones } from 'lucide-react';
import { navigateToCallbackSection } from '@/components/landing/landing-scroll';
import { formatCurrency } from './pricing.logic';
import { INCLUDED_FEATURES, IMPLEMENTATION_TIME, SUPPORT_LABEL } from './pricing.data';
import type { PricingResult } from './pricing.types';

type PricingSummaryProps = {
  pricing: PricingResult;
  billingCycle: 'monthly' | 'yearly';
};

export const PricingSummary = memo(function PricingSummary({
  pricing,
  billingCycle,
}: PricingSummaryProps) {
  const reducedMotion = useReducedMotion();

  const scrollToCallback = useCallback(() => {
    navigateToCallbackSection(Boolean(reducedMotion));
  }, [reducedMotion]);

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reducedMotion ? undefined : { y: -4, transition: { duration: 0.22 } }}
      className="flex h-full flex-col rounded-[30px] border border-slate-900/[0.06] bg-white p-8 shadow-[0_16px_48px_rgba(15,23,42,0.05)] md:p-10"
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Live Pricing Summary
      </p>

      <div className="mt-4">
        <p className="text-sm font-medium text-slate-500">
          Estimated Monthly Cost
          {billingCycle === 'yearly' && (
            <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-[#0F8F68]">
              Billed yearly · Save {pricing.yearlyDiscountPercent}%
            </span>
          )}
        </p>
        <motion.p
          key={pricing.monthlyCost}
          initial={reducedMotion ? false : { opacity: 0.6, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-2 text-[44px] font-extrabold leading-none tracking-tight text-slate-900 md:text-[52px]"
          aria-live="polite"
        >
          {formatCurrency(pricing.monthlyCost)}
          <span className="text-lg font-semibold text-slate-400">/mo</span>
        </motion.p>
        {billingCycle === 'yearly' && (
          <p className="mt-2 text-sm text-slate-500">
            {formatCurrency(pricing.annualCost)} billed annually
          </p>
        )}
      </div>

      <div className="mt-8">
        <p className="text-sm font-semibold text-slate-800">Included Features</p>
        <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {INCLUDED_FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-2.5 text-sm text-slate-600">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                <Check className="h-3 w-3 text-[#0F8F68]" strokeWidth={3} aria-hidden="true" />
              </span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-100 pt-8">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
            <Clock className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-medium text-slate-400">Implementation Time</p>
            <p className="text-sm font-bold text-slate-800">{IMPLEMENTATION_TIME}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
            <Headphones className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-medium text-slate-400">Support</p>
            <p className="text-sm font-bold text-slate-800">{SUPPORT_LABEL}</p>
          </div>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-10">
        <button
          type="button"
          onClick={scrollToCallback}
          className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0F8F68] px-6 text-sm font-semibold text-white shadow-landing-btn transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-landing-btn-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8F68] focus-visible:ring-offset-2"
        >
          Book Demo
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={scrollToCallback}
          className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 shadow-landing-card transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#0F8F68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8F68] focus-visible:ring-offset-2"
        >
          Talk to Sales
        </button>
      </div>
    </motion.div>
  );
});
