import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { KPIGrid } from './KPIGrid';
import { OperationsChart } from './OperationsChart';
import { ActivityFeed } from './ActivityFeed';
import { QuickActions } from './QuickActions';
import { HERO_DURATION, HERO_EASE } from '@/components/landing/hero.motion';
import {
  ACTIVITY_ITEMS,
  CHART_LABELS,
  CHART_SERIES,
  KPI_METRICS,
  QUICK_ACTIONS,
  SIDEBAR_NAV,
} from './dashboard.data';

export const HeroDashboard = memo(function HeroDashboard() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="landing-hero-dashboard-scale relative z-10 mx-auto w-full min-[992px]:w-[min(100%,720px)] min-[1200px]:w-[820px] min-[1536px]:w-[900px]">
      <motion.div
        className="landing-hero-dashboard-float w-full"
        aria-hidden="true"
        initial={reducedMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : HERO_DURATION, delay: reducedMotion ? 0 : 0.2, ease: HERO_EASE }}
      >
        <div className="landing-hero-dashboard-tilt">
          <div className="relative h-auto min-h-[500px] overflow-hidden rounded-3xl border border-slate-900/[0.06] bg-white p-4 shadow-landing-dashboard ring-1 ring-white/80 sm:min-h-[520px] min-[992px]:h-[560px] min-[992px]:min-h-[560px] min-[1200px]:h-[600px] min-[1200px]:min-h-[600px] min-[1200px]:rounded-[30px] min-[1200px]:p-6">
            <div className="flex h-full gap-4 min-[1200px]:gap-6">
              <DashboardSidebar items={SIDEBAR_NAV} />

              <div className="flex min-w-0 flex-1 flex-col overflow-hidden font-[Inter,Plus_Jakarta_Sans,system-ui,sans-serif]">
                <DashboardHeader />

                <div className="mb-4 shrink-0">
                  <KPIGrid metrics={KPI_METRICS} />
                </div>

                <div className="mb-4 grid min-h-0 flex-1 grid-cols-1 gap-4 min-[1200px]:grid-cols-[65%_35%]">
                  <OperationsChart labels={CHART_LABELS} series={CHART_SERIES} />
                  <ActivityFeed items={ACTIVITY_ITEMS} />
                </div>

                <div className="shrink-0">
                  <QuickActions actions={QUICK_ACTIONS} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

