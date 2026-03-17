import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { leaveApi } from '@/api/leave';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export function LeavePage() {
  const { selectedOutletId } = useOutletStore();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', selectedOutletId, statusFilter],
    queryFn: () => leaveApi.getLeaves(selectedOutletId!, { status: statusFilter, limit: 100 }),
    enabled: !!selectedOutletId,
  });

  const approveMutation = useMutation({
    mutationFn: (leaveId: string) => leaveApi.approve(leaveId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaves'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ leaveId, reason }: { leaveId: string; reason?: string }) => leaveApi.reject(leaveId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaves'] }),
  });

  const leaves = data?.data?.leaves ?? data?.leaves ?? [];

  if (!selectedOutletId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <div className="text-center animate-fade-in">
          <p className="text-amber-600 text-lg">Select an outlet first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave management</h1>
          <p className="text-gray-500 mt-0.5">Approve or reject leave requests</p>
        </div>
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
          {['pending', 'approved', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === s ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in-stagger">
          {leaves.map((l: { _id: string; employeeId?: { name: string }; date?: string; startDate?: string; endDate?: string; status?: string; reason?: string }) => (
            <div
              key={l._id}
              className={`group rounded-2xl border p-5 card-hover overflow-hidden ${
                l.status === 'approved' ? 'bg-emerald-50/50 border-emerald-200' : l.status === 'rejected' ? 'bg-red-50/50 border-red-200' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center text-xl font-bold text-violet-600">
                  {(l.employeeId?.name ?? '?').charAt(0).toUpperCase()}
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${
                    l.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : l.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {l.status ?? 'pending'}
                </span>
              </div>
              <p className="font-semibold text-gray-900">{l.employeeId?.name ?? '-'}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {l.date ? new Date(l.date).toLocaleDateString() : l.startDate && l.endDate ? `${new Date(l.startDate).toLocaleDateString()} — ${new Date(l.endDate).toLocaleDateString()}` : '-'}
              </p>
              {l.reason && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{l.reason}</p>}
              {statusFilter === 'pending' && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => approveMutation.mutate(l._id)}
                    disabled={approveMutation.isPending}
                    className="flex-1 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate({ leaveId: l._id })}
                    disabled={rejectMutation.isPending}
                    className="flex-1 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {leaves.length === 0 && !isLoading && (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-6xl mb-4 opacity-30">📅</div>
          <p className="text-gray-500">No leave requests</p>
        </div>
      )}

      {(approveMutation.isError || rejectMutation.isError) && (
        <p className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
          {getApiErrorMessage(approveMutation.error ?? rejectMutation.error)}
        </p>
      )}
    </div>
  );
}
