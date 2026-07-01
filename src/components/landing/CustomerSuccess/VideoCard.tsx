import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Play } from 'lucide-react';
import type { SuccessStory } from './customer-success.data';
import { useInViewOnce } from './useInViewOnce';

type VideoCardProps = {
  story: SuccessStory;
  index: number;
};

export const VideoCard = memo(function VideoCard({ story, index }: VideoCardProps) {
  const reducedMotion = useReducedMotion();
  const { ref, inView } = useInViewOnce<HTMLElement>();

  return (
    <motion.article
      ref={ref}
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-32px' }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reducedMotion ? undefined : { y: -6, transition: { duration: 0.22 } }}
      className="group relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-[24px] border border-slate-900/[0.06] bg-slate-900 shadow-[0_16px_48px_rgba(15,23,42,0.12)]"
    >
      {inView && (
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(15,143,104,0.15),transparent_55%),linear-gradient(135deg,#0f172a_0%,#1e293b_50%,#0f8f68_100%)]"
          aria-hidden="true"
        />
      )}

      <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" aria-hidden="true" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-8 text-center">
        <button
          type="button"
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-md transition-transform duration-300 group-hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          aria-label={`Play video testimonial from ${story.restaurant}`}
        >
          <Play className="ml-1 h-7 w-7 fill-white" aria-hidden="true" />
        </button>

        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
          Video Testimonial
        </p>
        <h3 className="mt-2 text-lg font-bold text-white">{story.restaurant}</h3>
        <p className="mt-1 text-sm text-white/70">{story.location}</p>
        <p className="mt-4 max-w-[240px] text-sm leading-relaxed text-white/80">
          {story.quote}
        </p>
      </div>

      <div className="relative z-10 border-t border-white/10 bg-white/10 px-6 py-4 backdrop-blur-md">
        <p className="text-center text-xs font-medium text-white/90">
          <span className="font-bold text-white">{story.bigMetric.value}</span>{' '}
          {story.bigMetric.label}
        </p>
      </div>
    </motion.article>
  );
});
