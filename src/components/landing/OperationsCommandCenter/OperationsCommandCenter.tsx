import { memo, useMemo } from 'react';
import { IndiaMap } from './IndiaMap';
import { OperationsHealth } from './OperationsHealth';
import { ActivityTimeline } from './ActivityTimeline';
import { AIInsights } from './AIInsights';
import { ACTIVITY_EVENTS, AI_INSIGHTS, SECTION_COPY } from './operations.data';

export function OperationsCommandCenter() {
  const copy = useMemo(() => SECTION_COPY, []);

  return (
    <section
      className="w-full bg-white font-[Inter,Plus_Jakarta_Sans,system-ui,sans-serif]"
      aria-labelledby="operations-command-heading"
    >
      <div className="mx-auto w-full max-w-[1760px] px-4 py-[36px] md:px-8 md:py-[48px] lg:px-10 lg:py-[56px]">
        <div className="mx-auto w-full max-w-[1680px]">
          <header className="order-2 mb-0 hidden text-center lg:order-none lg:mb-14 lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0F8F68]">
              {copy.eyebrow}
            </p>
            <h2
              id="operations-command-heading"
              className="mt-6 text-balance text-[36px] font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-[48px] lg:text-[60px]"
            >
              <span className="block">{copy.heading.line1}</span>
              <span className="block text-[#0F8F68]">{copy.heading.highlight}</span>
            </h2>
            <p className="mx-auto mt-7 max-w-[720px] text-lg leading-8 text-slate-600">{copy.description}</p>
          </header>

          <div className="flex flex-col gap-12 lg:grid lg:grid-cols-[45%_55%] lg:items-start lg:gap-x-14 lg:gap-y-12">
            <div className="order-1 flex w-full flex-col gap-12">
              <IndiaMap />
              <AIInsights insights={AI_INSIGHTS} />
            </div>

            <div className="order-2 flex w-full flex-col gap-12 lg:order-2">
              <header className="text-center lg:hidden">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0F8F68]">
                  {copy.eyebrow}
                </p>
                <h2 className="mt-6 text-balance text-[36px] font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-[48px]">
                  <span className="block">{copy.heading.line1}</span>
                  <span className="block text-[#0F8F68]">{copy.heading.highlight}</span>
                </h2>
                <p className="mx-auto mt-7 max-w-[560px] text-lg leading-8 text-slate-600">
                  {copy.description}
                </p>
              </header>

              <div className="flex flex-col gap-6">
                <OperationsHealth />
                <ActivityTimeline events={ACTIVITY_EVENTS} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const MemoizedOperationsCommandCenter = memo(OperationsCommandCenter);

