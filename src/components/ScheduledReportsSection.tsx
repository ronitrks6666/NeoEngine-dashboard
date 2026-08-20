import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Calendar, FileBarChart, Loader2 } from 'lucide-react';
import { analyticsApi } from '@/api/analytics';
import { downloadAnalyticsReportXlsx } from '@/utils/analyticsExport';
import { LoadingSpinner } from '@/components/LoadingSpinner';

type ScheduledReportsSectionProps = {
  outletId: string | null;
  compact?: boolean;
};

type ReportKind = 'weekly' | 'monthly';

const TZ = 'Asia/Kolkata';

function formatPeriod(start?: string, end?: string) {
  if (!start || !end) return '—';
  try {
    const s = new Date(`${start}T12:00:00+05:30`);
    const e = new Date(`${end}T12:00:00+05:30`);
    const sameMonth = start.slice(0, 7) === end.slice(0, 7);
    if (sameMonth) {
      const startDay = s.toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric' });
      const endPart = e.toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
      return `${startDay} – ${endPart}`;
    }
    const a = s.toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
    const b = e.toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
    return `${a} – ${b}`;
  } catch {
    return `${start} – ${end}`;
  }
}

export function ScheduledReportsSection({ outletId, compact = false }: ScheduledReportsSectionProps) {
  const [downloading, setDownloading] = useState<ReportKind | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['scheduled-reports', outletId],
    queryFn: () => analyticsApi.getScheduledReports(outletId!),
    enabled: !!outletId,
  });

  const reports = data?.data ?? data;
  const weekly = reports?.weekly;
  const monthly = reports?.monthly;

  const handleDownload = async (kind: ReportKind) => {
    if (!outletId || downloading) return;
    const report = kind === 'weekly' ? weekly : monthly;
    if (!report?.startDate || !report?.endDate) return;

    setDownloading(kind);
    try {
      const exportResponse = await analyticsApi.getOutletAnalytics(outletId, {
        period: 'custom',
        startDate: report.startDate,
        endDate: report.endDate,
      });
      const payload = exportResponse?.data ?? exportResponse ?? {};
      downloadAnalyticsReportXlsx({
        payload,
        exportLabel: kind === 'weekly' ? 'Scheduled weekly report' : 'Scheduled monthly report',
        dateRangeLabel: `${report.startDate} to ${report.endDate}`,
        filenameSlug: `${kind}-${report.startDate}_to_${report.endDate}`,
      });
    } finally {
      setDownloading(null);
    }
  };

  if (!outletId) return null;

  if (isLoading) {
    return (
      <div className={compact ? 'py-6' : 'py-10'}>
        <LoadingSpinner />
      </div>
    );
  }

  const items: {
    kind: ReportKind;
    title: string;
    when: string;
    report: typeof weekly;
    icon: typeof Calendar;
  }[] = [
    { kind: 'weekly', title: 'Weekly report', when: 'Check every Monday', report: weekly, icon: Calendar },
    { kind: 'monthly', title: 'Monthly report', when: 'Check on the 1st of each month', report: monthly, icon: FileBarChart },
  ];

  return (
    <section className={compact ? '' : 'mb-10'}>
      {!compact && (
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Scheduled reports</h2>
          <p className="text-sm text-gray-500 mt-1">
            Same data as Analytics → Export Report. Download when you need it.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map(({ kind, title, when, report, icon: Icon }) => {
          const ready = report?.ready === true;
          const busy = downloading === kind;

          return (
            <div
              key={kind}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{when}</p>
                  </div>
                </div>
                {ready && (
                  <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    Ready
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-1">Period</p>
              <p className="text-base font-medium text-gray-900 mb-4">
                {formatPeriod(report?.startDate, report?.endDate)}
              </p>

              <button
                type="button"
                onClick={() => void handleDownload(kind)}
                disabled={!!downloading}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download report
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
