import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Clock,
  ListTodo,
} from 'lucide-react';
import { taskApi, type ManagerTaskItem } from '@/api/task';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { MyTaskDetailDialog } from '@/components/tasks/MyTaskDetailDialog';

function formatDueLabel(task: ManagerTaskItem) {
  if (task.dueAt) {
    try {
      return `Due ${format(parseISO(task.dueAt), 'h:mm a')}`;
    } catch {
      return null;
    }
  }
  if (task.startTime) return `Starts ${task.startTime}`;
  return null;
}

function sortOpenTasks(tasks: ManagerTaskItem[]) {
  return [...tasks].sort((a, b) => {
    const aEsc = a.escalationLevel ?? 0;
    const bEsc = b.escalationLevel ?? 0;
    if (aEsc !== bEsc) return bEsc - aEsc;
    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    return aDue - bDue;
  });
}

function sortDoneTasks(tasks: ManagerTaskItem[]) {
  return [...tasks].sort((a, b) => {
    const aT = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const bT = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return bT - aT;
  });
}

interface MyTasksTodayPanelProps {
  outletId: string;
  todayYmd: string;
}

export function MyTasksTodayPanel({ outletId, todayYmd }: MyTasksTodayPanelProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ManagerTaskItem | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['manager-tasks', outletId, todayYmd],
    queryFn: () => taskApi.getManagerTasks(outletId, todayYmd),
    enabled: !!outletId,
  });

  const viewOnly = data?.viewOnly ?? false;
  const tasks = data?.tasks ?? [];

  useEffect(() => {
    if (!selected) return;
    const fresh = tasks.find((t) => t.id === selected.id);
    if (fresh) setSelected(fresh);
  }, [tasks, selected?.id]);

  const pending = useMemo(() => sortOpenTasks(tasks.filter((t) => !t.isCompleted)), [tasks]);
  const completed = useMemo(() => sortDoneTasks(tasks.filter((t) => t.isCompleted)), [tasks]);

  const todayLabel = useMemo(() => {
    try {
      return format(parseISO(todayYmd), 'EEEE, d MMMM');
    } catch {
      return 'Today';
    }
  }, [todayYmd]);

  const handleDialogCompleted = async () => {
    await queryClient.invalidateQueries({ queryKey: ['manager-tasks', outletId, todayYmd] });
    setSelected(null);
  };

  if (isLoading) {
    return <LoadingSpinner className="py-20" />;
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Today</p>
          <h2 className="text-xl font-bold text-gray-900 mt-0.5">{todayLabel}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Owner-role tasks scheduled for today — same list as the mobile app.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-2.5 text-center min-w-[4.5rem]">
            <p className="text-lg font-bold text-amber-700 leading-none">{pending.length}</p>
            <p className="text-[11px] font-medium text-amber-600 mt-1">To do</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-2.5 text-center min-w-[4.5rem]">
            <p className="text-lg font-bold text-emerald-700 leading-none">{completed.length}</p>
            <p className="text-[11px] font-medium text-emerald-600 mt-1">Done</p>
          </div>
          {isFetching && !isLoading && (
            <span className="text-xs text-gray-400 animate-pulse">Updating…</span>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-emerald-200 bg-gradient-to-b from-emerald-50/40 to-white">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <ListTodo className="h-8 w-8 text-emerald-500" />
          </div>
          <p className="font-semibold text-gray-800">No tasks for today</p>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Tasks assigned to the Owner role will appear here when they are due today.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <TaskSection
            title="To do"
            count={pending.length}
            emptyText="All caught up — nothing pending."
            tasks={pending}
            onSelect={setSelected}
          />
          <TaskSection
            title="Done"
            count={completed.length}
            emptyText="No completed tasks yet today."
            tasks={completed}
            onSelect={setSelected}
            done
          />
        </div>
      )}

      {selected && (
        <MyTaskDetailDialog
          task={selected}
          viewOnly={viewOnly}
          onClose={() => setSelected(null)}
          onTaskUpdated={setSelected}
          onCompleted={handleDialogCompleted}
        />
      )}
    </>
  );
}

function TaskSection({
  title,
  count,
  emptyText,
  tasks,
  onSelect,
  done = false,
}: {
  title: string;
  count: number;
  emptyText: string;
  tasks: ManagerTaskItem[];
  onSelect: (task: ManagerTaskItem) => void;
  done?: boolean;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">{title}</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {count}
        </span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 px-1">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task, idx) => {
            const due = formatDueLabel(task);
            const escalated = (task.escalationLevel ?? 0) > 0;
            return (
              <li
                key={task.id || `${task.taskTemplateId}-${idx}`}
                className="animate-in-stagger"
                style={{ animationDelay: `${Math.min(idx * 0.04, 0.32)}s` }}
              >
                <button
                  type="button"
                  onClick={() => onSelect(task)}
                  className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                    escalated && !done
                      ? 'border-amber-200 bg-gradient-to-r from-amber-50/90 to-white hover:border-amber-300'
                      : done
                        ? 'border-emerald-100/80 bg-white hover:border-emerald-200'
                        : 'border-gray-100 bg-white hover:border-emerald-200'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      done
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : escalated
                          ? 'border-amber-400 bg-amber-50 text-amber-600'
                          : 'border-gray-200 bg-gray-50 text-gray-400 group-hover:border-emerald-300'
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : escalated ? <AlertCircle className="h-4 w-4" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-semibold truncate ${done ? 'text-gray-500' : 'text-gray-900'}`}>
                      {task.title}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5 truncate">
                      {due ?? (task.assignedTo?.name ? `Assigned to ${task.assignedTo.name}` : 'No due time')}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
