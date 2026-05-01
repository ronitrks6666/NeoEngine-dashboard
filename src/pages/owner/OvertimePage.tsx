import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { overtimeApi, type OvertimeRequest } from '@/api/overtime';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  CheckCircle2,
  Eye,
  X,
  Undo2,
} from 'lucide-react';

const STATUS_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200' },
  draft: { bg: 'bg-gray-50', text: 'text-gray-600', ring: 'ring-gray-200' },
};

function formatDisplayDate(dateStr: string) {
  const ymd = typeof dateStr === 'string' ? dateStr.split('T')[0] : String(dateStr);
  const d = new Date(ymd + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function OvertimePage() {
  const { selectedOutletId } = useOutletStore();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [detailModal, setDetailModal] = useState<OvertimeRequest | null>(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [unapproveModal, setUnapproveModal] = useState(false);
  const [reasonText, setReasonText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['overtime', selectedOutletId, filter],
    queryFn: () =>
      overtimeApi.getOutletOvertime(selectedOutletId!, {
        status: filter === 'all' ? undefined : filter,
      }),
    enabled: !!selectedOutletId,
  });

  const { data: detailData } = useQuery({
    queryKey: ['overtime-detail', detailModal?._id],
    queryFn: () => overtimeApi.getRequestDetail(detailModal!._id),
    enabled: !!detailModal,
  });

  const requests = data?.data?.requests ?? [];
  const pendingCount = data?.data?.pendingCount ?? 0;
  const detailRequest = detailData?.data?.request;
  const canUnapprove = detailData?.data?.canUnapprove ?? false;

  const approveMutation = useMutation({
    mutationFn: (id: string) => overtimeApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
      setDetailModal(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => overtimeApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
      setDetailModal(null);
      setRejectModal(false);
      setReasonText('');
    },
  });

  const unapproveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => overtimeApi.unapprove(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime'] });
      setDetailModal(null);
      setUnapproveModal(false);
      setReasonText('');
    },
  });

  if (!selectedOutletId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <p className="text-amber-600 text-lg">Select an outlet first.</p>
      </div>
    );
  }

  const tabs: { key: typeof filter; label: string; count?: number }[] = [
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Overtime Approvals</h1>
        <p className="text-gray-500 mt-1">Review and manage overtime requests from your staff</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === t.key ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold min-w-[18px] text-center">
                {t.count > 99 ? '99+' : t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : requests.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <p className="text-gray-500">No {filter === 'all' ? '' : filter} overtime requests.</p>
        </div>
      ) : (
        <div className="grid gap-3 animate-in-stagger">
          {requests.map((req) => {
            const scfg = STATUS_COLORS[req.status];
            return (
              <button
                key={req._id}
                onClick={() => setDetailModal(req)}
                className="w-full text-left rounded-2xl border border-gray-200 bg-white p-5 card-hover flex items-center justify-between transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{req.employeeId?.name || '—'}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{formatDisplayDate(req.date)}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-lg font-bold text-emerald-700">{req.overtimeHours}h</span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${scfg?.bg} ${scfg?.text}`}>
                    {req.status}
                  </span>
                  <Eye className="h-4 w-4 text-gray-400" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg mx-0 sm:mx-4 max-h-[85vh] overflow-y-auto animate-slide-up border border-gray-100 relative">
            <button type="button" onClick={() => setDetailModal(null)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors z-10" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-5">Request Detail</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Employee</span>
                  <span className="font-semibold text-gray-900">{detailRequest?.employeeId?.name || detailModal.employeeId?.name || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Date</span>
                  <span className="font-semibold text-gray-900">{formatDisplayDate(detailModal.date)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Hours</span>
                  <span className="font-semibold text-emerald-700 text-lg">{detailModal.overtimeHours}h</span>
                </div>
                {detailRequest?.description && (
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">Description</span>
                    <p className="text-gray-800 bg-gray-50 rounded-xl p-3 text-sm">{detailRequest.description}</p>
                  </div>
                )}
                {detailRequest?.imageUrls?.length ? (
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">Proof Images</span>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {detailRequest.imageUrls.map((url: string, i: number) => (
                        <img key={i} src={url} alt={`Proof ${i + 1}`} className="w-24 h-24 object-cover rounded-xl border border-gray-200" />
                      ))}
                    </div>
                  </div>
                ) : null}
                {detailRequest?.rejectionReason && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                    <span className="text-xs font-medium text-red-500 block mb-1">Rejection Reason</span>
                    <p className="text-sm text-red-700">{detailRequest.rejectionReason}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {detailModal.status === 'pending' && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => { setRejectModal(true); setReasonText(''); }}
                    className="flex-1 px-4 py-3 border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approveMutation.mutate(detailModal._id)}
                    disabled={approveMutation.isPending}
                    className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {approveMutation.isPending ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              )}
              {detailModal.status === 'approved' && canUnapprove && (
                <button
                  onClick={() => { setUnapproveModal(true); setReasonText(''); }}
                  className="w-full mt-6 px-4 py-3 border border-amber-200 text-amber-700 rounded-xl font-semibold hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Undo2 className="h-4 w-4" /> Unapprove
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject reason modal */}
      {rejectModal && detailModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 animate-slide-up relative">
            <button type="button" onClick={() => setRejectModal(false)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <h3 className="font-bold text-gray-900 text-lg mb-4">Rejection Reason</h3>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm"
              placeholder="Optional reason for rejection..."
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRejectModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => rejectMutation.mutate({ id: detailModal._id, reason: reasonText.trim() || undefined })}
                disabled={rejectMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unapprove reason modal */}
      {unapproveModal && detailModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 animate-slide-up relative">
            <button type="button" onClick={() => setUnapproveModal(false)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <h3 className="font-bold text-gray-900 text-lg mb-4">Unapprove Reason</h3>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
              placeholder="Optional reason for unapproving..."
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setUnapproveModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => unapproveMutation.mutate({ id: detailModal._id, reason: reasonText.trim() || undefined })}
                disabled={unapproveMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 disabled:opacity-50"
              >
                Unapprove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
