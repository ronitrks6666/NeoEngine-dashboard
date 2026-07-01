import { memo, useMemo } from 'react';
import { PricingCards } from './PricingCards';
import { SECTION_COPY } from './pricing.data';

export function PricingSection() {
  const copy = useMemo(() => SECTION_COPY, []);

  return (
    <section
      id="pricing"
      className="w-full scroll-mt-[90px] bg-[#F8FAFC] font-[Inter,Plus_Jakarta_Sans,system-ui,sans-serif]"
      aria-labelledby="pricing-section-heading"
    >
      <div className="mx-auto w-full max-w-[1760px] px-4 py-[36px] md:px-8 md:py-[48px] lg:px-10 lg:py-[56px]">
        <div className="mx-auto w-full max-w-[1680px]">
          <header className="mx-auto w-full max-w-[1100px] text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0F8F68]">
              {copy.eyebrow}
            </p>
            <h2
              id="pricing-section-heading"
              className="mt-6 text-[36px] font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-[48px] lg:text-[60px]"
            >
              <span className="block">
                {copy.heading.line1}
                <span className="text-[#0F8F68]">{copy.heading.highlight}</span>
                {copy.heading.line1Suffix}
              </span>
              <span className="block">{copy.heading.line2}</span>
            </h2>
            <p className="mx-auto mt-7 max-w-[880px] text-lg leading-8 text-slate-600">
              {copy.description}
            </p>
          </header>

          <PricingCards />
        </div>
      </div>
    </section>
  );
}

export const MemoizedPricingSection = memo(PricingSection);
