import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { managerApi } from '@/api/manager';
import { taskApi } from '@/api/task';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  StickyNote,
  Save,
  Undo2,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { CalendarDateField } from '@/components/CalendarDateField';

export function BriefingPoolPage() {
  const { selectedOutletId } = useOutletStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [poolSearch, setPoolSearch] = useState('');
  const debouncedPoolSearch = useDebouncedValue(poolSearch, 350);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [dateRangeMode, setDateRangeMode] = useState<'daily' | '7d' | '15d' | '30d'>('daily');
  const [notesText, setNotesText] = useState('');
  const [savedNotesText, setSavedNotesText] = useState('');
  const [notesExpanded, setNotesExpanded] = useState(true);
  const queryClient = useQueryClient();

  const getRange = () => {
    const end = new Date();
    let start = new Date();
    if (dateRangeMode === '7d') start = subDays(end, 7);
    else if (dateRangeMode === '15d') start = subDays(end, 15);
    else if (dateRangeMode === '30d') start = subDays(end, 30);
    else return { start: selectedDate, end: selectedDate };

    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  };

  const { start, end } = getRange();

  const { data, isLoading } = useQuery({
    queryKey: ['briefing-pool', selectedOutletId, debouncedPoolSearch, start, end],
    queryFn: () =>
      managerApi.getBriefingPool(selectedOutletId!, {
        limit: 100,
        search: debouncedPoolSearch.trim() || undefined,
        startDate: start,
        endDate: end,
      }),
    enabled: !!selectedOutletId,
  });

  const { data: tasksData } = useQuery({
    queryKey: ['briefing-pool-tasks', expandedId],
    queryFn: () => managerApi.getBriefingPoolEmployeeTasks(expandedId!),
    enabled: !!expandedId,
  });

  const notesQuery = useQuery({
    queryKey: ['briefing-pool-notes', selectedOutletId],
    queryFn: () => managerApi.getBriefingPoolNotes(selectedOutletId!),
    enabled: !!selectedOutletId,
  });

  useEffect(() => {
    if (notesQuery.data) {
      const body = notesQuery.data.notes ?? '';
      setNotesText(body);
      setSavedNotesText(body);
    }
  }, [notesQuery.data]);

  const notesDirty = notesText !== savedNotesText;

  const saveNotesMutation = useMutation({
    mutationFn: () => managerApi.updateBriefingPoolNotes(selectedOutletId!, notesText),
    onSuccess: () => {
      setSavedNotesText(notesText);
      queryClient.invalidateQueries({ queryKey: ['briefing-pool-notes', selectedOutletId] });
    },
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
  
  // Deduplicate tasks by ID to avoid showing same escalated task twice
  const tasks = useMemo(() => {
    const taskMap = new Map();
    [...(raw.notCompleted ?? []), ...(raw.escalated ?? [])].forEach(t => {
      if (t.id) taskMap.set(String(t.id), t);
    });
    return Array.from(taskMap.values());
  }, [raw.notCompleted, raw.escalated]);

  if (!selectedOutletId) {
    return <div className="p-6 text-amber-600">Select an outlet first.</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Briefing Pool</h1>
          <p className="text-gray-500 mt-0.5">Staff with pending or escalated tasks in selected period</p>
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

      {/* Briefing notes — shared outlet notes (parity with mobile) */}
      <div className="mb-6 rounded-2xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setNotesExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-emerald-50/40 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-semibold text-gray-900">Briefing notes</p>
              <p className="text-xs text-gray-500">
                Shared notes for {notesQuery.data?.outletName || 'this outlet'} — visible in the app briefing pool
              </p>
            </div>
          </div>
          {notesExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>
        {notesExpanded && (
          <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
            {notesQuery.isLoading ? (
              <LoadingSpinner className="py-6" />
            ) : notesQuery.isError ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                You don&apos;t have permission to view briefing notes, or they could not be loaded.
              </p>
            ) : (
              <>
                <p className="text-xs text-gray-500">
                  Use this for shift handover notes, priorities, or reminders for managers reviewing the briefing pool.
                </p>
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  rows={5}
                  placeholder="Enter briefing notes for this outlet…"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {saveNotesMutation.isError ? (
                    <p className="text-sm text-red-600">{getApiErrorMessage(saveNotesMutation.error)}</p>
                  ) : notesDirty ? (
                    <p className="text-xs text-amber-600">Unsaved changes</p>
                  ) : (
                    <span />
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!notesDirty || saveNotesMutation.isPending}
                      onClick={() => setNotesText(savedNotesText)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Reset
                    </button>
                    <button
                      type="button"
                      disabled={!notesDirty || saveNotesMutation.isPending}
                      onClick={() => saveNotesMutation.mutate()}
                      className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {saveNotesMutation.isPending ? 'Saving…' : 'Save notes'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Filters & Navigation */}
      <div className="bg-white rounded-2xl border border-gray-100 p-2 mb-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          <div className="flex p-1 bg-gray-50 rounded-xl">
            {[
              { id: 'daily', label: 'Daily' },
              { id: '7d', label: 'Last 7d' },
              { id: '15d', label: 'Last 15d' },
              { id: '30d', label: 'Last 30d' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setDateRangeMode(mode.id as any)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  dateRangeMode === mode.id
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="hidden md:block w-px h-8 bg-gray-100 mx-2" />

          {dateRangeMode === 'daily' ? (
            <div className="flex-1 flex items-center justify-between gap-4">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedDate(subDays(new Date(selectedDate), 1).toISOString().slice(0, 10))}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2 px-3">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-bold text-gray-900 min-w-[120px] text-center">
                    {format(new Date(selectedDate), 'EEE, MMM dd')}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDate(subDays(subDays(new Date(selectedDate), -1), 0).toISOString().slice(0, 10))}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="w-40">
                <CalendarDateField
                  value={selectedDate}
                  onChange={setSelectedDate}
                  placeholder="Pick date"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2 px-4 text-sm text-gray-500">
              <Filter className="h-4 w-4" />
              Showing activity from <span className="font-semibold text-gray-900">{format(new Date(start), 'MMM dd')}</span> to <span className="font-semibold text-gray-900">{format(new Date(end), 'MMM dd')}</span>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="space-y-4">
          {employees.map((emp: { _id: string; name: string; notCompletedCount?: number; escalatedCount?: number; phone?: string }) => (
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
                  {tasks.length === 0 ? (
                    <div className="py-8 flex flex-col items-center justify-center text-gray-400 italic">
                      <LoadingSpinner className="h-5 w-5 mb-2" />
                      <p className="text-xs">Loading tasks...</p>
                    </div>
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
                                {dueStr && (
                                  <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                                    <Clock className="h-3 w-3 text-amber-400" />
                                    Due: {dueStr}
                                  </div>
                                )}
                                {escalatedStr && (
                                  <div className="flex items-center gap-1.5 text-xs text-red-600 font-bold">
                                    <AlertCircle className="h-3 w-3" />
                                    Escalated: {escalatedStr}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => completeMutation.mutate(t.id)}
                              disabled={completeMutation.isPending}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {completeMutation.isPending ? 'Done...' : 'Done'}
                            </button>
                          </div>
                        );
                      })
                  )}
                  {tasks.length > 0 && tasks.every((t: { isCompleted?: boolean }) => t.isCompleted) && (
                    <div className="py-8 flex flex-col items-center justify-center text-emerald-500">
                      <CheckCircle2 className="h-10 w-10 mb-2 opacity-20" />
                      <p className="text-sm font-bold">All tasks cleared!</p>
                    </div>
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
