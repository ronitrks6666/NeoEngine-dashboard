import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { managerApi } from '@/api/manager';
import { punchApi } from '@/api/punch';
import { activityApi } from '@/api/activity';
import { employeeApi } from '@/api/employee';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  User,
  Download,
  Search,
  X,
  Loader2,
} from 'lucide-react';
import { format, startOfDay } from 'date-fns';
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

function suggestionRoleLabel(emp: {
  activeRoleId?: { name?: string; parentRoleId?: { name?: string } } | string | null;
}): string | null {
  const r = emp.activeRoleId;
  if (r && typeof r === 'object' && r.parentRoleId?.name?.trim()) return r.parentRoleId.name.trim();
  return null;
}

export function AttendancePage() {
  const { selectedOutletId } = useOutletStore();
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const debouncedAttendanceSearch = useDebouncedValue(attendanceSearch, 350);
  const [pickedStaff, setPickedStaff] = useState<{ id: string; name: string } | null>(null);
  const [staffSearchFocused, setStaffSearchFocused] = useState(false);
  const staffSearchBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [punchMenuOpenId, setPunchMenuOpenId] = useState<string | null>(null);
  const punchMenuRef = useRef<HTMLDivElement | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string }>({ start: today, end: today });
  const queryClient = useQueryClient();

  const { data: dashboardData } = useQuery({
    queryKey: ['manager-dashboard', selectedOutletId, debouncedAttendanceSearch],
    queryFn: () =>
      managerApi.getDashboard(selectedOutletId ?? undefined, undefined, debouncedAttendanceSearch.trim() || undefined),
    enabled: !!selectedOutletId,
  });

  const debouncedStaffSuggest = debouncedAttendanceSearch.trim();
  const showStaffSuggestionPanel =
    staffSearchFocused && debouncedStaffSuggest.length >= 2 && !pickedStaff;

  const { data: staffSuggestPayload, isFetching: staffSuggestFetching } = useQuery({
    queryKey: ['attendance-staff-suggestions', selectedOutletId, debouncedStaffSuggest],
    queryFn: () =>
      employeeApi.getMyEmployees({
        outletId: selectedOutletId!,
        search: debouncedStaffSuggest,
        limit: 25,
        page: 1,
      }),
    enabled: !!selectedOutletId && showStaffSuggestionPanel,
  });

  const staffSuggestions =
    (staffSuggestPayload as { data?: { employees?: unknown[] } } | undefined)?.data?.employees ?? [];

  const startDate = selectedRange.start.trim() || today;
  const endDate = selectedRange.end.trim() || startDate;
  const rangeLabel =
    startDate === endDate
      ? format(startOfDay(new Date(startDate)), 'EEE, MMM dd, yyyy')
      : `${format(startOfDay(new Date(startDate)), 'MMM dd, yyyy')} - ${format(startOfDay(new Date(endDate)), 'MMM dd, yyyy')}`;

  const { data: attendanceData, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['attendance', selectedOutletId, startDate, endDate, debouncedAttendanceSearch],
    queryFn: () =>
      activityApi.getAttendance(selectedOutletId!, {
        startDate,
        endDate,
        limit: 1000,
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

  useEffect(
    () => () => {
      if (staffSearchBlurTimerRef.current) clearTimeout(staffSearchBlurTimerRef.current);
    },
    []
  );

  const clearStaffSearchBlurTimer = () => {
    if (staffSearchBlurTimerRef.current) {
      clearTimeout(staffSearchBlurTimerRef.current);
      staffSearchBlurTimerRef.current = null;
    }
  };

  const onStaffSearchFocus = () => {
    clearStaffSearchBlurTimer();
    setStaffSearchFocused(true);
  };

  const onStaffSearchBlur = () => {
    clearStaffSearchBlurTimer();
    staffSearchBlurTimerRef.current = setTimeout(() => setStaffSearchFocused(false), 220);
  };

  const clearStaffFilter = () => {
    clearStaffSearchBlurTimer();
    setPickedStaff(null);
    setAttendanceSearch('');
    setStaffSearchFocused(false);
  };

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
          <div className="relative w-full sm:w-80 z-20">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={attendanceSearch}
              onChange={(e) => {
                const v = e.target.value;
                setAttendanceSearch(v);
                if (pickedStaff && v.trim() !== pickedStaff.name.trim()) {
                  setPickedStaff(null);
                }
              }}
              onFocus={onStaffSearchFocus}
              onBlur={onStaffSearchBlur}
              placeholder="Search staff (min. 2 letters for suggestions)…"
              autoComplete="off"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-sm"
              aria-autocomplete="list"
              aria-expanded={showStaffSuggestionPanel}
              aria-controls="attendance-staff-suggestions"
            />
            {pickedStaff || attendanceSearch.length > 0 ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={clearStaffFilter}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Clear staff search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
            {showStaffSuggestionPanel ? (
              <div
                id="attendance-staff-suggestions"
                className="absolute left-0 right-0 top-full mt-1 max-h-72 overflow-auto rounded-xl border border-gray-100 bg-white py-1 shadow-xl ring-1 ring-black/5 animate-fade-in"
                role="listbox"
              >
                {staffSuggestFetching ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    Searching…
                  </div>
                ) : Array.isArray(staffSuggestions) && staffSuggestions.length > 0 ? (
                  (staffSuggestions as { _id: string; name: string; activeRoleId?: { name?: string } | string }[]).map(
                    (emp) => {
                      const role = suggestionRoleLabel(emp);
                      return (
                        <button
                          key={String(emp._id)}
                          type="button"
                          role="option"
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-emerald-50 transition-colors"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setPickedStaff({ id: String(emp._id), name: emp.name });
                            setAttendanceSearch(emp.name);
                            setStaffSearchFocused(false);
                          }}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">
                            {emp.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-gray-900">{emp.name}</p>
                            {role ? <p className="truncate text-xs text-gray-500">{role}</p> : null}
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                        </button>
                      );
                    }
                  )
                ) : (
                  <p className="px-3 py-4 text-center text-sm text-gray-500">No staff match this search.</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-8 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400 mb-1">Attendance filter</p>
          <h2 className="text-lg font-bold text-gray-900">{rangeLabel}</h2>
          <p className="text-sm text-gray-500">Pick a date range. Selecting the same start and end date shows that day only.</p>
        </div>
        <div className="sm:w-[320px] md:w-[360px]">
          <CalendarDateField
            mode="range"
            rangeValue={selectedRange}
            onRangeChange={setSelectedRange}
            placeholder="Pick a date range"
          />
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
                const headers = ['Date', 'Time', 'Employee', 'Event'];
                const rows = events.map((e: { timestamp?: string; employeeName?: string; label?: string }) => [
                  e.timestamp ? format(new Date(e.timestamp), 'yyyy-MM-dd') : '-',
                  e.timestamp ? format(new Date(e.timestamp), 'HH:mm:ss') : '-',
                  e.employeeName ?? '-',
                  e.label ?? '-',
                ]);
                const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `attendance-${startDate}_to_${endDate}.csv`;
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
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
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
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">
                          {e.timestamp ? format(new Date(e.timestamp), 'dd MMM yyyy') : '—'}
                        </span>
                      </div>
                    </td>
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
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${(e.label || e.type || '').toLowerCase().includes('in') ? 'bg-emerald-50 text-emerald-600' :
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
              {debouncedAttendanceSearch.trim() ? 'No activity matches your search.' : startDate === endDate ? 'No activity recorded for this day.' : 'No activity recorded for this range.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
