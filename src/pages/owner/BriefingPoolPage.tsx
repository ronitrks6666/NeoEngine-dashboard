import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { managerApi } from '@/api/manager';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  Search,
  Calendar,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { CalendarDateField } from '@/components/CalendarDateField';
import { BriefingPoolOpsPanels } from '@/components/BriefingPoolOpsPanels';
import { formatTime12 } from '@/utils/taskScheduleUtils';

type DatePreset = 'today' | '7d' | '15d' | '30d' | 'custom';

function todayYmd() {
  return format(new Date(), 'yyyy-MM-dd');
}

function presetRange(preset: Exclude<DatePreset, 'custom'>) {
  const end = todayYmd();
  if (preset === 'today') return { start: end, end };
  const daysBack = preset === '7d' ? 6 : preset === '15d' ? 14 : 29;
  return { start: format(subDays(new Date(), daysBack), 'yyyy-MM-dd'), end };
}

function parseLocalYmd(ymd?: string) {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return new Date();
  return new Date(ymd + 'T12:00:00');
}

export function BriefingPoolPage() {
  const { selectedOutletId } = useOutletStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [poolSearch, setPoolSearch] = useState('');
  const debouncedPoolSearch = useDebouncedValue(poolSearch, 350);
  const [activePreset, setActivePreset] = useState<DatePreset>('today');
  const [selectedRange, setSelectedRange] = useState(() => presetRange('today'));

  const applyPreset = useCallback((preset: Exclude<DatePreset, 'custom'>) => {
    setActivePreset(preset);
    setSelectedRange(presetRange(preset));
  }, []);

  const handleRangeChange = useCallback((range: { start: string; end: string }) => {
    setSelectedRange(range);
    const today = todayYmd();
    const presets: Exclude<DatePreset, 'custom'>[] = ['today', '7d', '15d', '30d'];
    const matched = presets.find((preset) => {
      const expected = presetRange(preset);
      return expected.start === range.start && expected.end === range.end;
    });
    if (matched) {
      setActivePreset(matched);
      return;
    }
    if (range.start === range.end && range.start === today) {
      setActivePreset('today');
      return;
    }
    setActivePreset('custom');
  }, []);

  const startDate = selectedRange.start;
  const endDate = selectedRange.end;
  const isSingleDay = startDate === endDate;

  const dateParams = {
    dateRange: 'custom' as const,
    startDate,
    endDate,
  };
  const { data, isLoading } = useQuery({
    queryKey: ['briefing-pool', selectedOutletId, debouncedPoolSearch, dateParams.dateRange, startDate, endDate],
    queryFn: () =>
      managerApi.getBriefingPool(selectedOutletId!, {
        limit: 100,
        search: debouncedPoolSearch.trim() || undefined,
        ...dateParams,
      }),
    enabled: !!selectedOutletId,
  });

  const { data: tasksData, isLoading: isTasksLoading } = useQuery({
    queryKey: ['briefing-pool-tasks', expandedId, dateParams.dateRange, startDate, endDate],
    queryFn: () => managerApi.getBriefingPoolEmployeeTasks(expandedId!, dateParams),
    enabled: !!expandedId,
  });

  const employees = data?.data?.employees ?? data?.employees ?? [];
  const raw = tasksData?.data ?? tasksData ?? {};

  const opsData = useMemo(() => {
    const pool = data?.data ?? data ?? {};
    return {
      isSingleDay,
      todayYmd: pool.todayYmd,
      yesterdayYmd: pool.yesterdayYmd,
      offToday: pool.offToday,
      notPunchedInYet: pool.notPunchedInYet,
      dutyRosterExpectedStarts: pool.dutyRosterExpectedStarts,
      yesterdayNotes: pool.yesterdayNotes,
      postShiftFlags: pool.postShiftFlags,
      pendingApprovals: pool.pendingApprovals,
      manualAttendanceRepeatOffenders: pool.manualAttendanceRepeatOffenders,
      repeatLate: pool.repeatLate,
      weakPerformers: pool.weakPerformers,
      lateArrivals: pool.lateArrivals,
      unresolvedIssues: pool.unresolvedIssues,
    };
  }, [data, isSingleDay]);

  const tasks = useMemo(() => {
    const taskMap = new Map();
    [...(raw.notCompleted ?? []), ...(raw.escalated ?? []), ...(raw.completed ?? [])].forEach((t) => {
      if (t.id) taskMap.set(String(t.id), t);
    });
    return Array.from(taskMap.values());
  }, [raw.notCompleted, raw.escalated, raw.completed]);

  const getTaskStatus = (t: { isCompleted?: boolean; escalationLevel?: number }) => {
    if (t.isCompleted) return { label: 'Done', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
    if ((t.escalationLevel ?? 0) >= 1) return { label: 'Escalated', className: 'bg-red-50 text-red-700 border-red-100' };
    return { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-100' };
  };

  if (!selectedOutletId) {
    return <div className="p-6 text-amber-600">Select an outlet first.</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Briefing Pool</h1>
          <p className="text-gray-500 mt-0.5">
            Morning ops talking points plus completed, pending, and escalated tasks
          </p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={poolSearch}
            onChange={(e) => setPoolSearch(e.target.value)}
            placeholder="Search staff..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-sm"
          />
        </div>
      </div>

      {/* Filters & Navigation */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-8 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex p-1 bg-gray-50 rounded-xl">
              {(
                [
                  { id: 'today' as const, label: 'Today' },
                  { id: '7d' as const, label: 'Last 7d' },
                  { id: '15d' as const, label: 'Last 15d' },
                  { id: '30d' as const, label: 'Last 30d' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => applyPreset(mode.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    activePreset === mode.id
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {isSingleDay && (
              <div className="flex items-center gap-1 ml-auto">
                <button
                  type="button"
                  onClick={() =>
                    handleRangeChange({
                      start: format(subDays(parseLocalYmd(startDate), 1), 'yyyy-MM-dd'),
                      end: format(subDays(parseLocalYmd(startDate), 1), 'yyyy-MM-dd'),
                    })
                  }
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2 px-2">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-bold text-gray-900 min-w-[120px] text-center">
                    {format(parseLocalYmd(startDate), 'EEE, MMM dd')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleRangeChange({
                      start: format(subDays(parseLocalYmd(startDate), -1), 'yyyy-MM-dd'),
                      end: format(subDays(parseLocalYmd(startDate), -1), 'yyyy-MM-dd'),
                    })
                  }
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                  aria-label="Next day"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          <div className="w-full sm:max-w-md">
            <CalendarDateField
              mode="range"
              rangeValue={selectedRange}
              onRangeChange={handleRangeChange}
              placeholder="Pick a date range"
            />
          </div>
        </div>
      </div>
      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="space-y-4">
          <BriefingPoolOpsPanels data={opsData} />

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Staff task attention</h2>
            <p className="text-sm text-gray-500 mb-4">Expand anyone to review their tasks for this range</p>
          </div>

          {employees.map((emp: { _id: string; name: string; notCompletedCount?: number; escalatedCount?: number; completedCount?: number; phone?: string }) => (
            <div key={emp._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:border-emerald-200 transition-colors">
              <div className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-lg">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{emp.name}</h3>
                    <p className="text-xs text-gray-500">{emp.phone || 'No phone'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-0.5">Done</p>
                    <p className="text-lg font-black text-gray-900 leading-none">{emp.completedCount ?? 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-0.5">Pending</p>
                    <p className="text-lg font-black text-gray-900 leading-none">{emp.notCompletedCount ?? 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-0.5">Escalated</p>
                    <p className="text-lg font-black text-gray-900 leading-none">{emp.escalatedCount ?? 0}</p>
                  </div>
                  <button
                    onClick={() => setExpandedId(expandedId === emp._id ? null : emp._id)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      expandedId === emp._id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {expandedId === emp._id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {expandedId === emp._id && (
                <div className="px-5 pb-5 pt-0 space-y-3 bg-gray-50/50 border-t border-gray-100 animate-slide-up">
                  <div className="pt-4 pb-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tasks Overview</p>
                  </div>
                  {isTasksLoading ? (
                    <div className="py-8 flex flex-col items-center justify-center text-gray-400 italic">
                      <LoadingSpinner className="h-5 w-5 mb-2" />
                      <p className="text-xs">Loading tasks...</p>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="py-8 flex flex-col items-center justify-center text-gray-400">
                      <p className="text-sm">No tasks in this period</p>
                    </div>
                  ) : (
                    tasks.map((t: {
                      id: string;
                      title?: string;
                      date?: string;
                      startTime?: string;
                      dueAt?: string;
                      isCompleted?: boolean;
                      escalationLevel?: number;
                      escalationHistory?: { escalatedAt?: string }[];
                    }) => {
                      const status = getTaskStatus(t);
                      const taskTimeStr = t.startTime ? formatTime12(t.startTime) : null;
                      const dueStr = t.dueAt ? format(new Date(t.dueAt), 'MMM dd, hh:mm a') : null;
                      const lastEscalated = t.escalationHistory?.length ? t.escalationHistory[t.escalationHistory.length - 1]?.escalatedAt : null;
                      const escalatedStr = lastEscalated ? format(new Date(lastEscalated), 'MMM dd, hh:mm a') : null;
                      const dateStr = t.date ? format(new Date(t.date + 'T12:00:00'), 'EEE, MMM dd') : null;

                      return (
                        <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-4 group shadow-sm hover:border-emerald-100 transition-all">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm">{t.title ?? 'Untitled Task'}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                              {dateStr && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                  <Calendar className="h-3 w-3 text-gray-400" />
                                  {dateStr}
                                </div>
                              )}
                              {taskTimeStr && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                                  <Clock className="h-3 w-3 text-gray-400" />
                                  {taskTimeStr}
                                </div>
                              )}
                              {dueStr && !t.isCompleted && (
                                <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                                  <Clock className="h-3 w-3 text-amber-400" />
                                  Due: {dueStr}
                                </div>
                              )}
                              {escalatedStr && !t.isCompleted && (
                                <div className="flex items-center gap-1.5 text-xs text-red-600 font-bold">
                                  <AlertCircle className="h-3 w-3" />
                                  Escalated: {escalatedStr}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                      );
                    })
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
    </div>
  );
}
