import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { managerApi } from '@/api/manager';
import { punchApi } from '@/api/punch';
import { activityApi } from '@/api/activity';
import { getApiErrorMessage } from '@/api/auth';
import { ListSearchBar } from '@/components/ListSearchBar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ChevronDown } from 'lucide-react';

function statusBadgeLabel(status: string) {
  const s = status?.trim() ?? '';
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

type PunchAction = 'in' | 'out' | 'break_start' | 'break_end';

const PUNCH_OPTIONS: { action: PunchAction; label: string }[] = [
  { action: 'in', label: 'Punch in' },
  { action: 'out', label: 'Punch out' },
  { action: 'break_start', label: 'Start break' },
  { action: 'break_end', label: 'End break' },
];

export function AttendancePage() {
  const { selectedOutletId } = useOutletStore();
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const debouncedAttendanceSearch = useDebouncedValue(attendanceSearch, 350);
  const [punchMenuOpenId, setPunchMenuOpenId] = useState<string | null>(null);
  const punchMenuRef = useRef<HTMLDivElement | null>(null);
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
    mutationFn: async ({
      employeeId,
      action,
    }: {
      employeeId: string;
      action: PunchAction;
    }) => {
      if (!selectedOutletId) return;
      if (action === 'in') return punchApi.punchInForEmployee(employeeId, selectedOutletId);
      if (action === 'out') return punchApi.punchOutForEmployee(employeeId, selectedOutletId);
      if (action === 'break_start') return punchApi.breakStartForEmployee(employeeId, selectedOutletId);
      if (action === 'break_end') return punchApi.breakEndForEmployee(employeeId, selectedOutletId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      setPunchMenuOpenId(null);
    },
  });

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!punchMenuRef.current?.contains(e.target as Node)) {
        setPunchMenuOpenId(null);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

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
        <div ref={punchMenuRef} className="flex flex-wrap gap-2">
          {staffStatus.map((s) => {
            const menuOpen = punchMenuOpenId === s.id;
            const pendingHere =
              punchMutation.isPending && punchMutation.variables?.employeeId === s.id;
            return (
              <div key={s.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                <span className="font-medium text-gray-900">{s.name}</span>
                <span className="text-sm text-gray-500">({s.role})</span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
                    s.status === 'working'
                      ? 'bg-emerald-100 text-emerald-800'
                      : s.status === 'break'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                  title={`Status: ${statusBadgeLabel(s.status)}`}
                >
                  {statusBadgeLabel(s.status)}
                </span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPunchMenuOpenId((id) => (id === s.id ? null : s.id))}
                    disabled={pendingHere}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
                    aria-expanded={menuOpen}
                    aria-haspopup="listbox"
                    aria-label={`Punch actions for ${s.name}`}
                  >
                    Punch
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} aria-hidden />
                  </button>
                  {menuOpen && (
                    <ul
                      className="absolute right-0 top-full z-20 mt-1.5 min-w-[10.5rem] overflow-hidden rounded-xl border border-emerald-100 bg-white py-1 shadow-lg shadow-emerald-950/10 ring-1 ring-black/5"
                      role="listbox"
                      aria-label="Punch actions"
                    >
                      {PUNCH_OPTIONS.map(({ action, label }) => (
                        <li key={action} role="presentation">
                          <button
                            type="button"
                            role="option"
                            className="flex w-full px-3 py-2 text-left text-sm text-gray-800 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                            disabled={pendingHere}
                            onClick={() => punchMutation.mutate({ employeeId: s.id, action })}
                          >
                            {label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
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
