import type { QueryClient } from '@tanstack/react-query';
import type { ManagerTaskItem } from '@/api/task';

type TemplateRow = {
  _id: string;
  title?: string;
  description?: string;
  shiftType?: string;
  [key: string]: unknown;
};

function taskTemplateIdOf(task: ManagerTaskItem): string {
  return String(task.taskTemplateId ?? '');
}

/** Force-refresh every task list query used by the Tasks page. */
export async function refetchAllTaskQueries(
  queryClient: QueryClient,
  outletId: string,
  todayYmd: string
) {
  await Promise.all([
    queryClient.refetchQueries({ queryKey: ['manager-tasks'], type: 'all' }),
    queryClient.refetchQueries({ queryKey: ['task-templates'], type: 'all' }),
    queryClient.refetchQueries({ queryKey: ['manager-dashboard'], type: 'all' }),
    queryClient.refetchQueries({ queryKey: ['dashboard-tasks'], type: 'all' }),
  ]);
  await queryClient.refetchQueries({
    queryKey: ['manager-tasks', outletId, todayYmd],
    type: 'all',
  });
}

/** Instant update on the All Tasks template grid (the card list). */
export function patchTaskTemplatesAfterUpdate(
  queryClient: QueryClient,
  templateId: string,
  updates: Partial<TemplateRow>
) {
  const tid = String(templateId);
  queryClient.setQueriesData(
    { queryKey: ['task-templates'] },
    (old: { data?: { templates?: TemplateRow[] } } | undefined) => {
      if (!old?.data?.templates) return old;
      return {
        ...old,
        data: {
          ...old.data,
          templates: old.data.templates.map((row) =>
            String(row._id) === tid ? { ...row, ...updates } : row
          ),
        },
      };
    }
  );
}

export function removeTemplateFromTemplatesCache(queryClient: QueryClient, templateId: string) {
  const tid = String(templateId);
  queryClient.setQueriesData(
    { queryKey: ['task-templates'] },
    (old: { data?: { templates?: TemplateRow[] } } | undefined) => {
      if (!old?.data?.templates) return old;
      return {
        ...old,
        data: {
          ...old.data,
          templates: old.data.templates.filter((row) => String(row._id) !== tid),
        },
      };
    }
  );
}

/** Instant UI update on My Tasks today — before network refetch lands. */
export function patchManagerTasksAfterTemplateUpdate(
  queryClient: QueryClient,
  templateId: string,
  updates: Partial<ManagerTaskItem>
) {
  const tid = String(templateId);
  queryClient.setQueriesData(
    { queryKey: ['manager-tasks'] },
    (old: { tasks?: ManagerTaskItem[]; viewOnly?: boolean; date?: string } | undefined) => {
      if (!old?.tasks) return old;
      return {
        ...old,
        tasks: old.tasks.map((task) =>
          taskTemplateIdOf(task) === tid ? { ...task, ...updates } : task
        ),
      };
    }
  );
}

export function removeTemplateFromManagerTasksCache(queryClient: QueryClient, templateId: string) {
  const tid = String(templateId);
  queryClient.setQueriesData(
    { queryKey: ['manager-tasks'] },
    (old: { tasks?: ManagerTaskItem[] } | undefined) => {
      if (!old?.tasks) return old;
      return { ...old, tasks: old.tasks.filter((task) => taskTemplateIdOf(task) !== tid) };
    }
  );
}
