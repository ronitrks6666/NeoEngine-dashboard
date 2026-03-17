import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useOutletStore } from '@/stores/outletStore';
import { managerApi } from '@/api/manager';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { UserCheck, Users, ClipboardList, UserCircle, Clock, Coffee } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const TASK_COLORS = { pending: '#F59E0B', done: '#059669', escalated: '#EF4444' };

export function OwnerDashboardPage() {
  const { user } = useAuth();
  const { selectedOutletId } = useOutletStore();
  const [taskRange, setTaskRange] = useState<'today' | 'week'>('today');
  const [punchRange, setPunchRange] = useState<'today' | 'week'>('today');

  const { data, isLoading, error } = useQuery({
    queryKey: ['manager-dashboard', selectedOutletId],
    queryFn: () => managerApi.getDashboard(selectedOutletId ?? undefined),
    enabled: !!selectedOutletId,
  });

  const { data: tasksData } = useQuery({
    queryKey: ['dashboard-tasks', selectedOutletId, taskRange],
    queryFn: () => managerApi.getDashboardTasks(selectedOutletId!, { dateRange: taskRange }),
    enabled: !!selectedOutletId,
  });

  const { data: punchesData } = useQuery({
    queryKey: ['dashboard-punches-daily', selectedOutletId, punchRange],
    queryFn: () => managerApi.getDashboardPunchesDaily(selectedOutletId!, { dateRange: punchRange }),
    enabled: !!selectedOutletId,
  });

  if (isLoading) return <div className="p-6"><LoadingSpinner /></div>;
  if (error) return <div className="p-6 text-red-600">Failed to load dashboard</div>;

  const summary = data?.todaySummary;
  const staffStatus = data?.staffStatus ?? [];
  const lateStaff = staffStatus.filter((s) => s.isLate);
  const taskBreakdown = tasksData?.data ?? { pending: 0, done: 0, escalated: 0 };
  const punchDaily = punchesData?.data?.daily ?? [];

  const taskPieData = [
    { name: 'Pending', value: taskBreakdown.pending || 0, color: TASK_COLORS.pending },
    { name: 'Done', value: taskBreakdown.done || 0, color: TASK_COLORS.done },
    { name: 'Escalated', value: taskBreakdown.escalated || 0, color: TASK_COLORS.escalated },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-emerald-900">Welcome, {user?.name || 'Owner'}</h1>
        <p className="text-emerald-700 mt-0.5 font-medium">{data?.outletName || 'Select an outlet'}</p>
      </div>

      {!selectedOutletId && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800">
          Select an outlet from the dropdown above to see dashboard data.
        </div>
      )}

      {selectedOutletId && summary && (
        <>
          {lateStaff.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl animate-slide-up">
              <h3 className="font-semibold text-amber-800 mb-2">Late arrivals ({lateStaff.length})</h3>
              <div className="flex flex-wrap gap-2">
                {lateStaff.map((s) => (
                  <span key={s.id} className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-sm">
                    {s.name} ({s.role})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-in-stagger">
            <div className="bg-white rounded-2xl border border-emerald-100 p-5 card-hover shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-700">Checked in today</p>
                  <p className="text-2xl font-bold text-emerald-600">{summary.checkedInToday}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-emerald-100 p-5 card-hover shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-700">Working now</p>
                  <p className="text-2xl font-bold text-emerald-600">{summary.workingNow}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-emerald-100 p-5 card-hover shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-700">Pending tasks</p>
                  <p className="text-2xl font-bold text-amber-600">{summary.pendingTasks}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-emerald-100 p-5 card-hover shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-700">Total staff</p>
                  <p className="text-2xl font-bold text-emerald-600">{summary.totalEmployees}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Staff status - card grid */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Staff status</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 animate-in-stagger">
              {staffStatus.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-xl border p-4 flex items-center gap-3 ${
                    s.status === 'working'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : s.status === 'break'
                        ? 'bg-amber-50/50 border-amber-200'
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    s.status === 'working' ? 'bg-emerald-100 text-emerald-700' :
                    s.status === 'break' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {s.status === 'working' ? <Clock className="h-5 w-5" /> : s.status === 'break' ? <Coffee className="h-5 w-5" /> : (s.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {s.name}
                      {s.isLate && <span className="text-amber-600 text-xs ml-1">(Late)</span>}
                    </p>
                    <p className="text-sm text-gray-500">{s.role}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-medium shrink-0 ${
                    s.status === 'working' ? 'bg-emerald-100 text-emerald-700' :
                    s.status === 'break' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
            {staffStatus.length === 0 && <p className="text-gray-500 py-8 text-center">No staff in this outlet</p>}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Task pie chart */}
            <div className="bg-white rounded-2xl border border-emerald-100 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-emerald-50 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
                  <p className="text-sm text-gray-500">Pending, done, escalated</p>
                </div>
                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                  {(['today', 'week'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setTaskRange(r)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${taskRange === r ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:text-emerald-600'}`}
                    >
                      {r === 'today' ? 'Today' : 'This week'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6 h-64">
                {taskPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {taskPieData.map((_, i) => (
                          <Cell key={i} fill={taskPieData[i].color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">No tasks in this period</div>
                )}
              </div>
            </div>

            {/* Punch-in daily trend */}
            <div className="bg-white rounded-2xl border border-emerald-100 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-emerald-50 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Daily punch-ins</h2>
                  <p className="text-sm text-gray-500">Staff clock-in trend</p>
                </div>
                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                  {(['today', 'week'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setPunchRange(r)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${punchRange === r ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:text-emerald-600'}`}
                    >
                      {r === 'today' ? 'Today' : 'This week'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6 h-64">
                {punchDaily.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={punchDaily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                      <Tooltip />
                      <Bar dataKey="count" name="Punch-ins" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">No punch data</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
