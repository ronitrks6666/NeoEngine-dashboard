import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HighlightSection } from '@/components/HighlightSection';
import { useOutletStore } from '@/stores/outletStore';
import { managerApi } from '@/api/manager';
import { leaveApi } from '@/api/leave';

/**
 * Web-only Reports page for restaurant/retail owners.
 * Staff roster, upcoming leave, shift planning.
 */
export function ReportsPage() {
  const { selectedOutletId } = useOutletStore();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<'roster' | 'leave'>('roster');

  useEffect(() => {
    const h = searchParams.get('highlight');
    if (h === 'roster') setView('roster');
    else if (h === 'leave') setView('leave');
  }, [searchParams]);

  const today = new Date().toISOString().slice(0, 10);
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const endDate = nextMonth.toISOString().slice(0, 10);

  const { data: dashboardData } = useQuery({
    queryKey: ['manager-dashboard', selectedOutletId],
    queryFn: () => managerApi.getDashboard(selectedOutletId ?? undefined),
    enabled: !!selectedOutletId,
  });

  const { data: leaveData } = useQuery({
    queryKey: ['leaves-upcoming', selectedOutletId, today, endDate],
    queryFn: () =>
      leaveApi.getLeaves(selectedOutletId!, {
        status: 'approved',
        startDate: today,
        endDate,
        limit: 50,
      }),
    enabled: !!selectedOutletId && view === 'leave',
  });

  const staffStatus = dashboardData?.staffStatus ?? [];
  const upcomingLeaves = leaveData?.data?.leaves ?? leaveData?.leaves ?? [];

  if (!selectedOutletId) {
    return <div className="p-6 text-amber-600">Select an outlet first.</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500">Web-only insights for planning and staffing</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView('roster')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            view === 'roster' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Today&apos;s roster
        </button>
        <button
          onClick={() => setView('leave')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            view === 'leave' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Upcoming leave
        </button>
      </div>

      {view === 'roster' && (
        <HighlightSection id="roster">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-cyan-50">
            <h2 className="text-lg font-semibold text-gray-900">Staff roster — Today</h2>
            <p className="text-sm text-gray-500">Who&apos;s working, on break, or absent</p>
          </div>
          <div className="p-6">
            {staffStatus.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {staffStatus.map((s: { id: string; name: string; role: string; status: string; isLate?: boolean }) => (
                  <div
                    key={s.id}
                    className={`rounded-lg border p-4 ${
                      s.status === 'working'
                        ? 'border-emerald-200 bg-emerald-50'
                        : s.status === 'break'
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        <p className="text-sm text-gray-500">{s.role}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.status === 'working'
                            ? 'bg-emerald-100 text-emerald-700'
                            : s.status === 'break'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                    {s.isLate && (
                      <p className="mt-2 text-xs text-amber-600">Late arrival</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No staff data. Check outlet selection.</p>
            )}
          </div>
        </div>
        </HighlightSection>
      )}

      {view === 'leave' && (
        <HighlightSection id="leave">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-cyan-50">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming approved leave</h2>
            <p className="text-sm text-gray-500">Plan staffing for the next 30 days</p>
          </div>
          <div className="p-6">
            {upcomingLeaves.length > 0 ? (
              <div className="space-y-3">
                {upcomingLeaves.map((l: { _id: string; employeeId?: { name: string }; date?: string; reason?: string }) => (
                  <div key={l._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{l.employeeId?.name ?? 'Unknown'}</p>
                      <p className="text-sm text-gray-500">
                        {l.date ? new Date(l.date).toLocaleDateString() : '-'}
                      </p>
                      {l.reason && <p className="text-xs text-gray-400 mt-0.5">{l.reason}</p>}
                    </div>
                    <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs font-medium">On leave</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No upcoming leave in the next 30 days</p>
            )}
          </div>
        </div>
        </HighlightSection>
      )}

      {/* Quick tips */}
      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm font-medium text-amber-800">Tip for owners</p>
        <p className="text-sm text-amber-700 mt-1">
          Use the roster to plan shift coverage. Check upcoming leave before scheduling to avoid understaffing during busy periods.
        </p>
      </div>
    </div>
  );
}
