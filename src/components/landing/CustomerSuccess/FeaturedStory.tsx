import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Play, Star } from 'lucide-react';
import type { FeaturedStoryData } from './customer-success.data';
import { MetricsPanel } from './MetricsPanel';

type FeaturedStoryProps = {
  story: FeaturedStoryData;
};

export const FeaturedStory = memo(function FeaturedStory({ story }: FeaturedStoryProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-[32px] border border-slate-900/[0.06] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
    >
      <div className="grid min-h-[520px] grid-cols-1 lg:grid-cols-[45%_55%]">
        <div className="flex flex-col justify-between p-8 md:p-12">
          <div>
            <div className="flex items-start gap-4">
              <div
                className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0F8F68] to-[#22C55E] text-lg font-bold text-white shadow-[0_8px_24px_rgba(15,143,104,0.25)]"
                aria-hidden="true"
              >
                {story.avatarInitials}
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{story.ownerName}</p>
                <p className="text-sm font-semibold text-[#0F8F68]">{story.company}</p>
                <p className="text-sm text-slate-500">{story.location}</p>
                <p className="mt-0.5 text-xs text-slate-400">{story.designation}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-0.5" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                    aria-hidden="true"
                  />
                ))}
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-[#0F8F68]">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Verified Customer
              </span>
            </div>

            <blockquote className="mt-8 text-xl font-medium leading-[42px] text-slate-800 md:text-2xl">
              &ldquo;{story.quote}&rdquo;
            </blockquote>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0F8F68] px-6 text-sm font-semibold text-white shadow-landing-btn transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-landing-btn-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8F68] focus-visible:ring-offset-2 sm:w-auto"
            >
              Read Full Story
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 shadow-landing-card transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#0F8F68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8F68] focus-visible:ring-offset-2 sm:w-auto"
            >
              <Play className="h-4 w-4 text-[#0F8F68]" aria-hidden="true" />
              Watch Video
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/40 p-6 md:p-8 lg:border-l lg:border-t-0">
          <MetricsPanel data={story} />
        </div>
      </div>
    </motion.article>
  );
});
