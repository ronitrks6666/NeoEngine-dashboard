import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { PricingSlider } from './PricingSlider';
import { BusinessSelector } from './BusinessSelector';
import { BILLING_OPTIONS, SLIDER_CONFIG } from './pricing.data';
import type { PricingState } from './pricing.types';

type PricingCalculatorProps = {
  state: PricingState;
  onChange: (patch: Partial<PricingState>) => void;
};

export const PricingCalculator = memo(function PricingCalculator({
  state,
  onChange,
}: PricingCalculatorProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reducedMotion ? undefined : { y: -4, transition: { duration: 0.22 } }}
      className="rounded-[30px] border border-slate-900/[0.06] bg-white p-8 shadow-[0_16px_48px_rgba(15,23,42,0.05)] md:p-10"
    >
      <h3 className="text-lg font-bold text-slate-900">Pricing Calculator</h3>
      <p className="mt-1 text-sm text-slate-500">
        ₹999/mo for 20 staff · ₹49 per additional staff · 13% off yearly
      </p>

      <div className="mt-8 space-y-8">
        <PricingSlider
          id="pricing-employees"
          label="Staff Count"
          value={state.employees}
          min={SLIDER_CONFIG.employees.min}
          max={SLIDER_CONFIG.employees.max}
          step={SLIDER_CONFIG.employees.step}
          formatValue={(v) => v.toLocaleString('en-IN')}
          onChange={(employees) => onChange({ employees })}
        />

        <PricingSlider
          id="pricing-outlets"
          label="Number of Outlets"
          value={state.outlets}
          min={SLIDER_CONFIG.outlets.min}
          max={SLIDER_CONFIG.outlets.max}
          step={SLIDER_CONFIG.outlets.step}
          onChange={(outlets) => onChange({ outlets })}
        />

        <BusinessSelector
          label="Billing Cycle"
          name="billing-cycle"
          options={BILLING_OPTIONS}
          value={state.billingCycle}
          onChange={(billingCycle) => onChange({ billingCycle })}
        />
      </div>
    </motion.div>
  );
});
