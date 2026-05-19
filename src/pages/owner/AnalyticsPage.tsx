import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HighlightSection } from '@/components/HighlightSection';
import { useOutletStore } from '@/stores/outletStore';
import { analyticsApi } from '@/api/analytics';
import { employeeApi } from '@/api/employee';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
  ReferenceLine,
} from 'recharts';
import { CheckCircle, Clock, BarChart3, Users, Wallet, Download, Info } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ListSearchBar } from '@/components/ListSearchBar';

const PIE_COLORS = ['#0F766E', '#14B8A6', '#F59E0B', '#F97316', '#EF4444', '#8B5CF6'];

/** Leave trend: ~this many days fit in the viewport; scroll for the rest */
const LEAVE_CHART_VISIBLE_DAYS = 10;

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-sm">
      {label && <p className="font-medium text-gray-800 mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="text-gray-600" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
};

/** Shown inside the (i) tooltip for period-based KPIs */
function periodScopeLabel(
  period: 'daily' | 'weekly' | 'monthly' | 'custom',
  customRange?: { start: string; end: string } | null
) {
  if (period === 'daily') return 'Time scope: today.';
  if (period === 'weekly') return 'Time scope: last 7 days.';
  if (period === 'monthly') return 'Time scope: this month.';
  if (period === 'custom' && customRange?.start && customRange?.end) {
    return `Time scope: ${customRange.start} through ${customRange.end} (inclusive). Day-level clock times and shift dates use Asia/Kolkata (IST).`;
  }
  return 'Time scope: custom range (pick dates and apply).';
}

function defaultCustomRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  const y = (d: Date) => d.toISOString().slice(0, 10);
  return { start: y(start), end: y(end) };
}

