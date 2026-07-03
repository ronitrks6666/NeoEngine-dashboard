import { User } from 'lucide-react';
import type { EmployeeCardData } from '../types';
import { CountUp } from '../shared/CountUp';
import { KpiTile, ResponseCardShell } from '../shared/ResponseCardShell';

type Props = {
  data: EmployeeCardData;
  updatedAt?: string;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function EmployeeCard({ data, updatedAt }: Props) {
  const mode = data.cardMode || (typeof data.presentDays === 'number' ? 'attendance' : 'attendance');
  const statusColor =
    mode === 'payroll'
      ? 'text-sky-700 bg-sky-50 border-sky-100'
      : mode === 'summary'
        ? 'text-violet-700 bg-violet-50 border-violet-100'
        : /present/i.test(data.status) && !/absent/i.test(data.status)
          ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
          : /absent/i.test(data.status)
            ? 'text-rose-700 bg-rose-50 border-rose-100'
            : 'text-amber-700 bg-amber-50 border-amber-100';

  return (
    <ResponseCardShell title={data.title} context={data.context} updatedAt={updatedAt}>
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
          <User className="h-7 w-7 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-semibold text-gray-900 truncate">{data.name}</h4>
          {data.role && <p className="text-sm text-gray-500">{data.role}</p>}
          {mode === 'attendance' && (
            <span className={`inline-flex mt-2 px-2.5 py-1 rounded-lg text-xs font-medium border capitalize ${statusColor}`}>
              {data.status}
            </span>
          )}
        </div>
      </div>

      {mode === 'payroll' && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <KpiTile label="Net Payable" value={formatCurrency(data.netPayable || 0)} accent="emerald" />
          <KpiTile label="Gross Earned" value={formatCurrency(data.grossEarned || 0)} accent="sky" />
          <KpiTile label="Paid" value={formatCurrency(data.paidAmount || 0)} accent="violet" />
          <KpiTile label="Remaining" value={formatCurrency(data.remainingAmount || 0)} accent="amber" />
          <KpiTile label="Hours Worked" value={Number(data.hoursWorked || 0).toFixed(1)} accent="emerald" />
        </div>
      )}

      {mode === 'summary' && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <KpiTile label="Present Days" value={<CountUp value={data.presentDays || 0} />} accent="emerald" />
          <KpiTile label="Late Days" value={<CountUp value={data.lateDays || 0} />} accent="amber" />
          <KpiTile label="Tasks Pending" value={<CountUp value={data.tasksPending || 0} />} accent="rose" />
          <KpiTile label="Tasks Done" value={<CountUp value={data.tasksCompleted || 0} />} accent="sky" />
          <KpiTile label="Escalated" value={<CountUp value={data.tasksEscalated || 0} />} accent="violet" />
          <KpiTile label="Net Payable" value={formatCurrency(data.netPayable || 0)} accent="emerald" />
        </div>
      )}

      {mode === 'attendance' && typeof data.presentDays === 'number' && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <KpiTile label="Present Days" value={<CountUp value={data.presentDays} />} accent="emerald" />
          <KpiTile label="Period" value={data.context.period || '—'} accent="sky" />
        </div>
      )}

      {data.periodLabel && <p className="text-xs text-gray-500 mt-4">Period: {data.periodLabel}</p>}
    </ResponseCardShell>
  );
}
