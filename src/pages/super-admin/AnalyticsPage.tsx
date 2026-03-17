import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export function AnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: adminApi.getAnalytics,
  });

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Failed to load analytics</div>;

  const cards = [
    { label: 'Total Owners', value: data?.totalOwners ?? 0 },
    { label: 'Total Outlets', value: data?.totalOutlets ?? 0 },
    { label: 'Total Employees', value: data?.totalEmployees ?? 0 },
    { label: 'Punches (30 days)', value: data?.punchesLast30Days ?? 0 },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">System Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">{c.label}</p>
            <p className="text-2xl font-bold text-primary">{c.value}</p>
          </div>
        ))}
      </div>

      {data?.punchesByDay && data.punchesByDay.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Punches per day (last 30 days)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.punchesByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#0F766E" strokeWidth={2} name="Punches" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data?.punchesByDay && data.punchesByDay.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-4">Punches by day (bar)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.punchesByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#14B8A6" name="Punches" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
