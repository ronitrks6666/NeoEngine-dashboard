import type { AttendanceCardData } from '../types';
import { CountUp } from '../shared/CountUp';
import { CircularProgress } from '../shared/CircularProgress';
import { KpiTile, ResponseCardShell } from '../shared/ResponseCardShell';

type Props = {
  data: AttendanceCardData;
  updatedAt?: string;
};

export function AttendanceCard({ data, updatedAt }: Props) {
  return (
    <ResponseCardShell title={data.title} context={data.context} updatedAt={updatedAt}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KpiTile label="Present" value={<CountUp value={data.present} />} accent="emerald" />
        <KpiTile label="Late" value={<CountUp value={data.late} />} accent="amber" />
        <KpiTile label="Absent" value={<CountUp value={data.absent} />} accent="rose" />
        <KpiTile label="On Leave" value={<CountUp value={data.onLeave || 0} />} accent="sky" />
      </div>
      <div className="flex items-center justify-center py-2">
        <CircularProgress value={data.attendancePct} />
      </div>
      {data.trend && (
        <p className="text-center text-xs text-emerald-600 font-medium mt-3">{data.trend}</p>
      )}
    </ResponseCardShell>
  );
}
