import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { TasksCardData } from '../types';
import { CountUp } from '../shared/CountUp';
import { KpiTile, ResponseCardShell } from '../shared/ResponseCardShell';

const COLORS = ['#F59E0B', '#059669', '#EF4444'];

type Props = {
  data: TasksCardData;
  updatedAt?: string;
};

export function TasksCard({ data, updatedAt }: Props) {
  const chartData = [
    { name: 'Pending', value: data.pending },
    { name: 'Completed', value: data.completed },
    { name: 'Escalated', value: data.escalated },
  ].filter((d) => d.value > 0);

  return (
    <ResponseCardShell title={data.title} context={data.context} updatedAt={updatedAt}>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-4 items-center">
        <div className="h-44">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={3}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">No task data</div>
          )}
        </div>
        <div className="space-y-2">
          <KpiTile label="Pending" value={<CountUp value={data.pending} />} accent="amber" />
          <KpiTile label="Completed" value={<CountUp value={data.completed} />} accent="emerald" />
          <KpiTile label="Escalated" value={<CountUp value={data.escalated} />} accent="rose" />
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-emerald-800">Completion</span>
        <span className="text-2xl font-bold text-emerald-700">
          <CountUp value={data.completionPct} suffix="%" />
        </span>
      </div>
    </ResponseCardShell>
  );
}
