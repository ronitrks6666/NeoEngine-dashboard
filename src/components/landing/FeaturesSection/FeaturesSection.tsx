import { memo, useMemo } from 'react';
import { FeatureCard } from './FeatureCard';
import { BENTO_FEATURES, FEATURES_DESCRIPTION, FEATURES_EYEBROW, FEATURES_HEADING } from './features-section.data';
import { AnalyticsIllustration } from './illustrations/AnalyticsIllustration';
import { AttendanceIllustration } from './illustrations/AttendanceIllustration';
import { InventoryIllustration } from './illustrations/InventoryIllustration';
import { PayrollIllustration } from './illustrations/PayrollIllustration';
import { TaskAutomationIllustration } from './illustrations/TaskAutomationIllustration';
import { WorkforceIllustration } from './illustrations/WorkforceIllustration';

const ILLUSTRATIONS = {
  workforce: WorkforceIllustration,
  tasks: TaskAutomationIllustration,
  attendance: AttendanceIllustration,
  payroll: PayrollIllustration,
  inventory: InventoryIllustration,
  analytics: AnalyticsIllustration,
} as const;

export function FeaturesSection() {
  const features = useMemo(() => BENTO_FEATURES, []);

  return (
    <section
      id="product"
      className="w-full scroll-mt-[90px] bg-[#FAFAFA] font-[Inter,Plus_Jakarta_Sans,system-ui,sans-serif]"
      aria-labelledby="features-section-heading"
    >
      <div className="mx-auto w-full max-w-[1760px] px-4 py-[36px] md:px-8 md:py-[48px] lg:px-10 lg:py-[56px]">
        <div className="mx-auto w-full max-w-[1680px]">
          <header className="mx-auto w-full max-w-[1200px] text-center">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.12em] text-[#0F8F68]">
              {FEATURES_EYEBROW}
            </p>
            <h2
              id="features-section-heading"
              className="text-[36px] font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-[48px] lg:text-[60px]"
            >
              <span className="block">{FEATURES_HEADING.line1}</span>
              <span className="block">
                {FEATURES_HEADING.line2Prefix}
                <span className="text-[#0F8F68]">{FEATURES_HEADING.line2Highlight}</span>
                {FEATURES_HEADING.line2Suffix}
              </span>
            </h2>
            <p className="mx-auto mt-7 max-w-[900px] text-lg leading-8 text-slate-600">
              {FEATURES_DESCRIPTION}
            </p>
          </header>

          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12">
            {features.map((feature, index) => {
              const Illustration = ILLUSTRATIONS[feature.illustration];
              return (
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  index={index}
                  illustration={<Illustration />}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export const MemoizedFeaturesSection = memo(FeaturesSection);

