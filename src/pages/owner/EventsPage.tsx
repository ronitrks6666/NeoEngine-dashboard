import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { leaveApi } from '@/api/leave';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  CalendarPlus,
  Plus,
  X,
  Trash2,
  Calendar,
  Clock,
  Sun,
} from 'lucide-react';

interface OutletCalendarEvent {
  _id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
}

function formatDateLong(ymd: string) {
  const [y, mo, da] = ymd.split('-').map(Number);
  const d = new Date(y, mo - 1, da);
  if (isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTimeNice(hhmm: string) {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return hhmm;
  const h = parseInt(m[1]);
  const mi = parseInt(m[2]);
  const d = new Date();
  d.setHours(h, mi, 0, 0);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function isAllDay(startTime: string, endTime: string) {
  return (startTime === '00:00' && endTime === '23:59');
}

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

export function EventsPage() {
  const { selectedOutletId } = useOutletStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<OutletCalendarEvent | null>(null);

  // Create form
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(todayYMD());
  const [isAllDayMode, setIsAllDayMode] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [createError, setCreateError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['outlet-events', selectedOutletId],
    queryFn: () => leaveApi.getOutletEvents(selectedOutletId!),
    enabled: !!selectedOutletId,
  });

  const allEvents: OutletCalendarEvent[] = data?.data?.events ?? [];

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const { upcoming, history } = useMemo(() => {
    const up: OutletCalendarEvent[] = [];
    const hi: OutletCalendarEvent[] = [];
    for (const ev of allEvents) {
      const [y, mo, da] = ev.date.split('-').map(Number);
      const t0 = new Date(y, mo - 1, da).getTime();
      if (isNaN(t0)) continue;
      if (t0 >= todayStart) up.push(ev);
      else hi.push(ev);
    }
    up.sort((a, b) => a.date.localeCompare(b.date));
    hi.sort((a, b) => b.date.localeCompare(a.date));
    return { upcoming: up, history: hi };
  }, [allEvents, todayStart]);

  const listData = tab === 'upcoming' ? upcoming : history;

  const createMutation = useMutation({
    mutationFn: () =>
      leaveApi.createOutletEvent(selectedOutletId!, {
        name: eventName.trim(),
        date: eventDate,
        startTime: isAllDayMode ? '00:00' : startTime,
        endTime: isAllDayMode ? '23:59' : endTime,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlet-events'] });
      setShowCreate(false);
      resetForm();
    },
    onError: (err) => setCreateError(err instanceof Error ? err.message : 'Failed to create event'),
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => leaveApi.deleteOutletEvent(selectedOutletId!, eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlet-events'] });
      setConfirmDelete(null);
    },
  });

  const resetForm = () => {
    setEventName('');
    setEventDate(todayYMD());
    setIsAllDayMode(false);
    setStartTime('09:00');
    setEndTime('18:00');
    setCreateError('');
  };

  const handleCreate = () => {
    if (!eventName.trim()) {
      setCreateError('Event name is required');
      return;
    }
    createMutation.mutate();
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-500 mt-1">Outlet calendar events that block leave requests</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError(''); }}
          className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-violet-700 text-white rounded-xl font-semibold hover:from-violet-700 hover:to-violet-800 transition-all shadow-sm flex items-center gap-2 w-fit"
        >
          <Plus className="h-5 w-5" /> Add Event
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl w-fit">
        {(['upcoming', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : listData.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-violet-500" />
          </div>
          <p className="text-gray-500">{tab === 'upcoming' ? 'No upcoming events.' : 'No past events.'}</p>
        </div>
      ) : (
        <div className="grid gap-3 animate-in-stagger">
          {listData.map((ev) => (
            <div
              key={ev._id}
              className="rounded-2xl border border-gray-200 bg-white p-5 flex items-start justify-between card-hover transition-all"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-lg">{ev.name}</p>
                <p className="text-gray-500 text-sm mt-1 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 shrink-0" /> {formatDateLong(ev.date)}
                </p>
                <p className="text-violet-600 text-sm font-medium mt-0.5 flex items-center gap-1.5">
                  {isAllDay(ev.startTime, ev.endTime) ? (
                    <><Sun className="h-4 w-4 shrink-0" /> All Day</>
                  ) : (
                    <><Clock className="h-4 w-4 shrink-0" /> {formatTimeNice(ev.startTime)} → {formatTimeNice(ev.endTime)}</>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-2">Leave requests will be blocked on this date</p>
              </div>
              <button
                onClick={() => setConfirmDelete(ev)}
                className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors shrink-0"
                title="Delete event"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto animate-slide-up overflow-hidden border border-gray-100 relative">
            <button type="button" onClick={() => setShowCreate(false)} className="absolute top-4 right-4 p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors z-10" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="bg-gradient-to-br from-violet-600 to-violet-700 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <CalendarPlus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Create Event</h2>
                  <p className="text-violet-100 text-sm mt-0.5">Leave will be blocked for this date</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {createError && <p className="p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{createError}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Event Name *</label>
                <input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  placeholder="e.g. Company Anniversary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date *</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">All Day?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAllDayMode(false)}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                      !isAllDayMode ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAllDayMode(true)}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isAllDayMode ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>
              {!isAllDayMode && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="flex-1 px-5 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-50 transition-all"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Event'}
                </button>
                <button onClick={() => setShowCreate(false)} className="px-5 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 animate-slide-up relative">
            <button type="button" onClick={() => setConfirmDelete(null)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <p className="text-gray-900 font-medium pr-8">Delete &quot;{confirmDelete.name}&quot;?</p>
            <p className="text-sm text-gray-500 mt-1">Leave requests will no longer be blocked on this date.</p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => deleteMutation.mutate(confirmDelete._id)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
