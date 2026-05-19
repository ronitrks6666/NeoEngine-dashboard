import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { activityApi } from '@/api/activity';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ListSearchBar } from '@/components/ListSearchBar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  Activity,
  Clock,
  LogIn,
  LogOut,
  CheckSquare,
  AlertTriangle,
  Coffee,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  CalendarRange,
} from 'lucide-react';

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateHeader(dateStr: string) {
  const [y, mo, da] = dateStr.split('-').map(Number);
  const d = new Date(y, mo - 1, da);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

interface ActivityEvent {
  _id?: string;
  type: string;
  subType?: string;
  description?: string;
  employeeName?: string;
  timestamp?: string;
  createdAt?: string;
  label?: string;
  taskTitle?: string;
  data?: Record<string, unknown>;
}

function eventYMD(ts?: string): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Map event types to icons and colors
function getEventVisuals(type: string, subType?: string) {
  const raw = `${type} ${subType || ''}`.toLowerCase();
  if (raw.includes('punch_in') || raw.includes('checkin') || (type === 'punch' && subType === 'IN'))
    return { icon: LogIn, bg: 'bg-emerald-100', text: 'text-emerald-600' };
  if (raw.includes('punch_out') || raw.includes('checkout') || (type === 'punch' && subType === 'OUT'))
    return { icon: LogOut, bg: 'bg-red-100', text: 'text-red-600' };
  if (raw.includes('task')) return { icon: CheckSquare, bg: 'bg-blue-100', text: 'text-blue-600' };
  if (raw.includes('issue')) return { icon: AlertTriangle, bg: 'bg-orange-100', text: 'text-orange-600' };
  if (raw.includes('break')) return { icon: Coffee, bg: 'bg-amber-100', text: 'text-amber-600' };
  if (raw.includes('leave')) return { icon: CalendarDays, bg: 'bg-violet-100', text: 'text-violet-600' };
  return { icon: Activity, bg: 'bg-gray-100', text: 'text-gray-600' };
}

function displayTypeLine(e: ActivityEvent): string {
  if (e.type === 'punch' && e.subType) return e.subType.replace(/_/g, ' ');
  if (e.type === 'task') return 'task completed';
  return e.type.replace(/_/g, ' ');
}

const CUSTOM_RANGE_MAX_DAYS = 120;

export function ActivityPage() {
  const { selectedOutletId } = useOutletStore();
  const [viewDate, setViewDate] = useState(todayYMD());
  const [rangeMode, setRangeMode] = useState<'single' | 'custom'>('single');
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 350);
  const [page, setPage] = useState(1);

  const isToday = viewDate === todayYMD();

  const activeStart =
    rangeMode === 'custom' && customStart && customEnd && customStart <= customEnd ? customStart : viewDate;
  const activeEnd =
    rangeMode === 'custom' && customStart && customEnd && customStart <= customEnd ? customEnd : viewDate;

  const rangeDayCount = useMemo(() => {
    if (activeStart > activeEnd) return 0;
    const a = new Date(activeStart + 'T12:00:00');
    const b = new Date(activeEnd + 'T12:00:00');
    return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  }, [activeStart, activeEnd]);

  const rangeCaption =
    rangeMode === 'custom' && customStart && customEnd && customStart <= customEnd
      ? `${formatDateHeader(customStart)} → ${formatDateHeader(customEnd)}`
      : formatDateHeader(viewDate);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['outlet-activity', selectedOutletId, activeStart, activeEnd, page],
    queryFn: () =>
      activityApi.getOutletActivity(selectedOutletId!, {
        startDate: activeStart,
        endDate: activeEnd,
        page,
        limit: 50,
      }),
    enabled: !!selectedOutletId,
  });

  const inner = data?.data;
  const activities: ActivityEvent[] = useMemo(() => {
    if (inner == null) return [];
    if (Array.isArray(inner)) return inner as ActivityEvent[];
    if (typeof inner === 'object' && Array.isArray((inner as { events?: unknown }).events)) {
      return (inner as { events: ActivityEvent[] }).events;
    }
    return [];
  }, [inner]);

  const pagination = inner && typeof inner === 'object' && !Array.isArray(inner) ? (inner as { pagination?: { hasMore?: boolean; total?: number } }).pagination : undefined;
  const hasMore = pagination?.hasMore === true;

  // Search filter (client-side; API has no search on outlet activity)
  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return activities;
    const lower = debouncedSearch.toLowerCase();
    return activities.filter(
      (a) =>
        (a.description || '').toLowerCase().includes(lower) ||
        (a.employeeName || '').toLowerCase().includes(lower) ||
        (a.label || '').toLowerCase().includes(lower) ||
        a.type.toLowerCase().includes(lower) ||
        (a.taskTitle || '').toLowerCase().includes(lower)
    );
  }, [activities, debouncedSearch]);

  const groupedByDay = useMemo(() => {
    if (rangeDayCount <= 1) return null as { ymd: string; label: string; items: ActivityEvent[] }[] | null;
    const map = new Map<string, ActivityEvent[]>();
    for (const e of filtered) {
      const ymd = eventYMD(e.timestamp || e.createdAt);
      if (!ymd) continue;
      if (!map.has(ymd)) map.set(ymd, []);
      map.get(ymd)!.push(e);
    }
    const keys = [...map.keys()].sort((a, b) => b.localeCompare(a));
    return keys.map((ymd) => ({
      ymd,
      label: formatDateHeader(ymd),
      items: map.get(ymd)!,
    }));
  }, [filtered, rangeDayCount]);

  useEffect(() => {
    setPage(1);
  }, [activeStart, activeEnd, selectedOutletId]);

  const goPrevDay = () => {
    if (rangeMode !== 'single') return;
    const [y, m, d] = viewDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d - 1);
    setViewDate(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
    setPage(1);
  };

  const goNextDay = () => {
    if (rangeMode !== 'single') return;
    const [y, m, d] = viewDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d + 1);
    const today = new Date();
    if (dt > today) return;
    setViewDate(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
    setPage(1);
  };

  const goToday = () => {
    setRangeMode('single');
    setViewDate(todayYMD());
    setPage(1);
  };

  const openCustomModal = () => {
    const t = todayYMD();
    if (rangeMode !== 'custom' || !customStart || !customEnd) {
      setCustomStart(viewDate);
      setCustomEnd(t);
    }
    setCustomModalOpen(true);
  };

  const applyCustomRange = () => {
    if (!customStart || !customEnd || customStart > customEnd) return;
    const a = new Date(customStart + 'T12:00:00');
    const b = new Date(customEnd + 'T12:00:00');
    const days = Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (days > CUSTOM_RANGE_MAX_DAYS) {
      alert(`Choose at most ${CUSTOM_RANGE_MAX_DAYS} days.`);
      return;
    }
    setRangeMode('custom');
    setCustomModalOpen(false);
    setPage(1);
  };

  if (!selectedOutletId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <p className="text-amber-600 text-lg">Select an outlet first.</p>
      </div>
    );
  }

  const renderEventRow = (event: ActivityEvent, key: string) => {
    const ts = event.timestamp || event.createdAt || '';
    const visuals = getEventVisuals(event.type, event.subType);
    const Icon = visuals.icon;
    const typeLine = displayTypeLine(event);
    const desc = event.description || event.label || (event.taskTitle ? `Completed “${event.taskTitle}”` : '');
    return (
      <div key={key} className="relative flex gap-4 pl-1 py-3">
        <div className={`relative z-10 shrink-0 w-11 h-11 rounded-xl ${visuals.bg} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${visuals.text}`} />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            {event.employeeName && <span className="text-sm font-semibold text-gray-900">{event.employeeName}</span>}
            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${visuals.bg} ${visuals.text} capitalize`}>
              {typeLine}
            </span>
            {ts && (
              <span className="text-xs text-gray-400 ml-auto shrink-0 flex items-center gap-1">
                <Clock className="h-3 w-3" /> {formatTime(ts)}
              </span>
            )}
          </div>
          {desc ? <p className="text-sm text-gray-600 mt-0.5">{desc}</p> : null}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
        <p className="text-gray-500 mt-1">Track all outlet events, punch-ins, task completions, and more</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
          {rangeMode === 'single' ? (
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
              <button onClick={goPrevDay} className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all" title="Previous day">
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
              <span className="px-3 py-1.5 text-sm font-semibold text-gray-800 min-w-[180px] text-center">{rangeCaption}</span>
              <button
                onClick={goNextDay}
                disabled={isToday}
                className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next day"
              >
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
              {!isToday && (
                <button onClick={goToday} className="px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-white rounded-lg transition-all">
                  Today
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-semibold text-emerald-900">
              <CalendarRange className="h-4 w-4 shrink-0" />
              <span>{rangeCaption}</span>
              <button type="button" onClick={goToday} className="ml-2 text-xs font-medium text-emerald-700 hover:underline">
                Clear
              </button>
            </div>
          )}
          {rangeMode === 'single' ? (
            <input
              type="date"
              value={viewDate}
              max={todayYMD()}
              onChange={(e) => {
                setViewDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
            />
          ) : null}
          <button
            type="button"
            onClick={openCustomModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
          >
            <CalendarRange className="h-4 w-4 text-emerald-600" />
            Custom range
          </button>
          <ListSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, type..."
            className="flex-1 max-w-sm min-w-[200px]"
            id="activity-search"
            aria-label="Search activity"
          />
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors shrink-0"
            title="Refresh"
          >
            <RefreshCcw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {pagination?.total != null ? (
          <p className="text-xs text-gray-400">
            {pagination.total} event{pagination.total === 1 ? '' : 's'} in this range (page {page})
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Activity className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500">{searchQuery.trim() ? 'No matching activity.' : 'No activity recorded for this period.'}</p>
        </div>
      ) : (
        <div className="relative animate-in-stagger">
          <div className="absolute left-6 top-2 bottom-2 w-px bg-gray-200" aria-hidden />

          {groupedByDay && groupedByDay.length > 0 ? (
            <div className="space-y-8">
              {groupedByDay.map((group) => (
                <div key={group.ymd}>
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2 pl-14">{group.label}</h2>
                  <div className="space-y-1">{group.items.map((event, i) => renderEventRow(event, `${group.ymd}-${event.timestamp || i}-${i}`))}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">{filtered.map((event, i) => renderEventRow(event, `${event.timestamp || event._id || i}-${i}`))}</div>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {customModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Custom date range</h2>
            <p className="text-sm text-gray-500">Up to {CUSTOM_RANGE_MAX_DAYS} days. Uses outlet local calendar dates.</p>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Start</label>
              <input
                type="date"
                value={customStart}
                max={todayYMD()}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">End</label>
              <input
                type="date"
                value={customEnd}
                max={todayYMD()}
                min={customStart || undefined}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setCustomModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">
                Cancel
              </button>
              <button
                type="button"
                onClick={applyCustomRange}
                disabled={!customStart || !customEnd || customStart > customEnd}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
