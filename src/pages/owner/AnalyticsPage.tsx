import { useState, useRef, useEffect, useMemo, type ReactNode, type ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HighlightSection } from '@/components/HighlightSection';
import { useOutletStore } from '@/stores/outletStore';
import { analyticsApi } from '@/api/analytics';
import { employeeApi } from '@/api/employee';
import * as XLSX from 'xlsx';
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
import { CheckCircle, Clock, BarChart3, Users, Wallet, Download, Info, TrendingUp, Sparkles } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ListSearchBar } from '@/components/ListSearchBar';

const PIE_COLORS = ['#059669', '#10B981', '#14B8A6', '#F59E0B', '#F97316', '#8B5CF6'];

const CARD_SHELL =
  'rounded-2xl border border-gray-100/90 bg-white shadow-sm shadow-slate-900/[0.04] overflow-hidden';
const CARD_HEADER = 'px-6 py-5 border-b border-gray-50 bg-gradient-to-r from-slate-50/90 via-white to-emerald-50/30';
const CHART_BODY = 'p-5 sm:p-6';

/** Leave trend: ~this many days fit in the viewport; scroll for the rest */
const LEAVE_CHART_VISIBLE_DAYS = 10;

// Custom tooltip for charts
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white/95 backdrop-blur-sm p-3.5 text-sm shadow-xl shadow-slate-900/10 ring-1 ring-black/5">
      {label && <p className="font-semibold text-gray-900 mb-2">{label}</p>}
      <div className="space-y-1">
        {payload.map((p) => (
          <p key={p.name} className="text-gray-600 flex items-center justify-between gap-4">
            <span>{p.name}</span>
            <span className="font-semibold tabular-nums" style={{ color: p.color }}>
              {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
};

function ChartPanel({
  id,
  title,
  subtitle,
  action,
  children,
  bodyClassName = CHART_BODY,
}: {
  id: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <HighlightSection id={id}>
      <div className={CARD_SHELL}>
        <div className={`${CARD_HEADER} flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3`}>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 tracking-tight">{title}</h2>
            {subtitle ? <p className="text-sm text-gray-500 mt-1 leading-relaxed">{subtitle}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        <div className={bodyClassName}>{children}</div>
      </div>
    </HighlightSection>
  );
}

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

function istYmd(date: Date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function lastNDaysRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return { start: istYmd(start), end: istYmd(end) };
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
  accent = 'emerald',
}: {
  label: string;
  value: string | number;
  /** Shown when the (i) control is opened */
  infoText: string;
  icon: ComponentType<{ className?: string }>;
  accent?: 'emerald' | 'amber' | 'teal' | 'rose';
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

  const styles = {
    emerald: {
      bar: 'from-emerald-500 to-teal-400',
      icon: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
      value: 'text-gray-900',
    },
    teal: {
      bar: 'from-teal-500 to-cyan-400',
      icon: 'bg-teal-50 text-teal-700 ring-teal-100',
      value: 'text-gray-900',
    },
    amber: {
      bar: 'from-amber-500 to-orange-400',
      icon: 'bg-amber-50 text-amber-800 ring-amber-100',
      value: 'text-gray-900',
    },
    rose: {
      bar: 'from-rose-500 to-pink-400',
      icon: 'bg-rose-50 text-rose-700 ring-rose-100',
      value: 'text-gray-900',
    },
  }[accent];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100/90 bg-white p-5 shadow-sm shadow-slate-900/[0.04] hover:shadow-md hover:border-emerald-100/80 transition-all duration-200 min-h-[118px] flex flex-col">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${styles.bar} opacity-90`} />
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500 leading-snug pr-1">
          {label}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          <div className={`rounded-xl p-2 ring-1 ${styles.icon}`} aria-hidden>
            <Icon className="h-4 w-4" />
          </div>
          <div className="relative" ref={wrapRef}>
            <button
              type="button"
              onClick={() => setInfoOpen((o) => !o)}
              className="rounded-xl p-2 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              aria-label={`About ${label}`}
              aria-expanded={infoOpen}
            >
              <Info className="h-4 w-4" strokeWidth={2.25} />
            </button>
            {infoOpen ? (
              <div
                role="tooltip"
                className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-gray-100 bg-white p-3.5 text-left text-xs leading-relaxed text-gray-600 shadow-xl shadow-slate-900/10 ring-1 ring-black/5"
              >
                <p className="whitespace-pre-line text-gray-700">{infoText}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <p className={`text-2xl sm:text-[1.65rem] font-black tabular-nums tracking-tight mt-auto ${styles.value}`}>
        {value}
      </p>
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
  shiftType?: string;
  hours?: number;
  breakHours?: number;
  daysPresent?: number;
  dailyAttendance?: StaffDailyAttendance[];
  netHours?: number;
  minHoursRequired?: number;
  compliancePct?: number;
  status?: string;
  overtimeHours?: number;
  underHours?: number;
  dailyEarned?: number | null;
  salary?: number | null;
};

type EnrichedRoleRow = {
  role: string;
  hours: number;
  pct: number;
  staffCount: number;
  avgHours: number;
  color: string;
  staff: StaffAnalyticsRow[];
};

function RoleHoursBreakdown({
  roles,
  totalRoleHours,
  totalEmployees,
  outletAvgPerPerson,
}: {
  roles: EnrichedRoleRow[];
  totalRoleHours: number;
  totalEmployees: number;
  outletAvgPerPerson: number;
}) {
  const topRole = roles[0];
  const largestTeam = roles.length ? [...roles].sort((a, b) => b.staffCount - a.staffCount)[0] : null;
  const avgPerRole = roles.length > 0 ? totalRoleHours / roles.length : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-slate-50 px-4 py-4 ring-1 ring-gray-100/80">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Total labor hours</p>
          <p className="mt-1.5 text-2xl font-black text-gray-900 tabular-nums">{totalRoleHours.toFixed(1)}h</p>
          <p className="text-xs text-gray-500 mt-1">Across all roles</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white px-4 py-4 ring-1 ring-emerald-100/80">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Highest share</p>
          <p className="mt-1.5 text-lg font-bold text-gray-900 truncate" title={topRole?.role}>
            {topRole?.role ?? '—'}
          </p>
          <p className="text-xs text-emerald-800 font-semibold tabular-nums mt-1">
            {topRole ? `${topRole.pct.toFixed(0)}% · ${topRole.hours.toFixed(1)}h` : '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-slate-50 px-4 py-4 ring-1 ring-gray-100/80">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Roles active</p>
          <p className="mt-1.5 text-2xl font-black text-gray-900 tabular-nums">{roles.length}</p>
          <p className="text-xs text-gray-500 mt-1">{totalEmployees} staff total</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-slate-50 px-4 py-4 ring-1 ring-gray-100/80">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Avg per role</p>
          <p className="mt-1.5 text-2xl font-black text-gray-900 tabular-nums">{avgPerRole.toFixed(1)}h</p>
          <p className="text-xs text-gray-500 mt-1 truncate" title={largestTeam?.role ?? undefined}>
            Largest: {largestTeam ? `${largestTeam.staffCount} in ${largestTeam.role}` : '—'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-slate-50/50 p-5 ring-1 ring-gray-100/80">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <p className="text-sm font-bold text-gray-900">Labor mix</p>
            <p className="text-xs text-gray-500">How hours split across your outlet roles</p>
          </div>
          <p className="text-xs font-semibold text-gray-500 tabular-nums">{totalRoleHours.toFixed(1)}h total</p>
        </div>
        <div className="flex h-5 w-full overflow-hidden rounded-full bg-gray-200/80 shadow-inner ring-1 ring-gray-200/60">
          {roles.map((r) => (
            <div
              key={r.role}
              className="h-full transition-opacity hover:opacity-90"
              style={{
                width: `${Math.max(r.pct, r.pct > 0 ? 3 : 0)}%`,
                backgroundColor: r.color,
              }}
              title={`${r.role}: ${r.hours.toFixed(1)}h (${r.pct.toFixed(1)}%)`}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {roles.map((r) => (
            <div
              key={r.role}
              className="inline-flex items-center gap-2 rounded-full border border-white bg-white px-3 py-1.5 text-xs shadow-sm ring-1 ring-gray-100"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} aria-hidden />
              <span className="font-semibold text-gray-800">{r.role}</span>
              <span className="text-gray-400">·</span>
              <span className="font-bold text-emerald-700 tabular-nums">{r.pct.toFixed(0)}%</span>
              <span className="text-gray-400 tabular-nums">({r.hours.toFixed(0)}h)</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {roles.map((r, index) => {
          const vsOutletAvg =
            outletAvgPerPerson > 0 ? ((r.avgHours - outletAvgPerPerson) / outletAvgPerPerson) * 100 : 0;
          const topStaff = [...r.staff].sort((a, b) => (b.netHours ?? 0) - (a.netHours ?? 0));
          const rankStyles =
            index === 0
              ? 'bg-amber-50 text-amber-800 ring-amber-200'
              : index === 1
                ? 'bg-slate-100 text-slate-700 ring-slate-200'
                : index === 2
                  ? 'bg-orange-50 text-orange-800 ring-orange-200'
                  : 'bg-gray-50 text-gray-600 ring-gray-100';

          return (
            <div
              key={r.role}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-slate-900/[0.03] hover:border-emerald-100 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ring-1 ${rankStyles}`}
                  >
                    #{index + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900 truncate">{r.role}</h3>
                    <p className="text-xs text-gray-500">
                      {r.staffCount} staff · {r.avgHours.toFixed(1)}h avg each
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-black text-gray-900 tabular-nums leading-none">{r.hours.toFixed(1)}h</p>
                  <p className="text-xs font-bold text-emerald-700 tabular-nums mt-1">{r.pct.toFixed(1)}%</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-[11px] font-medium text-gray-500 mb-1.5">
                  <span>Share of outlet labor</span>
                  <span className="tabular-nums">{r.pct.toFixed(0)}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${r.pct}%`, backgroundColor: r.color }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100/80">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Hours / person</p>
                  <p className="text-sm font-bold text-gray-900 tabular-nums mt-0.5">{r.avgHours.toFixed(1)}h</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100/80">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Vs outlet avg</p>
                  <p
                    className={`text-sm font-bold tabular-nums mt-0.5 ${
                      vsOutletAvg > 5 ? 'text-amber-700' : vsOutletAvg < -5 ? 'text-emerald-700' : 'text-gray-700'
                    }`}
                  >
                    {vsOutletAvg >= 0 ? '+' : ''}
                    {vsOutletAvg.toFixed(0)}%
                  </p>
                </div>
              </div>

              {topStaff.length > 0 ? (
                <div className="border-t border-gray-50 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-2">Who logged time</p>
                  <div className="space-y-1.5">
                    {topStaff.slice(0, 5).map((s) => {
                      const memberPct = r.hours > 0 ? ((s.netHours ?? 0) / r.hours) * 100 : 0;
                      return (
                        <div key={s.id ?? s.name} className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-100">
                            {(s.name ?? '?').charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-gray-800 truncate">{s.name}</span>
                              <span className="text-xs font-bold text-gray-900 tabular-nums shrink-0">
                                {(s.netHours ?? 0).toFixed(1)}h
                              </span>
                            </div>
                            <div className="mt-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-400/80"
                                style={{ width: `${Math.min(100, memberPct)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {topStaff.length > 5 ? (
                      <p className="text-[11px] text-gray-400 pl-9">+{topStaff.length - 5} more in this role</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  const [isExporting, setIsExporting] = useState(false);

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

  const performExport = async (exportPeriod: 'current' | '30days' | 'custom') => {
    if (!selectedOutletId || isExporting) return;

    const currentRange = period === 'custom' && customQueryRange ? customQueryRange : period === 'custom' ? appliedCustom : null;
    const searchFilter = exportPeriod === 'current' ? committedSearch.trim() || undefined : undefined;
    const exportRange =
      exportPeriod === '30days'
        ? lastNDaysRange(30)
        : exportPeriod === 'custom'
          ? currentRange
          : period === 'custom' && currentRange
            ? currentRange
            : null;

    if (exportPeriod === 'custom' && !exportRange) {
      setPeriod('custom');
      setShowExportModal(false);
      return;
    }

    setIsExporting(true);
    try {
      const exportResponse =
        exportPeriod === 'current'
          ? (data?.data ?? data ?? {})
          : await analyticsApi.getOutletAnalytics(selectedOutletId, {
            period: exportPeriod === '30days' ? 'custom' : period,
            ...(exportRange ? { startDate: exportRange.start, endDate: exportRange.end } : {}),
            search: searchFilter,
          });

      const payload = exportResponse?.data ?? exportResponse ?? {};
      const staffStats = Array.isArray(payload.employeeStats) ? payload.employeeStats : [];
      const summaryRows = [
        ['Metric', 'Value'],
        ['Generated at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
        ['Export scope', exportPeriod === 'current' ? 'Current filter' : exportPeriod === '30days' ? 'Last 30 days' : 'Custom range'],
        ['Period', payload.period ?? period],
        ['Search filter', exportPeriod === 'current' ? committedSearch.trim() || 'All staff' : 'All staff'],
        ['Date range', exportRange ? `${exportRange.start} to ${exportRange.end}` : 'Current dashboard range'],
        ['Total employees', payload.totalEmployees ?? 0],
        ['Active employees today', payload.activeEmployeesToday ?? 0],
        ['Total work hours', payload.totalWorkHours ?? 0],
        ['Hours compliance rate (%)', payload.hoursComplianceRate ?? 0],
        ['Employees met min hours', payload.employeesMetMinHours ?? 0],
        ['Average hours per employee', payload.averageHoursPerEmployee ?? 0],
        ['Total tasks', payload.totalTasks ?? 0],
        ['Completed tasks', payload.completedTasks ?? 0],
        ['Task completion rate (%)', payload.taskCompletionRate ?? 0],
        ['Estimated labor cost', laborCostEstimate],
      ];

      const staffSummaryRows = staffStats.map(
        (s: StaffAnalyticsRow & { shiftType?: string; hours?: number; breakHours?: number; overtimeHours?: number; underHours?: number; salary?: number | null }) => ({
          Name: s.name ?? '—',
          Role: s.role ?? '—',
          Shift: s.shiftType ?? '—',
          'Net Hours': s.netHours ?? 0,
          'Break Hours': s.breakHours ?? 0,
          'Gross Hours': s.hours ?? 0,
          'Min Hours Required': s.minHoursRequired ?? 0,
          'Compliance %': s.compliancePct ?? 0,
          Status: s.status ?? '—',
          'Overtime Hours': s.overtimeHours ?? 0,
          'Under Hours': s.underHours ?? 0,
          'Daily Earned': s.dailyEarned ?? 0,
          'Days Present': s.daysPresent ?? 0,
          Salary: s.salary ?? 0,
        })
      );

      const dailyAttendanceRows = staffStats.flatMap((s: StaffAnalyticsRow & { dailyAttendance?: StaffDailyAttendance[] }) =>
        (s.dailyAttendance ?? []).map((row) => ({
          Staff: s.name ?? '—',
          Role: s.role ?? '—',
          Date: row.date,
          'Punch In (IST)': fmtIst(row.punchIn),
          'Punch Out (IST)': fmtIst(row.punchOut),
          'Net Hours': row.hours ?? 0,
          'Days Present': s.daysPresent ?? 0,
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');
      XLSX.utils.book_append_sheet(
        workbook,
        staffSummaryRows.length > 0
          ? XLSX.utils.json_to_sheet(staffSummaryRows, {
            header: [
              'Name',
              'Role',
              'Shift',
              'Net Hours',
              'Break Hours',
              'Gross Hours',
              'Min Hours Required',
              'Compliance %',
              'Status',
              'Overtime Hours',
              'Under Hours',
              'Daily Earned',
              'Days Present',
              'Salary',
            ],
          })
          : XLSX.utils.aoa_to_sheet([
            ['Name', 'Role', 'Shift', 'Net Hours', 'Break Hours', 'Gross Hours', 'Min Hours Required', 'Compliance %', 'Status', 'Overtime Hours', 'Under Hours', 'Daily Earned', 'Days Present', 'Salary'],
          ]),
        'Staff Summary'
      );
      XLSX.utils.book_append_sheet(
        workbook,
        dailyAttendanceRows.length > 0
          ? XLSX.utils.json_to_sheet(dailyAttendanceRows, {
            header: ['Staff', 'Role', 'Date', 'Punch In (IST)', 'Punch Out (IST)', 'Net Hours', 'Days Present'],
          })
          : XLSX.utils.aoa_to_sheet([['Staff', 'Role', 'Date', 'Punch In (IST)', 'Punch Out (IST)', 'Net Hours', 'Days Present']]),
        'Daily Working Report'
      );

      if (Array.isArray(payload.dailyHoursData) && payload.dailyHoursData.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.dailyHoursData), 'Daily Hours');
      }

      if (Array.isArray(payload.roleBreakdown) && payload.roleBreakdown.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.roleBreakdown), 'Role Breakdown');
      }

      if (Array.isArray(payload.shiftDistribution) && payload.shiftDistribution.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.shiftDistribution), 'Shift Distribution');
      }

      if (Array.isArray(payload.taskCompletionByShift) && payload.taskCompletionByShift.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.taskCompletionByShift), 'Task Completion');
      }

      if (Array.isArray(payload.leaveTrend) && payload.leaveTrend.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.leaveTrend), 'Leave Trend');
      }

      const safeRangeSlug =
        exportPeriod === 'current'
          ? period === 'custom' && currentRange
            ? `${currentRange.start}_to_${currentRange.end}`
            : period
          : exportPeriod === '30days'
            ? 'last-30-days'
            : exportRange
              ? `${exportRange.start}_to_${exportRange.end}`
              : 'custom-range';

      XLSX.writeFile(workbook, `analytics-report-${safeRangeSlug}-${istYmd(new Date())}.xlsx`);
      setShowExportModal(false);
    } finally {
      setIsExporting(false);
    }
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
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className={`${CARD_SHELL} p-8 text-center`}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-100">
            <BarChart3 className="h-7 w-7 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Select an outlet</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            Choose an outlet in the header to view workforce analytics, labor costs, and compliance insights.
          </p>
        </div>
      </div>
    );
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

  const totalRoleHours = roleBreakdown.reduce((sum: number, r: { hours?: number }) => sum + (r.hours ?? 0), 0);
  const staffByRoleMap: Record<string, StaffAnalyticsRow[]> = {};
  (staffAnalytics as StaffAnalyticsRow[]).forEach((s) => {
    const role = s.role ?? 'Unassigned';
    if (!staffByRoleMap[role]) staffByRoleMap[role] = [];
    staffByRoleMap[role].push(s);
  });
  const enrichedRoles: EnrichedRoleRow[] = roleBreakdown
    .map((r: { role?: string; hours?: number }, i: number) => {
      const role = r.role ?? 'Unassigned';
      const hours = r.hours ?? 0;
      const staff = staffByRoleMap[role] ?? [];
      const staffCount = staff.length;
      return {
        role,
        hours,
        pct: totalRoleHours > 0 ? (hours / totalRoleHours) * 100 : 0,
        staffCount,
        avgHours: staffCount > 0 ? hours / staffCount : 0,
        color: PIE_COLORS[i % PIE_COLORS.length],
        staff,
      };
    })
    .sort((a, b) => b.hours - a.hours);
  const outletAvgHoursPerPerson = staffInView > 0 ? totalRoleHours / staffInView : 0;

  const searchNote = analyticsSearch.trim()
    ? '\n\nStaff search filter is applied — KPIs use only matching people.'
    : '';

  const scopeHelp = periodScopeLabel(period, period === 'custom' ? appliedCustom : null);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className={`${CARD_SHELL} overflow-visible`}>
        <div className="relative px-6 py-6 sm:px-8 sm:py-7 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100/30 via-transparent to-transparent pointer-events-none" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 mb-3">
                  <Sparkles className="h-3.5 w-3.5" />
                  Workforce intelligence
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Outlet Analytics</h1>
                <p className="text-gray-500 mt-1.5 text-sm sm:text-base max-w-xl leading-relaxed">
                  Track hours, attendance, tasks, and labor costs — all in one premium dashboard view.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                <div className="inline-flex p-1 rounded-xl bg-gray-100/80 ring-1 ring-gray-200/60">
                  {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriod(p)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        period === p
                          ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200/80'
                          : 'text-gray-600 hover:text-gray-900'
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
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      period === 'custom'
                        ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200/80'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                <button
                  onClick={handleExport}
                  disabled={isLoading || isExporting}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" /> {isExporting ? 'Exporting…' : 'Export Report'}
                </button>
              </div>
            </div>

            {period === 'custom' && (
              <div className="flex flex-wrap items-end gap-3 sm:gap-4 rounded-xl border border-emerald-100/80 bg-white/70 backdrop-blur-sm px-4 py-4 ring-1 ring-emerald-50 animate-fade-in">
                <div className="flex flex-col gap-1">
                  <label htmlFor="analytics-custom-start" className="text-xs font-semibold text-emerald-800">
                    From
                  </label>
                  <input
                    id="analytics-custom-start"
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="analytics-custom-end" className="text-xs font-semibold text-emerald-800">
                    To
                  </label>
                  <input
                    id="analytics-custom-end"
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <button
                  type="button"
                  disabled={!customStart || !customEnd || customStart > customEnd}
                  onClick={() => setAppliedCustom({ start: customStart, end: customEnd })}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 h-[38px]"
                >
                  Apply range
                </button>
                <p className="text-xs text-gray-500 max-w-md pb-1">
                  Up to 366 days. IST dates for clock-ins; hours exclude breaks.
                </p>
              </div>
            )}

            <div className="relative max-w-xl">
              <ListSearchBar
                value={analyticsSearch}
                onChange={(val) => {
                  setAnalyticsSearch(val);
                  setShowSuggestions(true);
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
                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-xl shadow-xl shadow-slate-900/10 overflow-hidden ring-1 ring-black/5">
                  <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-gray-50/50">
                    Select a staff member to filter
                  </div>
                  {filteredSuggestions.map((s: any) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setAnalyticsSearch(s.name);
                        setSelectedStaffId(s.id);
                        setCommittedSearch(s.name);
                        setShowSuggestions(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-emerald-50/80 transition-colors flex justify-between items-center border-b border-gray-50 last:border-0"
                    >
                      <span className="font-medium text-gray-900">{s.name}</span>
                      <span className="text-xs text-gray-400">{s.phone}</span>
                    </button>
                  ))}
                </div>
              )}
              {analyticsSearch.trim().length >= 2 && !selectedStaffId && filteredSuggestions.length === 0 && showSuggestions && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400 ring-1 ring-black/5">
                  No staff found matching &ldquo;{analyticsSearch}&rdquo;
                </div>
              )}
              {selectedStaffId && analyticsSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setAnalyticsSearch('');
                    setSelectedStaffId('');
                    setCommittedSearch('');
                    setShowSuggestions(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Clear staff filter"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 -mt-2">
              {committedSearch
                ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800 ring-1 ring-emerald-100">
                    <Users className="h-3 w-3" />
                    Showing data for: <strong>{committedSearch}</strong> — click ✕ to clear
                  </span>
                )
                : 'Type a name and select from suggestions to filter by staff.'}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-24" />
      ) : (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily hours */}
            <div className="lg:col-span-2">
              <ChartPanel
                id="work-hours"
                title="Work hours trend"
                subtitle="Total staff hours per day in the selected period"
                action={
                  dailyHours.length > 14 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Scroll for {dailyHours.length} days
                    </span>
                  ) : null
                }
              >
                <div className="h-72 overflow-x-auto overflow-y-hidden [scrollbar-width:thin] rounded-xl bg-gradient-to-b from-slate-50/50 to-white ring-1 ring-gray-100">
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
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }} />
                          <ReferenceLine
                            y={8}
                            label={{ value: 'Min Hours', position: 'right', fill: '#EF4444', fontSize: 10 }}
                            stroke="#EF4444"
                            strokeDasharray="3 3"
                          />
                          <Bar
                            dataKey="hours"
                            fill="#059669"
                            radius={[6, 6, 0, 0]}
                            name="Hours"
                            barSize={dailyHours.length > 15 ? 20 : 40}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                        <BarChart3 className="h-8 w-8 text-gray-300" />
                        <span className="text-sm">No data for this period</span>
                      </div>
                    )}
                  </div>
                </div>
              </ChartPanel>
            </div>

            {/* Per-staff: days present + hours per IST shift day */}
            <div className="lg:col-span-2">
              <ChartPanel
                id="attendance-by-day"
                title="Attendance by day"
                subtitle="Detailed day-by-day punch times and hours for each staff member in view."
                bodyClassName="p-0"
              >
                <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                  {(staffAnalytics as StaffAnalyticsRow[]).length === 0 ? (
                    <p className="p-8 text-center text-gray-400 text-sm">No staff in view</p>
                  ) : (
                    (staffAnalytics as StaffAnalyticsRow[]).map((s) => {
                      const rows = s.dailyAttendance ?? [];
                      return (
                        <div key={s.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm ring-1 ring-emerald-100">
                                {(s.name ?? '?').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate">{s.name}</h3>
                                <p className="text-xs text-gray-500">{s.role}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-emerald-700 tabular-nums">{s.netHours?.toFixed(1)}h</p>
                              <p className="text-xs text-gray-400">{s.daysPresent} days present</p>
                            </div>
                          </div>
                          <div className="overflow-x-auto rounded-xl ring-1 ring-gray-100">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="bg-slate-50/80 text-gray-600">
                                  <th className="px-3 py-2.5 font-semibold">Date (IST)</th>
                                  <th className="px-3 py-2.5 font-semibold">Punch In</th>
                                  <th className="px-3 py-2.5 font-semibold">Punch Out</th>
                                  <th className="px-3 py-2.5 font-semibold text-right">Net Hours</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {rows.length === 0 ? (
                                  <tr>
                                    <td colSpan={4} className="px-3 py-6 text-center text-gray-400">No attendance records in range</td>
                                  </tr>
                                ) : (
                                  rows.map((row) => (
                                    <tr key={row.date} className="hover:bg-emerald-50/30 transition-colors">
                                      <td className="px-3 py-2 font-medium text-gray-800">{row.date}</td>
                                      <td className="px-3 py-2 text-gray-500">{fmtIst(row.punchIn)}</td>
                                      <td className="px-3 py-2 text-gray-500">{fmtIst(row.punchOut)}</td>
                                      <td className="px-3 py-2 text-right font-semibold text-emerald-700 tabular-nums">
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
              </ChartPanel>
            </div>

            {/* Role breakdown */}
            <div className="lg:col-span-2">
              <ChartPanel
                id="role-breakdown"
                title="Hours by role"
                subtitle="See where labor hours go — by role, team size, and individual staff contribution"
              >
                {enrichedRoles.length > 0 ? (
                  <RoleHoursBreakdown
                    roles={enrichedRoles}
                    totalRoleHours={totalRoleHours}
                    totalEmployees={totalEmployees}
                    outletAvgPerPerson={outletAvgHoursPerPerson}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                    <Users className="h-8 w-8 text-gray-300" />
                    <span className="text-sm">No role data for this period</span>
                  </div>
                )}
              </ChartPanel>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartPanel id="shift-distribution" title="Shift coverage" subtitle="Day vs Night shift staff">
              <div className="h-64">
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
                        paddingAngle={3}
                        stroke="none"
                      >
                        {shiftDistribution.map((_: unknown, i: number) => (
                          <Cell key={i} fill={i === 0 ? '#059669' : '#F59E0B'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v} staff`} contentStyle={{ borderRadius: '12px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                    <Clock className="h-8 w-8 text-gray-300" />
                    <span className="text-sm">No shift data</span>
                  </div>
                )}
              </div>
            </ChartPanel>

            <ChartPanel id="task-completion" title="Task completion by shift" subtitle="Which shift is more productive">
              <div className="h-64">
                {taskCompletionByShift.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskCompletionByShift} layout="vertical" margin={{ left: 20, right: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#9CA3AF" unit="%" />
                      <YAxis dataKey="shift" type="category" width={60} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0].payload as { shift?: string; rate?: number; completed?: number; total?: number };
                          return (
                            <div className="rounded-xl border border-gray-100 bg-white/95 backdrop-blur-sm p-3.5 text-sm shadow-xl ring-1 ring-black/5">
                              <p className="font-semibold text-gray-900">{p.shift} shift</p>
                              <p className="text-emerald-600 font-medium">{(p.rate ?? 0).toFixed(1)}% completion</p>
                              <p className="text-gray-500 text-xs mt-1">{p.completed ?? 0} of {p.total ?? 0} tasks</p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="rate" name="Completion %" fill="#059669" radius={[0, 6, 6, 0]} minPointSize={8}>
                        <LabelList dataKey="rate" position="right" formatter={(v: number) => `${v}%`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                    <CheckCircle className="h-8 w-8 text-gray-300" />
                    <span className="text-sm">No task data</span>
                  </div>
                )}
              </div>
            </ChartPanel>
          </div>

          {/* Leave trend */}
          {leaveChartData.length > 0 ? (
            <ChartPanel
              id="leave-trend"
              title="Leave trend"
              subtitle="Approved, rejected, and pending counts for each day in your selected period."
              action={
                leaveChartData.length > LEAVE_CHART_VISIBLE_DAYS ? (
                  <span className="text-xs text-emerald-700 font-medium max-w-[14rem] text-right leading-snug">
                    ~{LEAVE_CHART_VISIBLE_DAYS} days visible — scroll to explore timeline
                  </span>
                ) : null
              }
            >
              <div
                ref={leaveScrollRef}
                className="w-full h-72 overflow-x-auto overflow-y-hidden rounded-xl bg-gradient-to-b from-slate-50/50 to-white ring-1 ring-gray-100 scroll-smooth [scrollbar-width:thin]"
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
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
                            <div className="rounded-xl border border-gray-100 bg-white/95 backdrop-blur-sm p-3.5 text-sm min-w-[10rem] shadow-xl ring-1 ring-black/5">
                              <p className="font-semibold text-gray-900">{row.date ?? label}</p>
                              <p className="text-xs text-gray-500 mb-2">{row.label}</p>
                              <p className="text-emerald-700 font-medium">Approved: {row.approved ?? 0}</p>
                              <p className="text-red-600 font-medium">Rejected: {row.rejected ?? 0}</p>
                              <p className="text-amber-600 font-medium">Pending: {row.pending ?? 0}</p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="approved" stackId="a" fill="#10B981" name="Approved" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="rejected" stackId="a" fill="#EF4444" name="Rejected" />
                      <Bar dataKey="pending" stackId="a" fill="#F59E0B" name="Pending" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-4 text-xs font-medium text-gray-600">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block size-2.5 rounded-full bg-emerald-500" aria-hidden />
                  Approved
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block size-2.5 rounded-full bg-red-500" aria-hidden />
                  Rejected
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block size-2.5 rounded-full bg-amber-500" aria-hidden />
                  Pending
                </span>
              </div>
            </ChartPanel>
          ) : (
            <ChartPanel id="leave-trend" title="Leave trend" subtitle="No leave data for the selected period">
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                <Clock className="h-8 w-8 text-gray-300" />
                <span className="text-sm">No days in range for leave trend</span>
              </div>
            </ChartPanel>
          )}

          {/* Staff compliance & labor cost */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartPanel id="staff-compliance" title="Staff compliance" subtitle="Net hours logged vs minimum required for each team member">
              <div className="max-h-[28rem] overflow-y-auto pr-1 space-y-3">
                {staffAnalytics.length > 0 ? (
                  (staffAnalytics as StaffAnalyticsRow[])
                    .slice()
                    .sort((a, b) => (b.compliancePct ?? 0) - (a.compliancePct ?? 0))
                    .map((s) => {
                      const pct = Math.min(100, Math.max(0, s.compliancePct ?? 0));
                      const net = s.netHours ?? 0;
                      const min = s.minHoursRequired ?? 0;
                      const status = s.status ?? 'met';
                      const statusStyles =
                        status === 'overtime'
                          ? { bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-800 ring-amber-100', label: 'Over target' }
                          : status === 'under'
                            ? { bar: 'bg-rose-500', badge: 'bg-rose-50 text-rose-800 ring-rose-100', label: 'Below target' }
                            : { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-800 ring-emerald-100', label: 'On target' };
                      return (
                        <div
                          key={s.id ?? s.name}
                          className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:border-emerald-100/80 transition-colors"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-700 font-bold text-sm ring-1 ring-slate-100">
                                {(s.name ?? '?').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{s.name}</p>
                                <p className="text-xs text-gray-500 truncate">{s.role}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${statusStyles.badge}`}>
                                {statusStyles.label}
                              </span>
                              <span className="text-lg font-black text-gray-900 tabular-nums">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden mb-2">
                            <div
                              className={`h-full rounded-full transition-all ${statusStyles.bar}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                            <span>
                              <span className="font-semibold text-gray-700 tabular-nums">{net.toFixed(1)}h</span> net logged
                            </span>
                            <span>
                              Target: <span className="font-semibold text-gray-700 tabular-nums">{min.toFixed(1)}h</span>
                            </span>
                            {status === 'overtime' && (s.overtimeHours ?? 0) > 0 ? (
                              <span className="text-amber-700 font-medium tabular-nums">+{(s.overtimeHours ?? 0).toFixed(1)}h over</span>
                            ) : null}
                            {status === 'under' && (s.underHours ?? 0) > 0 ? (
                              <span className="text-rose-700 font-medium tabular-nums">−{(s.underHours ?? 0).toFixed(1)}h short</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                    <BarChart3 className="h-8 w-8 text-gray-300" />
                    <span className="text-sm">No staff data</span>
                  </div>
                )}
              </div>
            </ChartPanel>

            <ChartPanel id="labor-cost" title="Labor cost estimate" subtitle="Daily earned per staff (this period)">
              <div className="max-h-80 overflow-y-auto">
                {staffAnalytics.filter((s: { dailyEarned?: number }) => (s.dailyEarned ?? 0) > 0).length > 0 ? (
                  <div className="space-y-1">
                    {staffAnalytics
                      .filter((s: { dailyEarned?: number }) => (s.dailyEarned ?? 0) > 0)
                      .sort((a: { dailyEarned?: number }, b: { dailyEarned?: number }) => (b.dailyEarned ?? 0) - (a.dailyEarned ?? 0))
                      .map((s: { id?: string; name?: string; dailyEarned?: number; role?: string }) => (
                        <div
                          key={s.id}
                          className="flex justify-between items-center py-3 px-3 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 font-bold text-xs ring-1 ring-amber-100">
                              {(s.name ?? '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 truncate">{s.name}</p>
                              <p className="text-xs text-gray-500">{s.role}</p>
                            </div>
                          </div>
                          <p className="font-bold text-emerald-700 tabular-nums shrink-0 ml-3">
                            ₹{(s.dailyEarned ?? 0).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    <div className="pt-4 mt-3 border-t border-gray-100 flex justify-between items-center px-3 py-2 rounded-xl bg-emerald-50/50 ring-1 ring-emerald-100">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="text-lg font-black text-emerald-700 tabular-nums">₹{laborCostEstimate.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
                    <Wallet className="h-8 w-8 text-gray-300" />
                    <span className="text-sm">No salary data</span>
                  </div>
                )}
              </div>
            </ChartPanel>
          </div>

          {/* Export Range Modal */}
          {showExportModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl shadow-slate-900/20 w-full max-w-md overflow-hidden animate-slide-up ring-1 ring-black/5">
                <div className="p-6 border-b border-gray-50 bg-gradient-to-r from-slate-50 to-emerald-50/30">
                  <h3 className="text-lg font-bold text-gray-900">Export Analytics Report</h3>
                  <p className="text-sm text-gray-500 mt-1">Choose the time range for your export</p>
                </div>
                <div className="p-6 space-y-3">
                  <button
                    onClick={() => void performExport('current')}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all text-left group"
                    disabled={isExporting}
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Current Filter</p>
                      <p className="text-xs text-gray-500 mt-0.5">Export exactly what you see on screen</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                  </button>

                  <button
                    onClick={() => void performExport('30days')}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all text-left group"
                    disabled={isExporting}
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Last 30 Days</p>
                      <p className="text-xs text-gray-500 mt-0.5">Full month report regardless of filters</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                      <Clock className="h-5 w-5" />
                    </div>
                  </button>

                  <button
                    onClick={() => void performExport('custom')}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all text-left group"
                    disabled={isExporting}
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Custom Range</p>
                      <p className="text-xs text-gray-500 mt-0.5">Select specific start and end dates</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                      <Download className="h-5 w-5" />
                    </div>
                  </button>
                </div>
                <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Per-staff attendance accordion */}
          <ChartPanel
            id="attendance-by-day-detail"
            title="Attendance by day"
            subtitle="For each staff member: IST calendar days with clock-in, total net hours, and day-by-day punch table. Uses the same period and search filter as the rest of this page."
            bodyClassName="p-0"
          >
            <div className="divide-y divide-gray-50">
              {(staffAnalytics as StaffAnalyticsRow[]).length === 0 ? (
                <p className="p-8 text-center text-gray-400 text-sm">No staff in view</p>
              ) : (
                (staffAnalytics as StaffAnalyticsRow[]).map((s) => {
                  const rows = s.dailyAttendance ?? [];
                  const daysPresent = s.daysPresent ?? 0;
                  return (
                    <details key={String(s.id ?? s.name)} className="group px-4 sm:px-6 py-1">
                      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 py-4 rounded-xl hover:bg-slate-50/80 transition-colors [&::-webkit-details-marker]:hidden">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm ring-1 ring-emerald-100">
                            {(s.name ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-gray-900 truncate block">{s.name ?? '—'}</span>
                            <span className="text-sm text-gray-500 truncate block">{s.role ?? ''}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 text-sm">
                          <span className="tabular-nums text-gray-600 hidden sm:inline">
                            <span className="font-bold text-emerald-800">{daysPresent}</span> day{daysPresent === 1 ? '' : 's'}
                          </span>
                          <span className="tabular-nums font-bold text-gray-900">
                            {(s.netHours ?? 0).toFixed(1)}h net
                          </span>
                          <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 group-open:bg-emerald-50 group-open:border-emerald-200 group-open:text-emerald-800 transition-colors">
                            Details
                          </span>
                        </div>
                      </summary>
                      <div className="pb-5 pt-0 overflow-x-auto">
                        {rows.length === 0 ? (
                          <p className="text-sm text-gray-500 py-2 px-1">No punch data in this period.</p>
                        ) : (
                          <table className="w-full min-w-[520px] text-sm rounded-xl overflow-hidden ring-1 ring-gray-100">
                            <thead className="bg-slate-50/80 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                              <tr>
                                <th className="px-4 py-2.5">Shift date (IST)</th>
                                <th className="px-4 py-2.5">Punch in</th>
                                <th className="px-4 py-2.5">Punch out</th>
                                <th className="px-4 py-2.5 text-right">Net hours</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {rows.map((r) => (
                                <tr key={r.date} className="bg-white hover:bg-emerald-50/30 transition-colors">
                                  <td className="px-4 py-2.5 font-medium text-gray-800 tabular-nums">{r.date}</td>
                                  <td className="px-4 py-2.5 text-gray-600">{fmtIst(r.punchIn)}</td>
                                  <td className="px-4 py-2.5 text-gray-600">{fmtIst(r.punchOut)}</td>
                                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-700">
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
          </ChartPanel>

          {/* Quick insights */}
          <div className={`${CARD_SHELL} overflow-hidden`}>
            <div className="relative px-6 py-6 sm:px-8 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
              <div className="relative flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold tracking-tight">Insights for owners</h2>
              </div>
              <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 ring-1 ring-white/15 hover:bg-white/15 transition-colors">
                  <p className="text-sm font-bold text-emerald-100">Shift coverage</p>
                  <p className="text-sm text-white/90 mt-1.5 leading-relaxed">
                    {shiftDistribution.find((s: { shift: string }) => s.shift === 'Day')?.count ?? 0} day staff,{' '}
                    {shiftDistribution.find((s: { shift: string }) => s.shift === 'Night')?.count ?? 0} night staff
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 ring-1 ring-white/15 hover:bg-white/15 transition-colors">
                  <p className="text-sm font-bold text-emerald-100">Overtime</p>
                  <p className="text-sm text-white/90 mt-1.5 leading-relaxed">
                    {staffAnalytics.filter((s: { status?: string }) => s.status === 'overtime').length} staff over target hours
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 ring-1 ring-white/15 hover:bg-white/15 transition-colors">
                  <p className="text-sm font-bold text-emerald-100">Under hours</p>
                  <p className="text-sm text-white/90 mt-1.5 leading-relaxed">
                    {staffAnalytics.filter((s: { status?: string }) => s.status === 'under').length} staff below target
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 ring-1 ring-white/15 hover:bg-white/15 transition-colors">
                  <p className="text-sm font-bold text-emerald-100">Export</p>
                  <p className="text-sm text-white/90 mt-1.5 leading-relaxed">Download CSV for accounting or payroll</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
