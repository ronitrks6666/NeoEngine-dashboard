import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FeatureList } from './FeatureList';
import { StoreButtons } from './StoreButtons';
import { SalesLeadForm } from './SalesLeadForm';
import { SECTION_COPY } from './download-app.data';

export const DownloadAppSection = memo(function DownloadAppSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      id="download"
      className="relative w-full scroll-mt-[90px] overflow-hidden bg-gradient-to-b from-[#0F8F68] to-[#0A7A59] font-[Inter,Plus_Jakarta_Sans,system-ui,sans-serif]"
      aria-labelledby="download-app-heading"
    >
      {/* Background decorations */}
      <div
        className="pointer-events-none absolute -left-32 top-0 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06),transparent_70%)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.05),transparent_70%)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
        aria-hidden="true"
      />
      <div className="download-app-particles pointer-events-none absolute inset-0" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} />
        ))}
      </div>

      <div className="relative mx-auto w-full max-w-[1760px] px-4 py-[48px] md:px-8 md:py-[56px] lg:px-10 lg:py-[72px]">
        <div className="mx-auto grid w-full max-w-[1680px] grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-20">

          {/* Left — copy + app download */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-48px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center lg:text-left"
          >
            <span className="inline-flex rounded-full bg-white/12 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white">
              {SECTION_COPY.eyebrow}
            </span>

            <h2
              id="download-app-heading"
              className="mt-6 whitespace-pre-line text-[36px] font-extrabold leading-[1.1] tracking-tight text-white md:text-[48px] lg:text-[52px]"
            >
              {SECTION_COPY.heading}
            </h2>

            <p className="mx-auto mt-6 max-w-[520px] text-lg leading-8 text-white/85 lg:mx-0">
              {SECTION_COPY.description}
            </p>

            <FeatureList />

            <div className="mt-10 flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:justify-start">
              <StoreButtons />
            </div>
          </motion.div>

          {/* Right — contact / callback form */}
          <div className="flex w-full items-center justify-center py-4 lg:py-0">
            <div className="w-full max-w-[480px]">
              <SalesLeadForm />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
});
