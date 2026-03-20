import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { managerApi } from '@/api/manager';
import { punchApi } from '@/api/punch';
import { activityApi } from '@/api/activity';
import { getApiErrorMessage } from '@/api/auth';
import { ListSearchBar } from '@/components/ListSearchBar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export function AttendancePage() {
  const { selectedOutletId } = useOutletStore();
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const debouncedAttendanceSearch = useDebouncedValue(attendanceSearch, 350);
  const [punchEmployee, setPunchEmployee] = useState<{ id: string; name: string } | null>(null);
  const [punchAction, setPunchAction] = useState<'in' | 'out' | 'break_start' | 'break_end' | null>(null);
  const queryClient = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);

  const { data: dashboardData } = useQuery({
    queryKey: ['manager-dashboard', selectedOutletId, debouncedAttendanceSearch],
    queryFn: () =>
      managerApi.getDashboard(selectedOutletId ?? undefined, undefined, debouncedAttendanceSearch.trim() || undefined),
    enabled: !!selectedOutletId,
  });

  const { data: attendanceData } = useQuery({
    queryKey: ['attendance', selectedOutletId, today, debouncedAttendanceSearch],
    queryFn: () =>
      activityApi.getAttendance(selectedOutletId!, {
        startDate: today,
        endDate: today,
        limit: 100,
        search: debouncedAttendanceSearch.trim() || undefined,
      }),
    enabled: !!selectedOutletId,
  });

  const punchMutation = useMutation({
    mutationFn: async () => {
      if (!punchEmployee || !punchAction || !selectedOutletId) return;
      if (punchAction === 'in') return punchApi.punchInForEmployee(punchEmployee.id, selectedOutletId);
      if (punchAction === 'out') return punchApi.punchOutForEmployee(punchEmployee.id, selectedOutletId);
      if (punchAction === 'break_start') return punchApi.breakStartForEmployee(punchEmployee.id, selectedOutletId);
      if (punchAction === 'break_end') return punchApi.breakEndForEmployee(punchEmployee.id, selectedOutletId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      setPunchEmployee(null);
      setPunchAction(null);
    },
  });

  const staffStatus = dashboardData?.staffStatus ?? [];
  const events = attendanceData?.data?.events ?? attendanceData?.events ?? [];

  if (!selectedOutletId) {
    return <div className="p-6 text-amber-600">Select an outlet first.</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <ListSearchBar
          value={attendanceSearch}
          onChange={setAttendanceSearch}
          placeholder="Filter by staff name or phone"
          className="sm:max-w-md w-full"
          id="attendance-search"
          aria-label="Search attendance and punch list"
        />
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">Punch for staff</h2>
        <div className="flex flex-wrap gap-2">
          {staffStatus.map((s) => (
            <div key={s.id} className="flex items-center gap-2 bg-white border rounded-lg p-3">
              <span className="font-medium">{s.name}</span>
              <span className="text-sm text-gray-500">({s.role})</span>
              <span className={`text-xs px-2 py-0.5 rounded ${s.status === 'working' ? 'bg-green-100' : s.status === 'break' ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                {s.status}
              </span>
              {punchEmployee?.id === s.id ? (
                <div className="flex gap-1">
                  {(['in', 'out', 'break_start', 'break_end'] as const).map((action) => (
                    <button
                      key={action}
                      onClick={() => {
                        setPunchAction(action);
                        punchMutation.mutate();
                      }}
                      disabled={punchMutation.isPending}
                      className="px-2 py-1 text-xs bg-primary text-white rounded"
                    >
                      {action.replace('_', ' ')}
                    </button>
                  ))}
                  <button onClick={() => setPunchEmployee(null)} className="px-2 py-1 text-xs border rounded">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setPunchEmployee({ id: s.id, name: s.name })} className="px-2 py-1 text-xs bg-primary text-white rounded">
                  Punch
                </button>
              )}
            </div>
          ))}
        </div>
        {staffStatus.length === 0 && (
          <p className="text-sm text-gray-500">
            {debouncedAttendanceSearch.trim() ? 'No staff match your search.' : 'No staff for this outlet.'}
          </p>
        )}
        {punchMutation.isError && <p className="mt-2 text-red-600 text-sm">{getApiErrorMessage(punchMutation.error)}</p>}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 text-gray-800">Today&apos;s activity</h2>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => {
              if (Array.isArray(events) && events.length > 0) {
                const headers = ['Time', 'Employee', 'Event'];
                const rows = events.map((e: { timestamp?: string; employeeName?: string; label?: string }) => [
                  e.timestamp ? new Date(e.timestamp).toLocaleString() : '-',
                  e.employeeName ?? '-',
                  e.label ?? '-',
                ]);
                const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `attendance-${today}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
            disabled={!Array.isArray(events) || events.length === 0}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Export CSV
          </button>
        </div>
        {Array.isArray(events) && events.length > 0 ? (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Time</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Employee</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {events.slice(0, 50).map((e: { _id?: string; timestamp?: string; employeeName?: string; type?: string; label?: string }, i: number) => (
                  <tr key={e._id ?? i}>
                    <td className="px-4 py-2">{e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '-'}</td>
                    <td className="px-4 py-2">{e.employeeName ?? '-'}</td>
                    <td className="px-4 py-2">{e.label ?? e.type ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">
            {debouncedAttendanceSearch.trim() ? 'No punch activity matches your search for today.' : 'No activity today'}
          </p>
        )}
      </div>
    </div>
  );
}
