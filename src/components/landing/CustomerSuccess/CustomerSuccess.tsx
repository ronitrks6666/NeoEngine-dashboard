import { memo } from 'react';
import { FeaturedStory } from './FeaturedStory';
import { SuccessCard } from './SuccessCard';
import { VideoCard } from './VideoCard';
import { LogoStrip } from './LogoStrip';
import {
  BRAND_LOGOS,
  FEATURED_STORY,
  SECTION_COPY,
  SUCCESS_STORIES,
} from './customer-success.data';
import { useInViewOnce } from './useInViewOnce';

export function CustomerSuccess() {
  const { ref: gridRef, inView: gridInView } = useInViewOnce<HTMLDivElement>();

  const gridStories = SUCCESS_STORIES.filter((s) => !s.isVideo);
  const videoStory = SUCCESS_STORIES.find((s) => s.isVideo);

  return (
    <section
      id="stories"
      className="w-full scroll-mt-[90px] bg-white font-[Inter,Plus_Jakarta_Sans,system-ui,sans-serif]"
      aria-labelledby="customer-success-heading"
    >
      <div className="mx-auto w-full max-w-[1760px] px-4 py-[36px] md:px-8 md:py-[48px] lg:px-10 lg:py-[56px]">
        <div className="mx-auto w-full max-w-[1680px]">
          <header className="mx-auto w-full max-w-[1200px] text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0F8F68]">
              {SECTION_COPY.eyebrow}
            </p>
            <h2
              id="customer-success-heading"
              className="mt-6 text-[36px] font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-[48px] lg:text-[60px]"
            >
              <span className="block">{SECTION_COPY.heading.line1}</span>
              <span className="block">
                {SECTION_COPY.heading.line2}
                <span className="text-[#0F8F68]">{SECTION_COPY.heading.highlight}</span>
                {SECTION_COPY.heading.line2Suffix}
              </span>
            </h2>
            <p className="mx-auto mt-7 max-w-[920px] text-lg leading-8 text-slate-600">
              {SECTION_COPY.description}
            </p>
          </header>

          <div className="mt-16">
            <FeaturedStory story={FEATURED_STORY} />
          </div>

          <div
            ref={gridRef}
            className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {gridStories.map((story, index) => (
              <SuccessCard key={story.id} story={story} index={index} animate={gridInView} />
            ))}
            {videoStory && <VideoCard story={videoStory} index={gridStories.length} />}
          </div>

          <LogoStrip logos={BRAND_LOGOS} />
        </div>
      </div>
    </section>
  );
}

export const MemoizedCustomerSuccess = memo(CustomerSuccess);

