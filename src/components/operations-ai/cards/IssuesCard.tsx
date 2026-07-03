import type { IssuesCardData } from '../types';
import { CountUp } from '../shared/CountUp';
import { KpiTile, ResponseCardShell } from '../shared/ResponseCardShell';

type Props = {
  data: IssuesCardData;
  updatedAt?: string;
};

function severityForIndex(i: number) {
  if (i === 0) return { label: 'High', className: 'bg-rose-50 text-rose-700 border-rose-100' };
  if (i === 1) return { label: 'Medium', className: 'bg-amber-50 text-amber-700 border-amber-100' };
  return { label: 'Low', className: 'bg-sky-50 text-sky-700 border-sky-100' };
}

export function IssuesCard({ data, updatedAt }: Props) {
  return (
    <ResponseCardShell title={data.title} context={data.context} updatedAt={updatedAt}>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KpiTile label="Open" value={<CountUp value={data.open} />} accent="rose" />
        <KpiTile label="Resolved" value={<CountUp value={data.resolved} />} accent="emerald" />
        <KpiTile label="Closed" value={<CountUp value={data.closed} />} accent="sky" />
      </div>
      {data.recent.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Issues</p>
          {data.recent.map((issue, i) => {
            const sev = severityForIndex(i);
            return (
              <div key={`${issue.number || i}-${issue.title}`} className="rounded-xl border border-gray-100 px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {issue.number ? `#${issue.number} ` : ''}
                    {issue.title}
                  </p>
                </div>
                <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sev.className}`}>
                  {sev.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </ResponseCardShell>
  );
}
