import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { TaskListCardData } from '../types';
import { ResponseCardShell } from '../shared/ResponseCardShell';

type Props = {
  data: TaskListCardData;
  updatedAt?: string;
};

export function TaskListCard({ data, updatedAt }: Props) {
  const label =
    data.listType === 'escalated'
      ? 'Escalated Tasks'
      : data.listType === 'pending'
        ? 'Pending Tasks'
        : 'Completed Tasks';

  const Icon =
    data.listType === 'escalated' ? AlertTriangle : data.listType === 'pending' ? Clock : CheckCircle2;

  return (
    <ResponseCardShell title={label} context={data.context} updatedAt={updatedAt}>
      <div className="mb-3">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{data.total}</span> tasks found
        </p>
      </div>
      {data.tasks.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center rounded-xl bg-gray-50">No tasks in this category.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {data.tasks.map((task, i) => (
            <div
              key={`${task.title}-${task.employeeName}-${i}`}
              className="flex items-start gap-3 rounded-xl border border-gray-100 px-3 py-2.5 hover:bg-emerald-50/40 transition-colors"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  data.listType === 'escalated'
                    ? 'bg-rose-50 text-rose-600'
                    : data.listType === 'pending'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{task.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">Assigned: {task.employeeName}</p>
                {(task.escalationLevel ?? 0) > 0 && (
                  <span className="inline-flex mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                    Level {task.escalationLevel}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {data.total > data.tasks.length && (
        <p className="text-xs text-gray-400 mt-3">+{data.total - data.tasks.length} more not shown</p>
      )}
    </ResponseCardShell>
  );
}
