import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, subDays } from 'date-fns';

export function AnalyticsPage() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [outletId, setOutletId] = useState('');

  const { data: outlets = [] } = useQuery({
    queryKey: ['admin-outlets'],
    queryFn: adminApi.getOutlets,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-analytics', startDate, endDate, outletId],
    queryFn: () => adminApi.getAnalytics({ startDate, endDate, outletId }),
  });

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Failed to load analytics</div>;

  const cards = [
    { label: 'Total Owners', value: data?.totalOwners ?? 0 },
    { label: 'Total Outlets', value: data?.totalOutlets ?? 0 },
    { label: 'Total Employees', value: data?.totalEmployees ?? 0 },
    { label: 'Punches (Range)', value: data?.punchesDateRange ?? 0 },
    { label: 'Total Issues', value: data?.totalIssues ?? 0 },
    { label: 'Open Issues', value: data?.openIssues ?? 0 },
    { label: 'Total Tickets', value: data?.totalTickets ?? 0 },
    { label: 'Open Tickets', value: data?.openTickets ?? 0 },
  ];

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">System Analytics</h1>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Outlet</label>
            <select
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-40"
            >
              <option value="">All Outlets</option>
              {outlets.map((o: any) => (
                <option key={o._id} value={o._id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">{c.label}</p>
            <p className="text-2xl font-bold text-primary">{c.value}</p>
          </div>
        ))}
      </div>

      {data?.punchesByDay && data.punchesByDay.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Punches per day</h2>
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
