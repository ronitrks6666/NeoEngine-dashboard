import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { leaveApi } from '@/api/leave';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { CalendarDays, Save, Plus, X, RefreshCcw, Info, Ban, Crown } from 'lucide-react';

interface LeaveRule {
  maxLeavesPerMonth?: number;
  maxConsecutiveDays?: number;
  noticeDaysRequired?: number;
  blockedDates?: string[];
  allowedLeaveTypes?: string[];
  weeklyOffBlockedDays?: string[];
  blockPublicHoliday?: boolean;
}

interface Holiday {
  _id: string;
  date: string;
  name: string;
  primaryType: string;
}

function formatDateLong(ymd: string) {
  const [y, mo, da] = ymd.split('-').map(Number);
  const d = new Date(y, mo - 1, da);
  if (isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function LeaveRulesPage() {
  const { selectedOutletId } = useOutletStore();
  const queryClient = useQueryClient();
  const [rules, setRules] = useState<LeaveRule>({});
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['leave-rules', selectedOutletId],
    queryFn: () => leaveApi.getRules(selectedOutletId!),
    enabled: !!selectedOutletId,
  });

  useEffect(() => {
    if (data?.data) {
      setRules({
        maxLeavesPerMonth: data.data.maxLeavesPerMonth,
        maxConsecutiveDays: data.data.maxConsecutiveDays,
        noticeDaysRequired: data.data.noticeDaysRequired,
        blockedDates: (data.data.blockedSpecificDates ?? []).map((d: string) => d.split('T')[0]),
        allowedLeaveTypes: data.data.allowedLeaveTypes ?? [],
        weeklyOffBlockedDays: data.data.weeklyOffBlockedDays ?? [],
        blockPublicHoliday: data.data.blockPublicHoliday ?? false,
      });
    }
  }, [data]);

  const { data: holidayData } = useQuery({
    queryKey: ['calendarific-holidays', selectedOutletId],
    queryFn: () => leaveApi.getCalendarificHolidays(selectedOutletId!),
    enabled: !!selectedOutletId,
  });

  const holidays = (holidayData?.data ?? []) as Holiday[];

  const saveMutation = useMutation({
    mutationFn: () => leaveApi.updateRules(selectedOutletId!, rules),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-rules', selectedOutletId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const set = <K extends keyof LeaveRule>(key: K, val: LeaveRule[K]) => {
    setRules((prev) => ({ ...prev, [key]: val }));
  };

  const addBlockedDate = () => {
    if (!newBlockedDate) return;
    const existing = rules.blockedDates ?? [];
    if (!existing.includes(newBlockedDate)) {
      set('blockedDates', [...existing, newBlockedDate].sort());
    }
    setNewBlockedDate('');
  };

  const removeBlockedDate = (date: string) => {
    set('blockedDates', (rules.blockedDates ?? []).filter((d) => d !== date));
  };

  const toggleWeeklyOff = (day: string) => {
    const curr = rules.weeklyOffBlockedDays ?? [];
    set('weeklyOffBlockedDays', curr.includes(day) ? curr.filter(d => d !== day) : [...curr, day]);
  };

  const toggleHolidayBlocked = (date: string) => {
    const curr = rules.blockedDates ?? [];
    set('blockedDates', curr.includes(date) ? curr.filter(d => d !== date) : [...curr, date].sort());
  };

  if (!selectedOutletId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <p className="text-amber-600">Select an outlet first.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Rules</h1>
          <p className="text-gray-500 mt-1">Configure leave allowances, limits, and blocked dates for this outlet</p>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm shrink-0 ${
            saved ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
          }`}
        >
          {saveMutation.isPending ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved!' : 'Save Rules'}
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="space-y-6">
          {/* Weekly Off Blocks */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Ban className="h-5 w-5 text-amber-500" /> Weekly Off Restriction
              </h2>
              <p className="text-xs text-gray-500 mt-1">Block staff from taking leave on specific recurring weekdays</p>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                  const selected = (rules.weeklyOffBlockedDays ?? []).includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWeeklyOff(day)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                        selected
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Public Holiday & Limits */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-violet-600" /> Leave Limits & Holidays
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <p className="font-bold text-gray-900">Block Public Holidays</p>
                  <p className="text-xs text-gray-500">Automatically block leave on official Indian holidays</p>
                </div>
                <button
                  type="button"
                  onClick={() => set('blockPublicHoliday', !rules.blockPublicHoliday)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    rules.blockPublicHoliday ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      rules.blockPublicHoliday ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Max Leaves / Month</label>
                  <input
                    type="number"
                    min={0}
                    max={31}
                    value={rules.maxLeavesPerMonth ?? ''}
                    onChange={(e) => set('maxLeavesPerMonth', e.target.value === '' ? undefined : parseInt(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm"
                    placeholder="e.g. 2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Max Consecutive</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={rules.maxConsecutiveDays ?? ''}
                    onChange={(e) => set('maxConsecutiveDays', e.target.value === '' ? undefined : parseInt(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm"
                    placeholder="e.g. 3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Notice Required</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={rules.noticeDaysRequired ?? ''}
                    onChange={(e) => set('noticeDaysRequired', e.target.value === '' ? undefined : parseInt(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm"
                    placeholder="e.g. 1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Public Holidays View */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Crown className="h-5 w-5 text-emerald-600" /> Indian Public Holidays
              </h2>
              <p className="text-xs text-gray-500 mt-1">Official holidays for this year. Toggle to block specifically.</p>
            </div>
            <div className="p-0 max-h-[400px] overflow-y-auto">
              <div className="divide-y divide-gray-100">
                {holidays.map((h) => {
                  const isBlocked = (rules.blockedDates ?? []).includes(h.date);
                  return (
                    <div key={h._id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{h.name}</p>
                        <p className="text-xs text-gray-500">{formatDateLong(h.date)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleHolidayBlocked(h.date)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isBlocked
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100'
                        }`}
                      >
                        {isBlocked ? 'Blocked' : 'Available'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Blocked Dates */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Ban className="h-5 w-5 text-red-500" /> Blocked Dates
              </h2>
              <p className="text-xs text-gray-500 mt-1">Staff cannot submit leave requests for these dates</p>
            </div>
            <div className="p-6">
              <div className="flex gap-2 mb-4">
                <input
                  type="date"
                  value={newBlockedDate}
                  min={todayYMD()}
                  onChange={(e) => setNewBlockedDate(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-400 text-sm"
                />
                <button
                  type="button"
                  onClick={addBlockedDate}
                  disabled={!newBlockedDate}
                  className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Block
                </button>
              </div>

              {(rules.blockedDates ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No blocked dates. Add dates above to prevent leave requests.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(rules.blockedDates ?? []).map((date) => (
                    <div key={date} className="flex items-center justify-between px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                      <span className="text-sm font-medium text-red-800">{formatDateLong(date)}</span>
                      <button
                        type="button"
                        onClick={() => removeBlockedDate(date)}
                        className="p-1 rounded-lg hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Leave Types */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-900">Allowed Leave Types</h2>
              <p className="text-xs text-gray-500 mt-1">Select which types of leave staff can apply for</p>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {['casual', 'sick', 'earned', 'maternity', 'paternity', 'unpaid', 'emergency'].map((type) => {
                  const selected = (rules.allowedLeaveTypes ?? []).includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        const curr = rules.allowedLeaveTypes ?? [];
                        set('allowedLeaveTypes', selected ? curr.filter((t) => t !== type) : [...curr, type]);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all border ${
                        selected
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-3">Select none to allow all leave types</p>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-50 border border-violet-100">
            <Info className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
            <p className="text-sm text-violet-700">These rules apply to new leave requests. Existing approved leaves are not affected.</p>
          </div>

          {saveMutation.isError && (
            <p className="p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
              Failed to save rules. Please try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
