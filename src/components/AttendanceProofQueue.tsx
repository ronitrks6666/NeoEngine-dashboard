import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  attendanceProofApi,
  type AttendanceProof,
  type AttendanceProofStatus,
  type AttendanceProofType,
} from '@/api/attendanceProof';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  Camera,
  CheckCircle2,
  Clock3,
  LogOut,
  MapPin,
  X,
  XCircle,
} from 'lucide-react';

const STATUS_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200' },
};

function proofTypeLabel(type: AttendanceProofType | string) {
  switch (type) {
    case 'BREAK_START':
      return 'Break in';
    case 'OUT':
      return 'Logout';
    default:
      return 'Punch in';
  }
}

function formatWhen(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Props = {
  outletId: string;
};

export function AttendanceProofQueue({ outletId }: Props) {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<AttendanceProofType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AttendanceProofStatus | 'all'>('pending');
  const [detail, setDetail] = useState<AttendanceProof | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['attendance-proofs', outletId, statusFilter, typeFilter],
    queryFn: () =>
      attendanceProofApi.listForOutlet(outletId, {
        status: statusFilter,
        type: typeFilter,
        limit: 50,
      }),
    enabled: !!outletId,
    refetchInterval: 60_000,
  });

  const proofs = data?.proofs ?? [];
  const pendingCount = data?.pendingCount ?? 0;
  const pendingByType = data?.pendingCountByType ?? { IN: 0, BREAK_START: 0, OUT: 0 };

  const approveMutation = useMutation({
    mutationFn: (id: string) => attendanceProofApi.approve(id),
    onSuccess: () => {
      setActionError(null);
      setDetail(null);
      setRejectOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['attendance-proofs'] });
      void queryClient.invalidateQueries({ queryKey: ['manager-dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err) => setActionError(getApiErrorMessage(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      attendanceProofApi.reject(id, reason),
    onSuccess: () => {
      setActionError(null);
      setDetail(null);
      setRejectOpen(false);
      setRejectReason('');
      void queryClient.invalidateQueries({ queryKey: ['attendance-proofs'] });
      void queryClient.invalidateQueries({ queryKey: ['manager-dashboard'] });
    },
    onError: (err) => setActionError(getApiErrorMessage(err)),
  });

  const typeTabs = useMemo(
    () =>
      [
        { key: 'all' as const, label: 'All', count: pendingCount },
        { key: 'IN' as const, label: 'Punch in', count: pendingByType.IN },
        { key: 'BREAK_START' as const, label: 'Break in', count: pendingByType.BREAK_START },
        { key: 'OUT' as const, label: 'Logout', count: pendingByType.OUT },
      ] as const,
    [pendingCount, pendingByType]
  );

  const statusTabs = [
    { key: 'pending' as const, label: 'Pending' },
    { key: 'approved' as const, label: 'Approved' },
    { key: 'rejected' as const, label: 'Rejected' },
    { key: 'all' as const, label: 'Any status' },
  ];

  const busy = approveMutation.isPending || rejectMutation.isPending;
  const subjectName = detail?.employeeName || detail?.ownerName || 'Staff';

  return (
    <section className="mb-8 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-white p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Manual attendance proofs</h2>
              <p className="text-sm text-gray-500">
                Review staff photos when face verify fails. Approve records the punch; reject asks them
                to try again.
              </p>
            </div>
          </div>
        </div>
        {pendingCount > 0 ? (
          <span className="self-start px-2.5 py-1 rounded-full bg-violet-600 text-white text-xs font-bold">
            {pendingCount > 99 ? '99+' : pendingCount} pending
          </span>
        ) : null}
      </div>

      <div className="flex gap-2 mb-3 p-1 bg-white/80 rounded-xl w-full sm:w-fit overflow-x-auto border border-violet-100/80">
        {typeTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTypeFilter(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              typeFilter === t.key
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
            {t.count > 0 ? (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px] text-center ${
                  typeFilter === t.key ? 'bg-white/25 text-white' : 'bg-violet-100 text-violet-700'
                }`}
              >
                {t.count > 99 ? '99+' : t.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {statusTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStatusFilter(t.key)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === t.key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-10" />
      ) : proofs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-violet-200 bg-white/70 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-violet-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            No {statusFilter === 'all' ? '' : `${statusFilter} `}
            {typeFilter === 'all' ? '' : `${proofTypeLabel(typeFilter).toLowerCase()} `}
            proofs right now.
          </p>
        </div>
      ) : (
        <div className={`grid gap-3 ${isFetching ? 'opacity-80' : ''}`}>
          {proofs.map((proof) => {
            const scfg = STATUS_COLORS[proof.status] || STATUS_COLORS.pending;
            return (
              <button
                key={proof.id}
                type="button"
                onClick={() => {
                  setActionError(null);
                  setDetail(proof);
                  setRejectOpen(false);
                  setRejectReason('');
                }}
                className="w-full text-left rounded-xl border border-gray-200 bg-white p-3.5 hover:border-violet-200 hover:shadow-sm transition-all flex gap-3"
              >
                <img
                  src={proof.photoUrl}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover bg-gray-100 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {proof.employeeName || proof.ownerName || 'Staff'}
                      </p>
                      <p className="text-xs font-semibold text-violet-700 mt-0.5">
                        {proofTypeLabel(proof.type)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${scfg.bg} ${scfg.text} ${scfg.ring}`}
                    >
                      {proof.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    {formatWhen(proof.receivedAt || proof.capturedAt)}
                    {proof.failureReasonLabel ? ` · ${proof.failureReasonLabel}` : ''}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{subjectName}</h3>
                <p className="text-sm text-violet-700 font-medium">{proofTypeLabel(detail.type)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetail(null);
                  setRejectOpen(false);
                  setActionError(null);
                }}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <img
                src={detail.photoUrl}
                alt={`Attendance proof from ${subjectName}`}
                className="w-full max-h-80 object-contain rounded-xl bg-gray-50 border border-gray-100"
              />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="font-semibold text-gray-900 capitalize">{detail.status}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Received</p>
                  <p className="font-semibold text-gray-900">
                    {formatWhen(detail.receivedAt || detail.capturedAt)}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 col-span-2">
                  <p className="text-xs text-gray-500">Face failure</p>
                  <p className="font-semibold text-gray-900">
                    {detail.failureReasonLabel || detail.failureReasonCode || '—'}
                  </p>
                </div>
                {(detail.geofenceStatus || detail.distanceMeters != null) && (
                  <div className="rounded-xl bg-gray-50 p-3 col-span-2 flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="font-semibold text-gray-900">
                        {detail.geofenceStatus || '—'}
                        {detail.distanceMeters != null
                          ? ` · ${Math.round(detail.distanceMeters)}m from outlet`
                          : ''}
                      </p>
                    </div>
                  </div>
                )}
                {detail.rejectionReason ? (
                  <div className="rounded-xl bg-red-50 p-3 col-span-2">
                    <p className="text-xs text-red-600">Rejection reason</p>
                    <p className="font-medium text-red-800">{detail.rejectionReason}</p>
                  </div>
                ) : null}
              </div>

              {actionError ? (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {actionError}
                </p>
              ) : null}

              {detail.status === 'pending' && !rejectOpen ? (
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => approveMutation.mutate(detail.id)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve {proofTypeLabel(detail.type).toLowerCase()}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setRejectOpen(true)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 text-red-700 font-semibold hover:bg-red-50 disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              ) : null}

              {detail.status === 'pending' && rejectOpen ? (
                <div className="space-y-3 rounded-xl border border-red-100 bg-red-50/40 p-4">
                  <label className="block text-sm font-semibold text-gray-800">
                    Reason (optional)
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    maxLength={240}
                    placeholder="e.g. Photo unclear — please resubmit"
                    className="w-full px-3 py-2 rounded-xl border border-red-200 bg-white text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        rejectMutation.mutate({ id: detail.id, reason: rejectReason.trim() })
                      }
                      className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
                    >
                      Confirm reject
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setRejectOpen(false);
                        setRejectReason('');
                      }}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {detail.status !== 'pending' ? (
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  {detail.status === 'approved' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <LogOut className="h-4 w-4 text-red-400" />
                  )}
                  This proof was already {detail.status}.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
