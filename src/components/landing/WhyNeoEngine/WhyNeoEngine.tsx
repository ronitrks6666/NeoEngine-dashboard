import { memo, useMemo } from 'react';
import { TraditionalStack } from './TraditionalStack';
import { NeoEngineHub } from './NeoEngineHub';
import { ComparisonTable } from './ComparisonTable';
import { SECTION_COPY } from './why-neoengine.data';

export function WhyNeoEngine() {
  const copy = useMemo(() => SECTION_COPY, []);

  return (
    <section
      id="solutions"
      className="w-full scroll-mt-[90px] bg-[#F8FAFC] font-[Inter,Plus_Jakarta_Sans,system-ui,sans-serif]"
      aria-labelledby="why-neoengine-heading"
    >
      <div className="mx-auto w-full max-w-[1760px] px-4 py-[36px] md:px-8 md:py-[48px] lg:px-10 lg:py-[56px]">
        <div className="mx-auto w-full max-w-[1680px]">
          <header className="mx-auto w-full text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0F8F68]">
              {copy.eyebrow}
            </p>
            <h2
              id="why-neoengine-heading"
              className="mt-6 text-balance text-[36px] font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-[48px] lg:text-[60px]"
            >
              <span className="block">{copy.heading.line1}</span>
              <span className="block">
                {copy.heading.line2}
                <span className="text-[#0F8F68]">{copy.heading.highlight}</span>
                {copy.heading.line2Suffix}
              </span>
            </h2>
            <p className="mx-auto mt-7 max-w-[920px] text-lg leading-8 text-slate-600">
              {copy.description}
            </p>
          </header>

          <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-[45%_55%] lg:gap-12">
            <TraditionalStack />
            <NeoEngineHub />
          </div>

          <ComparisonTable />
        </div>
      </div>
    </section>
  );
}

export const MemoizedWhyNeoEngine = memo(WhyNeoEngine);

