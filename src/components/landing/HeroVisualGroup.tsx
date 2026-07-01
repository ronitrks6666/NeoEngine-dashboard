import { memo } from 'react';
import { HeroDashboard } from '@/components/landing/HeroDashboard/HeroDashboard';
import { HeroMobileMockup } from '@/components/landing/HeroMobileMockup/HeroMobileMockup';

export const HeroVisualGroup = memo(function HeroVisualGroup() {
  return (
    <div className="landing-hero-visual-group relative ml-auto w-full pb-0 min-[1200px]:translate-x-16">
      <div className="landing-hero-device-surface pointer-events-none" aria-hidden="true" />
      <div className="relative flex flex-col items-center gap-8 max-[991px]:gap-8 min-[992px]:flex-row min-[992px]:items-end min-[992px]:justify-end min-[992px]:gap-6 min-[1200px]:gap-8">
        <div className="order-2 w-full min-[992px]:order-1 min-[992px]:w-auto">
          <HeroMobileMockup />
        </div>
        <div className="order-1 w-full min-[992px]:order-2 min-[992px]:w-auto">
          <HeroDashboard />
        </div>
      </div>
    </div>
  );
});
