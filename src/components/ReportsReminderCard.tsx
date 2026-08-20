import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useOutletStore } from '@/stores/outletStore';
import { analyticsApi } from '@/api/analytics';

export function ReportsReminderCard() {
  const { selectedOutletId } = useOutletStore();

  const { data } = useQuery({
    queryKey: ['scheduled-reports', selectedOutletId],
    queryFn: () => analyticsApi.getScheduledReports(selectedOutletId!),
    enabled: !!selectedOutletId,
    staleTime: 5 * 60 * 1000,
  });

  const reports = data?.data ?? data;
  const weeklyReady = reports?.weekly?.ready === true;
  const monthlyReady = reports?.monthly?.ready === true;
  const hasReadyReport = weeklyReady || monthlyReady;

  if (!selectedOutletId) return null;

  return (
    <Link
      to="/owner/reports"
      className="group block mb-8 rounded-2xl overflow-hidden shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-900/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-900/15 hover:-translate-y-0.5"
    >
      <div className="relative bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 px-6 py-6 sm:px-8 sm:py-7 text-white overflow-hidden">
        {/* Decorative background */}
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-6 bottom-0 h-32 w-32 rounded-full bg-cyan-400/20 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-1/4 top-1/2 h-24 w-24 rounded-full bg-emerald-300/10"
          aria-hidden
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
                Analytics
              </span>
              {hasReadyReport ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-950 shadow-sm animate-pulse">
                  New report ready
                </span>
              ) : null}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Weekly &amp; monthly reports
            </h2>
            <p className="mt-2 text-sm sm:text-base text-emerald-50/90 leading-relaxed max-w-xl">
              Review outlet performance, attendance, and tasks — all in one place.
            </p>

            {hasReadyReport ? (
              <p className="mt-3 text-sm font-medium text-amber-200">A new report is ready to download.</p>
            ) : null}
          </div>

          <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-800 shadow-md transition-all duration-300 group-hover:bg-emerald-50 group-hover:gap-3">
              Open Reports
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