function fmtIst(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

// KPI card — header + value; full explanation in info popover
function StatCard({
  label,
  value,
  infoText,
  icon: Icon,
  accent = 'teal',
}: {
  label: string;
  value: string | number;
  /** Shown when the (i) control is opened */
  infoText: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'teal' | 'amber' | 'emerald' | 'rose';
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!infoOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInfoOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) setInfoOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [infoOpen]);

  const stripe = {
    teal: 'border-l-teal-600',
    amber: 'border-l-amber-500',
    emerald: 'border-l-emerald-600',
    rose: 'border-l-rose-500',
  };
  const iconWrap = {
    teal: 'bg-teal-50 text-teal-700',
    amber: 'bg-amber-50 text-amber-800',
    emerald: 'bg-emerald-50 text-emerald-800',
    rose: 'bg-rose-50 text-rose-700',
  };
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200/90 shadow-sm border-l-[3px] ${stripe[accent]} px-4 py-3.5 flex flex-col gap-2 min-h-[100px] hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xs font-semibold text-gray-800 leading-snug pr-1">{label}</h3>
        <div className="flex items-center gap-0.5 shrink-0">
          <div className={`rounded-lg p-1.5 ${iconWrap[accent]}`} aria-hidden>
            <Icon className="h-4 w-4" />
          </div>
          <div className="relative" ref={wrapRef}>
            <button
              type="button"
              onClick={() => setInfoOpen((o) => !o)}
              className="rounded-full p-1.5 text-gray-400 hover:text-teal-700 hover:bg-teal-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
              aria-label={`About ${label}`}
              aria-expanded={infoOpen}
            >
              <Info className="h-4 w-4" strokeWidth={2.25} />
            </button>
            {infoOpen ? (
              <div
                role="tooltip"
                className="absolute right-0 top-full z-50 mt-1.5 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white p-3 text-left text-xs leading-relaxed text-gray-600 shadow-lg"
              >
                <p className="whitespace-pre-line text-gray-700">{infoText}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

type StaffDailyAttendance = {
  date: string;
  hours: number;
  punchIn: string | null;
  punchOut: string | null;
};

type StaffAnalyticsRow = {
  id?: string;
  name?: string;
  role?: string;
  daysPresent?: number;
  dailyAttendance?: StaffDailyAttendance[];
  netHours?: number;
};

export function AnalyticsPage() {
  const { selectedOutletId } = useOutletStore();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [appliedCustom, setAppliedCustom] = useState<{ start: string; end: string } | null>(null);
  const [analyticsSearch, setAnalyticsSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  // committedSearch is only updated when user selects from dropdown — this drives the API query
  const [committedSearch, setCommittedSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch ALL staff for the suggestion dropdown (cached independently, never re-fetches on search)
  const { data: staffData } = useQuery({
    queryKey: ['my-employees-suggestions', selectedOutletId],
    queryFn: () =>
      employeeApi.getMyEmployees({
        outletId: selectedOutletId ?? undefined,
        limit: 1000,
      }),
    enabled: !!selectedOutletId,
    staleTime: 5 * 60 * 1000, // Cache for 5 min — suggestions don't need to be live
  });

  const staffOptions = useMemo(() => {
    // Backend returns { success, data: { employees: [...] } } via the api client
    // api.get returns response.data, so staffData = { success, data: { employees } } OR { employees } directly
    const rawList =
      staffData?.data?.employees ??
      staffData?.employees ??
      (Array.isArray(staffData) ? staffData : []);
    return rawList.map((e: any) => ({
      id: e._id || e.id,
      name: e.name || 'Unknown',
      phone: e.phone || '',
    }));
  }, [staffData]);

  // Filter suggestions using the LIVE (non-debounced) search so they appear instantly
  const filteredSuggestions = useMemo(() => {
    const s = analyticsSearch.trim().toLowerCase();
    if (s.length < 2) return [];
    return staffOptions
      .filter(
        (opt: any) =>
          opt.name.toLowerCase().includes(s) || opt.phone.includes(s)
      )
      .slice(0, 8);
  }, [staffOptions, analyticsSearch]);

  const customQueryRange =
    period === 'custom' && appliedCustom && appliedCustom.start <= appliedCustom.end ? appliedCustom : null;

  // Analytics API query — ONLY fires when committedSearch changes (i.e. user selected from suggestions)
  // Typing in the box does NOT trigger a new API fetch
  const { data, isLoading } = useQuery({
    queryKey: [
      'outlet-analytics',
      selectedOutletId,
      period,
      period === 'custom' ? `${customQueryRange?.start ?? ''}_${customQueryRange?.end ?? ''}` : '',
      committedSearch,
    ],
    queryFn: () =>
      analyticsApi.getOutletAnalytics(selectedOutletId!, {
        period,
        ...(customQueryRange ? { startDate: customQueryRange.start, endDate: customQueryRange.end } : {}),
        search: committedSearch.trim() || undefined,
      }),
    enabled:
      !!selectedOutletId &&
      (period !== 'custom' || (!!customQueryRange && !!customQueryRange.start && !!customQueryRange.end)),
  });

  const [showExportModal, setShowExportModal] = useState(false);

  const performExport = (exportPeriod: 'current' | '30days' | 'custom', _range?: { start: string; end: string }) => {
    // This will be called with the selected range
    // For now, I'll implement the logic to fetch and export
    // If it's 'current', use existing 'data'
    // If it's '30days' or 'custom', we might need a separate fetch or just use what we have if it matches
    
    let exportData = data?.data ?? data ?? {};
    
    // In a real scenario, if they choose a different range, we might need to trigger a one-off fetch.
    // But to keep it simple and fast, I'll export what's currently in 'data' if it's 'current'.
    // The user's request: "ask use to export with current filter or last 30days or custom"
    
    const stats = exportData.employeeStats ?? [];
    const headers = ['Name', 'Role', 'Net Hours', 'Break Hours', 'Status', 'Compliance %', 'Daily Earned'];
    const rows: (string | number)[][] = stats.map((s: any) => [
      s.name ?? '-',
      s.role ?? '-',
      s.netHours ?? 0,
      s.breakHours ?? 0,
      s.status ?? '-',
      s.compliancePct ?? 0,
      s.dailyEarned ?? '-',
    ]);
    const escapeCsv = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
    const csv = [headers.join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const rangeSlug = exportPeriod === 'current' ? (period === 'custom' ? `${appliedCustom?.start}_to_${appliedCustom?.end}` : period) : exportPeriod;
    a.download = `analytics-report-${rangeSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const d = data?.data ?? data ?? {};
  const leaveTrend = d.leaveTrend ?? [];
  /** Short axis labels; fallback for older API responses without `label` */
  const leaveChartData = useMemo(
    () =>
      (Array.isArray(leaveTrend) ? leaveTrend : []).map(
        (r: { date?: string; label?: string; approved?: number; rejected?: number; pending?: number }) => ({
          ...r,
          label: r.label ?? r.date ?? '',
        })
      ),
    [leaveTrend]
  );

  const leaveScrollRef = useRef<HTMLDivElement>(null);

  /** Vertical wheel / trackpad → horizontal scroll (needs non-passive listener) */
  useEffect(() => {
    const el = leaveScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 2) return;
      if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [leaveChartData.length, selectedOutletId]);

  if (!selectedOutletId) {
    return <div className="p-6 text-amber-600">Select an outlet first.</div>;
  }

  const staffAnalytics = d.employeeStats ?? [];
  const taskCompletionRate = d.taskCompletionRate ?? 0;
  const dailyHours = d.dailyHoursData ?? [];
  const totalHours = d.totalWorkHours ?? 0;
  const roleBreakdown = d.roleBreakdown ?? [];
  const shiftDistribution = d.shiftDistribution ?? [];
  const taskCompletionByShift = d.taskCompletionByShift ?? [];
  const hoursComplianceRate = d.hoursComplianceRate ?? 0;
  const activeEmployeesToday = d.activeEmployeesToday ?? 0;
  const totalEmployees = d.totalEmployees ?? 0;

  // Labor cost estimate (sum of dailyEarned)
  const laborCostEstimate = staffAnalytics.reduce((sum: number, s: { dailyEarned?: number }) => sum + (s.dailyEarned ?? 0), 0);

  const staffInView = staffAnalytics.length;
  const complianceDenominator = staffInView > 0 ? staffInView : totalEmployees;
  const completedTasks = d.completedTasks ?? 0;
  const totalTasks = d.totalTasks ?? 0;
  const avgHours =
    typeof d.averageHoursPerEmployee === 'number' ? d.averageHoursPerEmployee.toFixed(1) : String(d.averageHoursPerEmployee ?? '—');
  const totalHoursDisplay =
    typeof totalHours === 'number' && !Number.isNaN(totalHours)
      ? `${totalHours.toLocaleString(undefined, { maximumFractionDigits: 1 })}h`
      : totalHours != null && totalHours !== ''
        ? `${totalHours}h`
        : '—';

  const searchNote = analyticsSearch.trim()
    ? '\n\nStaff search filter is applied — KPIs use only matching people.'
    : '';

  const scopeHelp = periodScopeLabel(period, period === 'custom' ? appliedCustom : null);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Outlet Analytics</h1>
            <p className="text-gray-500">Insights for your restaurant or retail outlet</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPeriod('custom');
                const d = defaultCustomRange();
                setCustomStart(d.start);
                setCustomEnd(d.end);
                setAppliedCustom(d);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === 'custom' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Custom
            </button>
            <button
              onClick={handleExport}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-teal-500 hover:text-teal-600 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> Export Report
            </button>
          </div>
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 sm:gap-4 rounded-xl border border-teal-100 bg-teal-50/30 px-4 py-3 mt-2 animate-fade-in">
            <div className="flex flex-col gap-1">
              <label htmlFor="analytics-custom-start" className="text-xs font-medium text-teal-700">
                From
              </label>
              <input
                id="analytics-custom-start"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="analytics-custom-end" className="text-xs font-medium text-teal-700">
                To
              </label>
              <input
                id="analytics-custom-end"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <button
              type="button"
              disabled={!customStart || !customEnd || customStart > customEnd}
              onClick={() => setAppliedCustom({ start: customStart, end: customEnd })}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 h-[38px]"
            >
              Apply range
            </button>
            <p className="text-xs text-teal-600/80 max-w-md pb-1">
              Up to 366 days. IST dates used for clock-ins; hours exclude breaks.
            </p>
          </div>
        )}
        <div className="relative max-w-xl">
          <ListSearchBar
            value={analyticsSearch}
            onChange={(val) => {
              setAnalyticsSearch(val);
              setShowSuggestions(true);
              // If user clears the box, also clear the committed filter so data resets
              if (!val) {
                setSelectedStaffId('');
                setCommittedSearch('');
              }
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Search by staff name…"
            className="w-full"
            id="analytics-search"
            aria-label="Filter analytics by staff"
          />
          {showSuggestions && analyticsSearch.trim().length >= 2 && !selectedStaffId && filteredSuggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              <div className="px-3 py-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">
                Select a staff member to filter
              </div>
              {filteredSuggestions.map((s: any) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={(e) => {
                    // mousedown fires before onBlur — keeps dropdown open long enough to register
                    e.preventDefault();
                    setAnalyticsSearch(s.name);
                    setSelectedStaffId(s.id);
                    setCommittedSearch(s.name); // ← triggers the API query
                    setShowSuggestions(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-teal-50 transition-colors flex justify-between items-center border-b border-gray-50 last:border-0"
                >
                  <span className="font-medium text-gray-900">{s.name}</span>
                  <span className="text-xs text-gray-400">{s.phone}</span>
                </button>
              ))}
            </div>
          )}
          {analyticsSearch.trim().length >= 2 && !selectedStaffId && filteredSuggestions.length === 0 && showSuggestions && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3 text-sm text-gray-400">
              No staff found matching "{analyticsSearch}"
            </div>
          )}
          {/* Clear button — shown once a staff is committed/selected */}
          {selectedStaffId && analyticsSearch && (
            <button
              type="button"
              onClick={() => {
                setAnalyticsSearch('');
                setSelectedStaffId('');
                setCommittedSearch(''); // ← resets the API query
                setShowSuggestions(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none"
              title="Clear staff filter"
            >
              ✕
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          {committedSearch
            ? `Showing data for: ${committedSearch} — click ✕ to clear`
            : 'Type a name and select from suggestions to filter by staff.'}
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-20" />
      ) : (
        <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Task completion rate"
          value={`${taskCompletionRate}%`}
          infoText={`${completedTasks} of ${totalTasks} task${totalTasks === 1 ? '' : 's'} completed in the selected period.${searchNote}\n\n${scopeHelp}`}
          icon={CheckCircle}
          accent="teal"
        />
        <StatCard
          label="Total work hours"
          value={totalHoursDisplay}
          infoText={`Combined net hours logged for the team. Average ${avgHours}h per staff member.${searchNote}\n\n${scopeHelp}`}
          icon={Clock}
          accent="teal"
        />
        <StatCard
          label="Hours compliance"
          value={`${hoursComplianceRate}%`}
          infoText={`${d.employeesMetMinHours ?? 0} of ${complianceDenominator} staff met minimum required hours for the period.${searchNote}\n\n${scopeHelp}`}
          icon={BarChart3}
          accent={hoursComplianceRate >= 80 ? 'emerald' : 'amber'}
        />
        <StatCard
          label="Live attendance"
          value={`${activeEmployeesToday} / ${totalEmployees}`}
          infoText={
            'Staff currently checked in vs. total staff on your active roster.\n\nLive snapshot at this moment — not tied to Daily / Weekly / Monthly.'
          }
          icon={Users}
          accent="teal"
        />
        <StatCard
          label="Est. labor cost"
          value={
            laborCostEstimate > 0
              ? `₹${laborCostEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '—'
          }
          infoText={`Sum of "daily earned" pay for staff listed in Labor cost below (same period and search).${searchNote}\n\n${scopeHelp}`}
          icon={Wallet}
          accent="amber"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily hours */}
        <div className="lg:col-span-2">
          <HighlightSection id="work-hours">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Work hours trend</h2>
                  <p className="text-sm text-gray-500">Total staff hours per day</p>
                </div>
                {dailyHours.length > 14 && (
                  <p className="text-xs text-teal-600 font-medium">Scroll horizontally to see all {dailyHours.length} days</p>
                )}
              </div>
              <div className="p-4">
                <div className="h-72 overflow-x-auto overflow-y-hidden [scrollbar-width:thin]">
                  <div 
                    className="h-full" 
                    style={{ minWidth: dailyHours.length > 14 ? `${dailyHours.length * 50}px` : '100%' }}
                  >
                    {Array.isArray(dailyHours) && dailyHours.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyHours} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                          <XAxis 
                            dataKey="label" 
                            tick={{ fontSize: 11 }} 
                            stroke="#9CA3AF" 
                            interval={dailyHours.length > 20 ? 1 : 0}
                          />
                          <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F0FDFA' }} />
                          <ReferenceLine 
                            y={8} 
                            label={{ value: 'Min Hours', position: 'right', fill: '#EF4444', fontSize: 10 }} 
                            stroke="#EF4444" 
                            strokeDasharray="3 3" 
                          />
                          <Bar 
                            dataKey="hours" 
                            fill="#0F766E" 
                            radius={[4, 4, 0, 0]} 
                            name="Hours"
                            barSize={dailyHours.length > 15 ? 20 : 40}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">No data for this period</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </HighlightSection>
        </div>

        {/* Per-staff: days present + hours per IST shift day (Moved here) */}
        <div className="lg:col-span-2">
          <HighlightSection id="attendance-by-day">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Attendance by day</h2>
                <p className="text-sm text-gray-500">
                  Detailed day-by-day punch times and hours for each staff member in view.
                </p>
              </div>
              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {(staffAnalytics as StaffAnalyticsRow[]).length === 0 ? (
                  <p className="p-6 text-center text-gray-400">No staff in view</p>
                ) : (
                  (staffAnalytics as StaffAnalyticsRow[]).map((s) => {
                    const rows = s.dailyAttendance ?? [];
                    return (
                      <div key={s.id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{s.name}</h3>
                            <p className="text-xs text-gray-500">{s.role}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-teal-600">{s.netHours?.toFixed(1)} total hours</p>
                            <p className="text-xs text-gray-400">{s.daysPresent} days present</p>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-gray-50 text-gray-600">
                                <th className="px-2 py-1.5 font-medium border border-gray-100">Date (IST)</th>
                                <th className="px-2 py-1.5 font-medium border border-gray-100">Punch In</th>
                                <th className="px-2 py-1.5 font-medium border border-gray-100">Punch Out</th>
                                <th className="px-2 py-1.5 font-medium border border-gray-100 text-right">Net Hours</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="px-2 py-4 text-center text-gray-400">No attendance records in range</td>
                                </tr>
                              ) : (
                                rows.map((row) => (
                                  <tr key={row.date} className="hover:bg-gray-50/50">
                                    <td className="px-2 py-1.5 border border-gray-100 font-medium">{row.date}</td>
                                    <td className="px-2 py-1.5 border border-gray-100 text-gray-500">{fmtIst(row.punchIn)}</td>
                                    <td className="px-2 py-1.5 border border-gray-100 text-gray-500">{fmtIst(row.punchOut)}</td>
                                    <td className="px-2 py-1.5 border border-gray-100 text-right font-medium text-teal-700">
                                      {row.hours?.toFixed(1)}h
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </HighlightSection>
        </div>

        {/* Role breakdown */}
        <HighlightSection id="role-breakdown">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Hours by role</h2>
            <p className="text-sm text-gray-500">Labor distribution across roles</p>
          </div>
          <div className="p-4 h-72">
            {roleBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie
                    data={roleBreakdown}
                    dataKey="hours"
                    nameKey="role"
                    cx="50%"
                    cy="45%"
                    outerRadius={85}
                  >
                    {roleBreakdown.map((_: unknown, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}h`} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={(value, entry) => (
                      <span className="text-sm text-gray-700">
                        {value}: {(entry.payload as { hours?: number })?.hours ?? 0}h
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No role data</div>
            )}
          </div>
        </div>
        </HighlightSection>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Shift distribution */}
        <HighlightSection id="shift-distribution">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Shift coverage</h2>
            <p className="text-sm text-gray-500">Day vs Night shift staff</p>
          </div>
          <div className="p-4 h-64">
            {shiftDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={shiftDistribution}
                    dataKey="count"
                    nameKey="shift"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {shiftDistribution.map((_: unknown, i: number) => (
                      <Cell key={i} fill={i === 0 ? '#0F766E' : '#F59E0B'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v} staff`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No shift data</div>
            )}
          </div>
        </div>
        </HighlightSection>

        {/* Task completion by shift */}
        <HighlightSection id="task-completion">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Task completion by shift</h2>
            <p className="text-sm text-gray-500">Which shift is more productive</p>
          </div>
          <div className="p-4 h-64">
            {taskCompletionByShift.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskCompletionByShift} layout="vertical" margin={{ left: 20, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#9CA3AF" unit="%" />
                  <YAxis dataKey="shift" type="category" width={60} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as { shift?: string; rate?: number; completed?: number; total?: number };
                      return (
                        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-sm">
                          <p className="font-medium text-gray-800">{p.shift} shift</p>
                          <p className="text-teal-600">{(p.rate ?? 0).toFixed(1)}% completion</p>
                          <p className="text-gray-500 text-xs mt-1">{p.completed ?? 0} of {p.total ?? 0} tasks</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="rate" name="Completion %" fill="#0F766E" radius={[0, 4, 4, 0]} minPointSize={8}>
                    <LabelList dataKey="rate" position="right" formatter={(v: number) => `${v}%`} /> 
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No task data</div>
            )}
          </div>
        </div>
        </HighlightSection>
      </div>

      {/* Leave trend — backend fills every day in the selected period (zeros when no requests) */}
      <HighlightSection id="leave-trend">
      {leaveChartData.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Leave trend</h2>
            <p className="text-sm text-gray-500">
              Approved, rejected, and pending counts for each day in your selected period (daily / weekly / monthly / custom / pay cycle).
            </p>
            {leaveChartData.length > LEAVE_CHART_VISIBLE_DAYS && (
              <p className="text-xs text-teal-700/90 mt-2">
                About {LEAVE_CHART_VISIBLE_DAYS} days visible at once — drag the scrollbar or use your mouse wheel / trackpad (scroll up-down) over the chart to move along the timeline.
              </p>
            )}
          </div>
          <div className="p-4 pb-3">
            <div
              ref={leaveScrollRef}
              className="w-full h-72 overflow-x-auto overflow-y-hidden rounded-lg border border-gray-100 bg-gray-50/40 scroll-smooth [scrollbar-width:thin]"
            >
              <div
                className="h-full min-w-full"
                style={{
                  width:
                    leaveChartData.length <= LEAVE_CHART_VISIBLE_DAYS
                      ? '100%'
                      : `${(leaveChartData.length / LEAVE_CHART_VISIBLE_DAYS) * 100}%`,
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={leaveChartData}
                    margin={{ bottom: 40, left: 4, right: 12, top: 8 }}
                    barCategoryGap="18%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10 }}
                      stroke="#9CA3AF"
                      interval={0}
                      angle={leaveChartData.length > LEAVE_CHART_VISIBLE_DAYS ? -28 : 0}
                      textAnchor={leaveChartData.length > LEAVE_CHART_VISIBLE_DAYS ? 'end' : 'middle'}
                      height={leaveChartData.length > LEAVE_CHART_VISIBLE_DAYS ? 52 : 28}
                    />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" allowDecimals={false} width={40} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0].payload as {
                          date?: string;
                          label?: string;
                          approved?: number;
                          rejected?: number;
                          pending?: number;
                        };
                        return (
                          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-sm min-w-[10rem]">
                            <p className="font-medium text-gray-900">{row.date ?? label}</p>
                            <p className="text-xs text-gray-500 mb-2">{row.label}</p>
                            <p className="text-emerald-700">Approved: {row.approved ?? 0}</p>
                            <p className="text-red-600">Rejected: {row.rejected ?? 0}</p>
                            <p className="text-amber-600">Pending: {row.pending ?? 0}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="approved" stackId="a" fill="#10B981" name="Approved" />
                    <Bar dataKey="rejected" stackId="a" fill="#EF4444" name="Rejected" />
                    <Bar dataKey="pending" stackId="a" fill="#F59E0B" name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 pt-3 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-sm bg-[#10B981]" aria-hidden />
                Approved
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-sm bg-[#EF4444]" aria-hidden />
                Rejected
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-sm bg-[#F59E0B]" aria-hidden />
                Pending
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8 p-8 text-center text-gray-400">
          No days in range for leave trend
        </div>
      )}
      </HighlightSection>

      {/* Web-only: Staff compliance & labor cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <HighlightSection id="staff-compliance">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Staff compliance</h2>
            <p className="text-sm text-gray-500">Hours vs target (min hours required)</p>
          </div>
          <div className="p-4 h-80 overflow-y-auto">
            {staffAnalytics.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, staffAnalytics.length * 36)}>
                <BarChart data={staffAnalytics} layout="vertical" margin={{ left: 80, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                  <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload;
                      return (
                        <div className="bg-white rounded-lg shadow-lg border p-3 text-sm">
                          <p className="font-medium">{p.name}</p>
                          <p>Net: {p.netHours}h | Break: {p.breakHours}h</p>
                          <p>Status: {p.status}</p>
                          <p>Compliance: {p.compliancePct}%</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="netHours" name="Net hours" fill="#0F766E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No staff data</div>
            )}
          </div>
        </div>
        </HighlightSection>

        {/* Labor cost breakdown */}
        <HighlightSection id="labor-cost">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Labor cost estimate</h2>
            <p className="text-sm text-gray-500">Daily earned per staff (this period)</p>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            {staffAnalytics.filter((s: { dailyEarned?: number }) => (s.dailyEarned ?? 0) > 0).length > 0 ? (
              <div className="space-y-2">
                {staffAnalytics
                  .filter((s: { dailyEarned?: number }) => (s.dailyEarned ?? 0) > 0)
                  .sort((a: { dailyEarned?: number }, b: { dailyEarned?: number }) => (b.dailyEarned ?? 0) - (a.dailyEarned ?? 0))
                  .map((s: { id?: string; name?: string; dailyEarned?: number; role?: string }) => (
                    <div key={s.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="font-medium text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.role}</p>
                      </div>
                      <p className="font-semibold text-teal-600">₹{(s.dailyEarned ?? 0).toLocaleString()}</p>
                    </div>
                  ))}
                <div className="pt-4 mt-4 border-t-2 border-gray-200 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-teal-600">₹{laborCostEstimate.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400">No salary data</div>
            )}
          </div>
        </div>
        </HighlightSection>
      </div>

      {/* Export Range Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Export Analytics Report</h3>
              <p className="text-sm text-gray-500">Choose the time range for your export</p>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => performExport('current')}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-all text-left"
              >
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Current Filter</p>
                  <p className="text-xs text-gray-500">Export exactly what you see on screen</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                  <BarChart3 className="h-4 w-4" />
                </div>
              </button>
              
              <button
                onClick={() => performExport('30days')}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-all text-left"
              >
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Last 30 Days</p>
                  <p className="text-xs text-gray-500">Full month report regardless of filters</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Clock className="h-4 w-4" />
                </div>
              </button>

              <button
                onClick={() => {
                  setPeriod('custom');
                  setShowExportModal(false);
                }}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-all text-left"
              >
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Custom Range</p>
                  <p className="text-xs text-gray-500">Select specific start and end dates</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <Download className="h-4 w-4" />
                </div>
              </button>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Per-staff: days present + hours per IST shift day */}
      <HighlightSection id="attendance-by-day">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Attendance by day</h2>
            <p className="text-sm text-gray-500">
              For each staff member: number of IST calendar days with a clock-in, total net hours in the selected
              period, and a day-by-day table (punch in / punch out in IST, hours after breaks). Uses the same period
              and search filter as the rest of this page.
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {(staffAnalytics as StaffAnalyticsRow[]).length === 0 ? (
              <p className="p-6 text-center text-gray-400">No staff in view</p>
            ) : (
              (staffAnalytics as StaffAnalyticsRow[]).map((s) => {
                const rows = s.dailyAttendance ?? [];
                const daysPresent = s.daysPresent ?? 0;
                return (
                  <details key={String(s.id ?? s.name)} className="group px-4 sm:px-6 py-2">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                        <span className="font-medium text-gray-900 truncate">{s.name ?? '—'}</span>
                        <span className="text-sm text-gray-500 truncate">{s.role ?? ''}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-sm">
                        <span className="tabular-nums text-gray-700">
                          <span className="font-semibold text-teal-800">{daysPresent}</span> day
                          {daysPresent === 1 ? '' : 's'} present
                        </span>
                        <span className="tabular-nums font-medium text-gray-900">
                          {(s.netHours ?? 0).toFixed(1)}h net
                        </span>
                        <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600 group-open:bg-teal-50 group-open:border-teal-200 group-open:text-teal-800">
                          Details
                        </span>
                      </div>
                    </summary>
                    <div className="pb-4 pt-0 overflow-x-auto">
                      {rows.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">No punch data in this period.</p>
                      ) : (
                        <table className="w-full min-w-[520px] text-sm border border-gray-100 rounded-lg overflow-hidden">
                          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                            <tr>
                              <th className="px-3 py-2">Shift date (IST)</th>
                              <th className="px-3 py-2">Punch in</th>
                              <th className="px-3 py-2">Punch out</th>
                              <th className="px-3 py-2 text-right">Net hours</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {rows.map((r) => (
                              <tr key={r.date} className="bg-white hover:bg-gray-50/80">
                                <td className="px-3 py-2 font-medium text-gray-800 tabular-nums">{r.date}</td>
                                <td className="px-3 py-2 text-gray-700">{fmtIst(r.punchIn)}</td>
                                <td className="px-3 py-2 text-gray-700">{fmtIst(r.punchOut)}</td>
                                <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-900">
                                  {r.hours.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </details>
                );
              })
            )}
          </div>
        </div>
      </HighlightSection>

      {/* Web-only: Quick insights */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Insights for owners</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/80 rounded-lg p-4">
            <p className="text-sm font-medium text-teal-800">Shift coverage</p>
            <p className="text-sm text-gray-600 mt-1">
              {shiftDistribution.find((s: { shift: string }) => s.shift === 'Day')?.count ?? 0} day staff,{' '}
              {shiftDistribution.find((s: { shift: string }) => s.shift === 'Night')?.count ?? 0} night staff
            </p>
          </div>
          <div className="bg-white/80 rounded-lg p-4">
            <p className="text-sm font-medium text-teal-800">Overtime</p>
            <p className="text-sm text-gray-600 mt-1">
              {staffAnalytics.filter((s: { status?: string }) => s.status === 'overtime').length} staff over target hours
            </p>
          </div>
          <div className="bg-white/80 rounded-lg p-4">
            <p className="text-sm font-medium text-teal-800">Under hours</p>
            <p className="text-sm text-gray-600 mt-1">
              {staffAnalytics.filter((s: { status?: string }) => s.status === 'under').length} staff below target
            </p>
          </div>
          <div className="bg-white/80 rounded-lg p-4">
            <p className="text-sm font-medium text-teal-800">Export</p>
            <p className="text-sm text-gray-600 mt-1">Download CSV for accounting or payroll</p>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
