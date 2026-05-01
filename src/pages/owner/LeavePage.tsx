import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { leaveApi } from '@/api/leave';
import { employeeApi } from '@/api/employee';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ListSearchBar } from '@/components/ListSearchBar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Plus, X, Calendar, User, Crown, ChevronRight, Shield } from 'lucide-react';
import { CalendarDateField } from '@/components/CalendarDateField';
import { SearchableSelect } from '@/components/SearchableSelect';

export function LeavePage() {
  const { selectedOutletId } = useOutletStore();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [leaveSearch, setLeaveSearch] = useState('');
  const debouncedLeaveSearch = useDebouncedValue(leaveSearch, 350);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', selectedOutletId, statusFilter, debouncedLeaveSearch],
    queryFn: () =>
      leaveApi.getLeaves(selectedOutletId!, {
        status: statusFilter,
        limit: 100,
        search: debouncedLeaveSearch.trim() || undefined,
      }),
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

  const assignMutation = useMutation({
    mutationFn: (payload: any) => leaveApi.assign({ ...payload, outletId: selectedOutletId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      setShowCreateModal(false);
    },
  });

  const { data: staffData } = useQuery({
    queryKey: ['my-employees', selectedOutletId],
    queryFn: () => employeeApi.getMyEmployees({ outletId: selectedOutletId!, limit: 100 }),
    enabled: !!selectedOutletId && showCreateModal,
  });

  const staffOptions = [
    { value: 'owner', label: 'Assign to Self (Owner)' },
    ...(staffData?.data?.employees ?? []).map((e: any) => ({
      value: e._id,
      label: e.name,
    })),
  ];

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
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leave management</h1>
            <p className="text-gray-500 mt-0.5">Approve or reject leave requests</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200"
            >
              <Plus className="h-4 w-4" /> Create Leave
            </button>
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl shrink-0">

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
      </div>
        <ListSearchBar
          value={leaveSearch}
          onChange={setLeaveSearch}
          placeholder="Search by staff name, phone, or reason"
          className="max-w-xl"
          id="leave-search"
          aria-label="Search leave requests"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in-stagger">
          {leaves.map((l: any) => (
            <div
              key={l._id}
              className={`group rounded-2xl border p-5 card-hover overflow-hidden ${
                l.status === 'approved' ? 'bg-emerald-50/50 border-emerald-200' : l.status === 'rejected' ? 'bg-red-50/50 border-red-200' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${l.ownerId ? 'bg-amber-100 text-amber-600' : 'bg-violet-100 text-violet-600'}`}>
                  {l.ownerId ? <Crown className="h-6 w-6" /> : (l.employeeId?.name ?? '?').charAt(0).toUpperCase()}
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${
                    l.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : l.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {l.status ?? 'pending'}
                </span>
              </div>
              <p className="font-semibold text-gray-900">
                {l.employeeId?.name ?? l.ownerId?.name ?? 'Owner'}
                {l.ownerId && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-lg uppercase tracking-wider font-bold">Owner</span>}
              </p>
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
          <p className="text-gray-500">
            {debouncedLeaveSearch.trim() ? 'No leave requests match your search.' : 'No leave requests'}
          </p>
        </div>
      )}

      {showCreateModal && (
        <CreateLeaveModal
          onClose={() => setShowCreateModal(false)}
          onAssign={(payload) => assignMutation.mutate(payload)}
          isPending={assignMutation.isPending}
          staffOptions={staffOptions}
        />
      )}
    </div>
  );
}

function CreateLeaveModal({
  onClose,
  onAssign,
  isPending,
  staffOptions,
}: {
  onClose: () => void;
  onAssign: (payload: any) => void;
  isPending: boolean;
  staffOptions: { value: string; label: string }[];
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    onAssign({
      employeeId: employeeId === 'owner' ? undefined : employeeId,
      isOwner: employeeId === 'owner',
      startDate,
      endDate,
      reason,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up relative overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Create Leave</h2>
          <p className="text-sm text-gray-500 mt-1">Assign leave to yourself or a staff member</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 ml-1">Assign To</label>
            <SearchableSelect
              value={employeeId}
              onChange={setEmployeeId}
              options={staffOptions}
              placeholder="Select person..."
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 ml-1">From Date</label>
              <CalendarDateField
                value={startDate}
                onChange={(val) => {
                  setStartDate(val);
                  if (new Date(val) > new Date(endDate)) setEndDate(val);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 ml-1">To Date</label>
              <CalendarDateField
                value={endDate}
                onChange={setEndDate}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 ml-1">Reason (Optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Family function, Sick leave..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/30 text-sm min-h-[100px] resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending || !employeeId}
              className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm shadow-emerald-200"
            >
              {isPending ? 'Assigning...' : 'Assign Leave'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-6 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
