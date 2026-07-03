import type { LeaveCardData } from '../types';
import { CountUp } from '../shared/CountUp';
import { KpiTile, ResponseCardShell } from '../shared/ResponseCardShell';

type Props = {
  data: LeaveCardData;
  updatedAt?: string;
};

export function LeaveCard({ data, updatedAt }: Props) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date().getDay();
  const start = today === 0 ? 6 : today - 1;

  return (
    <ResponseCardShell title={data.title} context={data.context} updatedAt={updatedAt}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <KpiTile label="On Leave" value={<CountUp value={data.onLeave} />} accent="sky" />
        <KpiTile label="Pending" value={<CountUp value={data.pending} />} accent="amber" />
        <KpiTile label="Approved" value={<CountUp value={data.approved} />} accent="emerald" />
        <KpiTile label="Rejected" value={<CountUp value={data.rejected} />} accent="rose" />
      </div>
      <div className="flex gap-1.5">
        {days.map((d, i) => {
          const idx = (start + i) % 7;
          const active = i === 0;
          return (
            <div
              key={d}
              className={`flex-1 rounded-xl border px-1 py-2 text-center text-[10px] font-medium ${
                active ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-100 text-gray-400'
              }`}
            >
              {days[idx]}
            </div>
          );
        })}
      </div>
    </ResponseCardShell>
  );
}
