import { useState, useMemo } from 'react';
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
  _id: string;
  type: string;
  description?: string;
  employeeName?: string;
  timestamp?: string;
  createdAt?: string;
  data?: Record<string, unknown>;
}

// Map event types to icons and colors
function getEventVisuals(type: string) {
  const t = type.toLowerCase();
  if (t.includes('punch_in') || t.includes('checkin')) return { icon: LogIn, bg: 'bg-emerald-100', text: 'text-emerald-600' };
  if (t.includes('punch_out') || t.includes('checkout')) return { icon: LogOut, bg: 'bg-red-100', text: 'text-red-600' };
  if (t.includes('task')) return { icon: CheckSquare, bg: 'bg-blue-100', text: 'text-blue-600' };
  if (t.includes('issue')) return { icon: AlertTriangle, bg: 'bg-orange-100', text: 'text-orange-600' };
  if (t.includes('break')) return { icon: Coffee, bg: 'bg-amber-100', text: 'text-amber-600' };
  if (t.includes('leave')) return { icon: CalendarDays, bg: 'bg-violet-100', text: 'text-violet-600' };
  return { icon: Activity, bg: 'bg-gray-100', text: 'text-gray-600' };
}

export function ActivityPage() {
  const { selectedOutletId } = useOutletStore();
  const [viewDate, setViewDate] = useState(todayYMD());
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 350);
  const [page, setPage] = useState(1);

  const isToday = viewDate === todayYMD();

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['outlet-activity', selectedOutletId, viewDate, page],
    queryFn: () =>
      activityApi.getOutletActivity(selectedOutletId!, {
        startDate: viewDate,
        endDate: viewDate,
        page,
        limit: 50,
      }),
    enabled: !!selectedOutletId,
  });

  const rawData = data?.data ?? data?.activities ?? data ?? [];
  const activities: ActivityEvent[] = Array.isArray(rawData) ? rawData : [];

  // Search filter
  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return activities;
    const lower = debouncedSearch.toLowerCase();
    return activities.filter(
      (a) =>
        (a.description || '').toLowerCase().includes(lower) ||
        (a.employeeName || '').toLowerCase().includes(lower) ||
        a.type.toLowerCase().includes(lower)
    );
  }, [activities, debouncedSearch]);

  const goPrevDay = () => {
    const [y, m, d] = viewDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d - 1);
    setViewDate(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
    setPage(1);
  };

  const goNextDay = () => {
    const [y, m, d] = viewDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d + 1);
    const today = new Date();
    if (dt > today) return;
    setViewDate(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
    setPage(1);
  };

  const goToday = () => {
    setViewDate(todayYMD());
    setPage(1);
  };

  if (!selectedOutletId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <p className="text-amber-600 text-lg">Select an outlet first.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
        <p className="text-gray-500 mt-1">Track all outlet events, punch-ins, task completions, and more</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
          <button onClick={goPrevDay} className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all" title="Previous day">
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <span className="px-3 py-1.5 text-sm font-semibold text-gray-800 min-w-[180px] text-center">
            {formatDateHeader(viewDate)}
          </span>
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
        <input
          type="date"
          value={viewDate}
          max={todayYMD()}
          onChange={(e) => { setViewDate(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
        />
        <ListSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name, type..."
          className="flex-1 max-w-sm"
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

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Activity className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500">{searchQuery.trim() ? 'No matching activity.' : 'No activity recorded for this day.'}</p>
        </div>
      ) : (
        <div className="relative animate-in-stagger">
          {/* Timeline line */}
          <div className="absolute left-6 top-2 bottom-2 w-px bg-gray-200" aria-hidden />

          <div className="space-y-1">
            {filtered.map((event) => {
              const ts = event.timestamp || event.createdAt || '';
              const visuals = getEventVisuals(event.type);
              const Icon = visuals.icon;
              return (
                <div key={event._id} className="relative flex gap-4 pl-1 py-3">
                  {/* Icon */}
                  <div className={`relative z-10 shrink-0 w-11 h-11 rounded-xl ${visuals.bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${visuals.text}`} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {event.employeeName && (
                        <span className="text-sm font-semibold text-gray-900">{event.employeeName}</span>
                      )}
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${visuals.bg} ${visuals.text} capitalize`}>
                        {event.type.replace(/_/g, ' ')}
                      </span>
                      {ts && (
                        <span className="text-xs text-gray-400 ml-auto shrink-0 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatTime(ts)}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-0.5">{event.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
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
            disabled={filtered.length < 50}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
