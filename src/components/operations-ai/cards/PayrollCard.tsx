import type { PayrollCardData } from '../types';
import { CountUp } from '../shared/CountUp';
import { KpiTile, ResponseCardShell } from '../shared/ResponseCardShell';

type Props = {
  data: PayrollCardData;
  updatedAt?: string;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function PayrollCard({ data, updatedAt }: Props) {
  return (
    <ResponseCardShell title={data.title} context={data.context} updatedAt={updatedAt}>
      <div className="grid grid-cols-2 gap-3">
        <KpiTile label="Gross Salary" value={formatCurrency(data.grossSalary || data.netSalary)} accent="sky" />
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 col-span-2 sm:col-span-1">
          <p className="text-xs font-medium text-emerald-700">Net Pay</p>
          <p className="text-2xl font-bold text-emerald-800 mt-1">
            <CountUp value={data.netSalary} />
          </p>
        </div>
        <KpiTile label="Deductions" value={formatCurrency(data.deductions || 0)} accent="rose" />
        <KpiTile label="Bonus" value={formatCurrency(data.bonus || 0)} accent="violet" />
        <KpiTile label="Overtime" value={formatCurrency(data.overtime || 0)} accent="amber" />
        <KpiTile label="Records" value={data.recordsCount ?? 0} accent="emerald" />
      </div>
      {data.periodLabel && (
        <p className="text-xs text-gray-500 mt-4">Period: {data.periodLabel}</p>
      )}
    </ResponseCardShell>
  );
}
