import { useRef, useState, useEffect } from 'react';
import { ClientLogos } from './ClientLogos';
import { LiveStatus } from './LiveStatus';
import { MetricCard } from './MetricCard';
import {
  CLIENT_LOGOS,
  TRUST_METRICS,
  TRUST_SECTION_LABEL,
} from './trust-metrics.data';

export function TrustMetrics() {
  const metricsRef = useRef<HTMLDivElement>(null);
  const [metricsInView, setMetricsInView] = useState(false);

  useEffect(() => {
    const node = metricsRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMetricsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className="relative w-full overflow-hidden bg-white font-[Inter,Plus_Jakarta_Sans,system-ui,sans-serif]"
      aria-labelledby="trust-metrics-heading"
    >
      <div className="mx-auto w-full max-w-[1760px] px-4 pt-12 pb-[16px] md:px-8 md:pt-16 md:pb-[24px] lg:px-10 lg:pt-20 lg:pb-[28px]">
        <div className="mx-auto w-full max-w-[1680px]">
          <p
            id="trust-metrics-heading"
            className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#0F8F68]"
          >
            {TRUST_SECTION_LABEL}
          </p>

          <ClientLogos logos={CLIENT_LOGOS} />

          <div className="relative mt-[40px] md:mt-[48px]">
            <div
              className="pointer-events-none absolute inset-0 -z-10 rounded-[28px] bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(15,143,104,0.035),transparent_70%)]"
              aria-hidden="true"
            />

            <div
              ref={metricsRef}
              className="relative rounded-[28px] border border-slate-900/[0.05] bg-white p-10 shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
            >
              <div className="mb-8 flex justify-center lg:absolute lg:right-10 lg:top-10 lg:mb-0">
                <LiveStatus />
              </div>

              <ul className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5">
                {TRUST_METRICS.map((metric, index) => (
                  <li
                    key={metric.id}
                    className={
                      index === TRUST_METRICS.length - 1
                        ? 'col-span-2 md:col-span-1 lg:col-span-1'
                        : undefined
                    }
                  >
                    <MetricCard metric={metric} index={index} animate={metricsInView} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

