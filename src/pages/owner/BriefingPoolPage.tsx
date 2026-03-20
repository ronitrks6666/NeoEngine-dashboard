import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { managerApi } from '@/api/manager';
import { taskApi } from '@/api/task';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ListSearchBar } from '@/components/ListSearchBar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export function BriefingPoolPage() {
  const { selectedOutletId } = useOutletStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [poolSearch, setPoolSearch] = useState('');
  const debouncedPoolSearch = useDebouncedValue(poolSearch, 350);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['briefing-pool', selectedOutletId, debouncedPoolSearch],
    queryFn: () =>
      managerApi.getBriefingPool(selectedOutletId!, {
        limit: 50,
        search: debouncedPoolSearch.trim() || undefined,
      }),
    enabled: !!selectedOutletId,
  });

  const { data: tasksData } = useQuery({
    queryKey: ['briefing-pool-tasks', expandedId],
    queryFn: () => managerApi.getBriefingPoolEmployeeTasks(expandedId!),
    enabled: !!expandedId,
  });

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.completeOnBehalf(taskId),
    onSuccess: (_res, taskId) => {
      if (expandedId) {
        queryClient.setQueryData(
          ['briefing-pool-tasks', expandedId],
          (prev: { data?: { notCompleted?: { id: string }[]; escalated?: { id: string }[] } } | undefined) => {
            if (!prev?.data) return prev;
            const removeTask = (arr: { id: string }[] = []) => arr.filter((t) => t.id !== taskId);
            return {
              ...prev,
              data: {
                ...prev.data,
                notCompleted: removeTask(prev.data.notCompleted),
                escalated: removeTask(prev.data.escalated),
              },
            };
          }
        );
      }
      if (selectedOutletId) {
        queryClient.invalidateQueries({ queryKey: ['briefing-pool', selectedOutletId] });
      }
      queryClient.invalidateQueries({ queryKey: ['manager-dashboard'] });
    },
  });

  const employees = data?.data?.employees ?? data?.employees ?? [];
  const raw = tasksData?.data ?? tasksData ?? {};
  const tasks = [...(raw.notCompleted ?? []), ...(raw.escalated ?? [])];

  if (!selectedOutletId) {
    return <div className="p-6 text-amber-600">Select an outlet first.</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900 mb-2">Briefing Pool</h1>
          <p className="text-emerald-700 font-medium">Staff with not-done or escalated tasks</p>
        </div>
        <ListSearchBar
          value={poolSearch}
          onChange={setPoolSearch}
          placeholder="Search by staff name or phone"
          className="sm:max-w-sm w-full"
          id="briefing-pool-search"
          aria-label="Search briefing pool"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="space-y-4">
          {employees.map((emp: { _id: string; name: string; notCompletedCount?: number; escalatedCount?: number }) => (
            <div key={emp._id} className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
              <div className="flex justify-between items-center p-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{emp.name}</h3>
                  <div className="flex gap-3 mt-1">
                    <span className="text-sm text-amber-600 font-medium">Not done: {emp.notCompletedCount ?? 0}</span>
                    <span className="text-sm text-red-600 font-medium">Escalated: {emp.escalatedCount ?? 0}</span>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedId(expandedId === emp._id ? null : emp._id)}
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  {expandedId === emp._id ? 'Hide tasks' : 'View tasks'}
                </button>
              </div>
              {expandedId === emp._id && (
                <div className="px-4 pb-4 pt-0 space-y-3 border-t border-gray-100">
                  {tasks.length === 0 ? (
                    <p className="text-gray-500 text-sm">Loading tasks...</p>
                  ) : (
                    tasks
                      .filter((t: { isCompleted?: boolean }) => !t.isCompleted)
                      .map((t: {
                        id: string;
                        title?: string;
                        date?: string;
                        dueAt?: string;
                        escalationLevel?: number;
                        escalationHistory?: { escalatedAt?: string }[];
                      }) => {
                        const dueStr = t.dueAt ? new Date(t.dueAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : null;
                        const lastEscalated = t.escalationHistory?.length ? t.escalationHistory[t.escalationHistory.length - 1]?.escalatedAt : null;
                        const escalatedStr = lastEscalated ? new Date(lastEscalated).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : null;
                        const dateStr = t.date ? new Date(t.date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : null;
                        return (
                          <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="flex justify-between items-start gap-4">
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-900">{t.title ?? 'Task'}</p>
                                <div className="mt-2 space-y-1 text-sm text-gray-500">
                                  {dateStr && <p className="flex items-center gap-1.5"><span className="text-gray-400">Started:</span> {dateStr}</p>}
                                  {dueStr && <p className="flex items-center gap-1.5"><span className="text-gray-400">Due:</span> {dueStr}</p>}
                                  {escalatedStr && <p className="flex items-center gap-1.5 text-amber-600"><span className="text-amber-500">Escalated:</span> {escalatedStr}</p>}
                                </div>
                              </div>
                              <button
                                onClick={() => completeMutation.mutate(t.id)}
                                disabled={completeMutation.isPending}
                                className="shrink-0 px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                              >
                                Complete
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )}
                  {tasks.length > 0 && tasks.every((t: { isCompleted?: boolean }) => t.isCompleted) && (
                    <p className="text-gray-500 text-sm py-4">All tasks completed</p>
                  )}
                </div>
              )}
            </div>
          ))}
          {employees.length === 0 && (
            <p className="text-gray-500">
              {debouncedPoolSearch.trim() ? 'No staff match your search.' : 'No staff with pending tasks'}
            </p>
          )}
        </div>
      )}
      {completeMutation.isError && (
        <p className="mt-2 text-red-600 text-sm">{getApiErrorMessage(completeMutation.error)}</p>
      )}
    </div>
  );
}
