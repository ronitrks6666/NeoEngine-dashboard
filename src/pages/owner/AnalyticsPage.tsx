import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { analyticsApi } from '@/api/analytics';
import {
  AreaChart,
  Area,
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
} from 'recharts';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const PIE_COLORS = ['#0F766E', '#14B8A6', '#F59E0B', '#F97316', '#EF4444', '#8B5CF6'];

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

// KPI Card
function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  accent = 'primary',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
  accent?: 'primary' | 'amber' | 'success' | 'danger';
}) {
  const accentClasses = {
    primary: 'from-teal-600 to-teal-700',
    amber: 'from-amber-500 to-amber-600',
    success: 'from-emerald-600 to-emerald-700',
    danger: 'from-rose-500 to-rose-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className={`${accentClasses[accent]} px-4 py-2 flex items-center gap-2`}>
        <span className="text-2xl">{icon}</span>
        <span className="text-white/90 text-sm font-medium">{title}</span>
      </div>
      <div className="p-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        {trend && (
          <span
            className={`inline-block mt-2 text-xs font-medium ${
              trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-gray-500'
            }`}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} vs last period
          </span>
        )}
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const { selectedOutletId } = useOutletStore();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const { data, isLoading } = useQuery({
    queryKey: ['outlet-analytics', selectedOutletId, period],
    queryFn: () => analyticsApi.getOutletAnalytics(selectedOutletId!, { period }),
    enabled: !!selectedOutletId,
  });

  const handleExport = () => {
    const d = data?.data ?? data ?? {};
    const stats = d.employeeStats ?? [];
    const headers = ['Name', 'Role', 'Net Hours', 'Break Hours', 'Status', 'Compliance %', 'Daily Earned'];
    const rows: (string | number)[][] = stats.map((s: { name?: string; role?: string; netHours?: number; breakHours?: number; status?: string; compliancePct?: number; dailyEarned?: number }) => [
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
    a.download = `analytics-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!selectedOutletId) {
    return <div className="p-6 text-amber-600">Select an outlet first.</div>;
  }

  if (isLoading) return <div className="p-6"><LoadingSpinner /></div>;

  const d = data?.data ?? data ?? {};
  const staffAnalytics = d.employeeStats ?? [];
  const taskCompletionRate = d.taskCompletionRate ?? 0;
  const dailyHours = d.dailyHoursData ?? [];
  const totalHours = d.totalWorkHours ?? 0;
  const roleBreakdown = d.roleBreakdown ?? [];
  const shiftDistribution = d.shiftDistribution ?? [];
  const taskCompletionByShift = d.taskCompletionByShift ?? [];
  const leaveTrend = d.leaveTrend ?? [];
  const hoursComplianceRate = d.hoursComplianceRate ?? 0;
  const activeEmployeesToday = d.activeEmployeesToday ?? 0;
  const totalEmployees = d.totalEmployees ?? 0;

  // Labor cost estimate (sum of dailyEarned)
  const laborCostEstimate = staffAnalytics.reduce((sum: number, s: { dailyEarned?: number }) => sum + (s.dailyEarned ?? 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outlet Analytics</h1>
          <p className="text-gray-500">Insights for your restaurant or retail outlet</p>
        </div>
        <div className="flex items-center gap-2">
          {(['daily', 'weekly', 'monthly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-2"
          >
            <span>📥</span> Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="Task completion"
          value={`${taskCompletionRate}%`}
          subtitle={`${d.completedTasks ?? 0} of ${d.totalTasks ?? 0} tasks`}
          icon="✅"
          accent="primary"
        />
        <StatCard
          title="Total hours"
          value={totalHours ?? '-'}
          subtitle={`${d.averageHoursPerEmployee ?? 0} avg per staff`}
          icon="⏱️"
          accent="primary"
        />
        <StatCard
          title="Hours compliance"
          value={`${hoursComplianceRate}%`}
          subtitle={`${d.employeesMetMinHours ?? 0} met min hours`}
          icon="📊"
          accent={hoursComplianceRate >= 80 ? 'success' : 'amber'}
        />
        <StatCard
          title="Staff today"
          value={`${activeEmployeesToday}/${totalEmployees}`}
          subtitle="Currently clocked in"
          icon="👥"
          accent="primary"
        />
        <StatCard
          title="Est. labor cost"
          value={laborCostEstimate > 0 ? `₹${laborCostEstimate.toLocaleString()}` : '-'}
          subtitle="Period estimate"
          icon="💰"
          accent="amber"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily hours */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Work hours trend</h2>
            <p className="text-sm text-gray-500">Total staff hours per day</p>
          </div>
          <div className="p-4 h-72">
            {Array.isArray(dailyHours) && dailyHours.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyHours}>
                  <defs>
                    <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0F766E" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#0F766E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="hours" stroke="#0F766E" strokeWidth={2} fill="url(#hoursGradient)" name="Hours" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No data for this period</div>
            )}
          </div>
        </div>

        {/* Role breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Hours by role</h2>
            <p className="text-sm text-gray-500">Labor distribution across roles</p>
          </div>
          <div className="p-4 h-72">
            {roleBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleBreakdown}
                    dataKey="hours"
                    nameKey="role"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ role, hours }) => `${role}: ${hours}h`}
                  >
                    {roleBreakdown.map((_: unknown, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}h`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No role data</div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Shift distribution */}
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

        {/* Task completion by shift */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Task completion by shift</h2>
            <p className="text-sm text-gray-500">Which shift is more productive</p>
          </div>
          <div className="p-4 h-64">
            {taskCompletionByShift.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskCompletionByShift} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                  <YAxis dataKey="shift" type="category" width={60} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="rate" name="Completion %" fill="#0F766E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No task data</div>
            )}
          </div>
        </div>
      </div>

      {/* Leave trend */}
      {Array.isArray(leaveTrend) && leaveTrend.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Leave trend</h2>
            <p className="text-sm text-gray-500">Approved, rejected, pending by date</p>
          </div>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaveTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <Tooltip />
                <Legend />
                <Bar dataKey="approved" stackId="a" fill="#10B981" name="Approved" />
                <Bar dataKey="rejected" stackId="a" fill="#EF4444" name="Rejected" />
                <Bar dataKey="pending" stackId="a" fill="#F59E0B" name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Web-only: Staff compliance & labor cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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

        {/* Labor cost breakdown */}
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
      </div>

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
    </div>
  );
}
