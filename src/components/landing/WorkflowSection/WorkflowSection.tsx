import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, ClipboardCheck, BarChart3 } from 'lucide-react';
import { WorkflowStep } from './WorkflowStep';
import { WorkflowConnector } from './WorkflowConnector';
import { SECTION_COPY } from './workflow.data';
import { OnboardingIllustration } from './illustrations/OnboardingIllustration';
import { OperationsIllustration } from './illustrations/OperationsIllustration';
import { InsightsIllustration } from './illustrations/InsightsIllustration';
import type { WorkflowStepData } from './workflow.data';

const STEPS: WorkflowStepData[] = [
  {
    step: 1,
    title: 'Onboarding',
    description: 'Add outlets, roles, staff and managers within minutes. Set shift timings, define SOPs, and assign checklists before day one.',
    icon: Building2,
    illustration: OnboardingIllustration,
  },
  {
    step: 2,
    title: 'Operations',
    description: 'Manage attendance, daily checklists, payroll and operations in real time. Auto-verify punches, calculate wages, and track every shift across outlets.',
    icon: ClipboardCheck,
    illustration: OperationsIllustration,
  },
  {
    step: 3,
    title: 'Insights',
    description: 'Track performance, identify bottlenecks and make smarter decisions.',
    icon: BarChart3,
    illustration: InsightsIllustration,
  },
];

export function WorkflowSection() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineInView, setTimelineInView] = useState(false);
  const steps = useMemo(() => STEPS, []);

  useEffect(() => {
    const node = timelineRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimelineInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className="relative w-full overflow-hidden bg-white font-[Inter,Plus_Jakarta_Sans,system-ui,sans-serif]"
      aria-labelledby="workflow-section-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_40%,rgba(15,143,104,0.025),transparent_70%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.02),transparent_70%)]"
        aria-hidden="true"
      />

      <div className="mx-auto w-full max-w-[1760px] px-4 py-[36px] md:px-8 md:py-[48px] lg:px-10 lg:py-[56px]">
        <div className="mx-auto w-full max-w-[1680px]">
          <header className="mx-auto w-full text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0F8F68]">
              {SECTION_COPY.eyebrow}
            </p>
            <h2
              id="workflow-section-heading"
              className="mx-auto mt-6 max-w-[1100px] text-balance text-[38px] font-extrabold leading-[1.12] tracking-tight text-slate-900 sm:text-[44px] md:text-[52px] lg:text-[60px]"
            >
              <span className="block">{SECTION_COPY.heading.line1}</span>
              <span className="block">
                {SECTION_COPY.heading.line2}
                <span className="text-[#0F8F68]">{SECTION_COPY.heading.highlight}</span>
                {SECTION_COPY.heading.line2Suffix}
              </span>
            </h2>
            <p className="mx-auto mt-7 max-w-[960px] text-lg leading-8 text-slate-600 md:text-xl md:leading-9">
              {SECTION_COPY.description}
            </p>
          </header>

          <div ref={timelineRef} className="mt-16 lg:mt-20">
            <div className="hidden gap-5 xl:gap-8 lg:grid lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
              {steps.map((step, index) => (
                <Fragment key={step.step}>
                  <WorkflowStep data={step} index={index} variant="desktop" />
                  {index < steps.length - 1 && (
                    <WorkflowConnector
                      orientation="horizontal"
                      animate={timelineInView}
                      index={index}
                    />
                  )}
                </Fragment>
              ))}
            </div>

            <div className="flex flex-col items-center gap-12 lg:hidden">
              {steps.map((step, index) => (
                <Fragment key={step.step}>
                  <WorkflowStep data={step} index={index} />
                  {index < steps.length - 1 && (
                    <WorkflowConnector
                      orientation="vertical"
                      animate={timelineInView}
                      index={index}
                    />
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const MemoizedWorkflowSection = memo(WorkflowSection);

