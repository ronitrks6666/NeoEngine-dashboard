import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { managerApi } from '@/api/manager';
import { punchApi } from '@/api/punch';
import { activityApi } from '@/api/activity';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ListSearchBar } from '@/components/ListSearchBar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  Download,
  Search,
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { CalendarDateField } from '@/components/CalendarDateField';

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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const queryClient = useQueryClient();

  const { data: dashboardData } = useQuery({
    queryKey: ['manager-dashboard', selectedOutletId, debouncedAttendanceSearch],
    queryFn: () =>
      managerApi.getDashboard(selectedOutletId ?? undefined, undefined, debouncedAttendanceSearch.trim() || undefined),
    enabled: !!selectedOutletId,
  });

  const { data: attendanceData, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['attendance', selectedOutletId, selectedDate, debouncedAttendanceSearch],
    queryFn: () =>
      activityApi.getAttendance(selectedOutletId!, {
        startDate: selectedDate,
        endDate: selectedDate,
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
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 mt-0.5">Manage staff punches and track daily activity</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={attendanceSearch}
              onChange={(e) => setAttendanceSearch(e.target.value)}
              placeholder="Search staff..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-sm"
            />
          </div>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(subDays(new Date(selectedDate), 1).toISOString().slice(0, 10))}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 min-w-[180px] justify-center">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold text-gray-900">
              {format(new Date(selectedDate), 'EEE, MMM dd, yyyy')}
            </span>
          </div>
          <button
            onClick={() => setSelectedDate(addDays(new Date(selectedDate), 1).toISOString().slice(0, 10))}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedDate === new Date().toISOString().slice(0, 10)
                ? 'bg-emerald-100 text-emerald-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Today
          </button>
          <div className="w-px h-6 bg-gray-100 mx-1 hidden sm:block" />
          <div className="w-40">
            <CalendarDateField
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Pick a date"
            />
          </div>
        </div>
      </div>

      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Staff Punch Actions</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
            {staffStatus.length} staff members
          </span>
        </div>
        <div ref={punchMenuRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffStatus.map((s) => {
            const menuOpen = punchMenuOpenId === s.id;
            const pendingHere =
              punchMutation.isPending && punchMutation.variables?.employeeId === s.id;
            const statusStyle = s.status === 'working'
              ? 'bg-emerald-100 text-emerald-700'
              : s.status === 'break'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-600';

            return (
              <div key={s.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{s.role}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-lg ${statusStyle}`}>
                    {statusBadgeLabel(s.status)}
                  </span>
                </div>
                
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPunchMenuOpenId((id) => (id === s.id ? null : s.id))}
                    disabled={pendingHere}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-gray-800 disabled:opacity-50 active:scale-95"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {pendingHere ? 'Processing...' : 'Quick Punch'}
                    <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {menuOpen && (
                    <div
                      className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-2xl animate-fade-in ring-1 ring-black/5"
                    >
                      {PUNCH_OPTIONS.map(({ action, label }) => (
                        <button
                          key={action}
                          className="flex w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors disabled:opacity-50 font-medium"
                          disabled={pendingHere}
                          onClick={() => punchMutation.mutate({ employeeId: s.id, action })}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {staffStatus.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
            {debouncedAttendanceSearch.trim() ? 'No staff match your search.' : 'No staff for this outlet.'}
          </p>
        )}
        {punchMutation.isError && <p className="mt-2 text-red-600 text-sm">{getApiErrorMessage(punchMutation.error)}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Activity Feed
            {isAttendanceLoading && <LoadingSpinner className="h-4 w-4" />}
          </h2>
          <button
            onClick={() => {
              if (Array.isArray(events) && events.length > 0) {
                const headers = ['Time', 'Employee', 'Event'];
                const rows = events.map((e: { timestamp?: string; employeeName?: string; label?: string }) => [
                  e.timestamp ? format(new Date(e.timestamp), 'HH:mm:ss') : '-',
                  e.employeeName ?? '-',
                  e.label ?? '-',
                ]);
                const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `attendance-${selectedDate}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
            disabled={!Array.isArray(events) || events.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-all disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
        
        {Array.isArray(events) && events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Time</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((e: { _id?: string; timestamp?: string; employeeName?: string; type?: string; label?: string }, i: number) => (
                  <tr key={e._id ?? i} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">
                          {e.timestamp ? format(new Date(e.timestamp), 'hh:mm a') : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900">{e.employeeName ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                        (e.label || e.type || '').toLowerCase().includes('in') ? 'bg-emerald-50 text-emerald-600' :
                        (e.label || e.type || '').toLowerCase().includes('out') ? 'bg-red-50 text-red-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {e.label ?? e.type ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50/30">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">
              {debouncedAttendanceSearch.trim() ? 'No activity matches your search.' : 'No activity recorded for this day.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
