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
  MapPin,
  X,
  XCircle,
  AlertCircle,
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

function geoLabel(status?: string | null) {
  switch (status) {
    case 'inside':
      return 'Inside outlet';
    case 'outside':
      return 'Outside outlet';
    case 'no_gps':
      return 'No GPS';
    default:
      return status || 'GPS unknown';
  }
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

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['attendance-proofs'] });
    void queryClient.invalidateQueries({ queryKey: ['manager-dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['attendance'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => attendanceProofApi.approve(id),
    onSuccess: () => {
      setActionError(null);
      setDetail(null);
      setRejectOpen(false);
      invalidate();
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
      invalidate();
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
  const closeDetail = () => {
    setDetail(null);
    setRejectOpen(false);
    setRejectReason('');
    setActionError(null);
  };

  return (
    <section className="mb-8 rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Manual attendance proofs</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Review staff photos when face verify fails. Approve records the punch.
            </p>
          </div>
        </div>
        {pendingCount > 0 ? (
          <span className="self-start px-2.5 py-1 rounded-full bg-teal-700 text-white text-xs font-bold">
            {pendingCount > 99 ? '99+' : pendingCount} pending
          </span>
        ) : null}
      </div>

      <div className="flex gap-2 mb-3 p-1 bg-gray-50 rounded-xl w-full sm:w-fit overflow-x-auto border border-gray-100">
        {typeTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTypeFilter(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              typeFilter === t.key
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
            {t.count > 0 ? (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px] text-center ${
                  typeFilter === t.key ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-700'
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
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-teal-500 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            No {statusFilter === 'all' ? '' : `${statusFilter} `}
            {typeFilter === 'all' ? '' : `${proofTypeLabel(typeFilter).toLowerCase()} `}
            proofs right now.
          </p>
        </div>
      ) : (
        <div className={`grid gap-2.5 ${isFetching ? 'opacity-80' : ''}`}>
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
                className="w-full text-left rounded-xl border border-gray-200 bg-white p-3 hover:border-teal-200 hover:shadow-sm transition-all flex gap-3"
              >
                <img
                  src={proof.photoUrl}
                  alt=""
                  className="h-14 w-14 rounded-xl object-cover bg-gray-100 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {proof.employeeName || proof.ownerName || 'Staff'}
                      </p>
                      <p className="text-xs font-semibold text-teal-700 mt-0.5">
                        {proofTypeLabel(proof.type)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${scfg.bg} ${scfg.text} ${scfg.ring}`}
                    >
                      {proof.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 truncate">
                    <Clock3 className="h-3 w-3 shrink-0" />
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
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            aria-label="Close drawer"
            onClick={closeDetail}
          />
          <aside className="relative h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-up sm:animate-fade-in border-l border-gray-100">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-start gap-3">
              <div className="h-11 w-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-lg shrink-0">
                {subjectName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-gray-900 truncate">{subjectName}</h3>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700">
                    {proofTypeLabel(detail.type)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ring-1 ${
                      (STATUS_COLORS[detail.status] || STATUS_COLORS.pending).bg
                    } ${(STATUS_COLORS[detail.status] || STATUS_COLORS.pending).text} ${
                      (STATUS_COLORS[detail.status] || STATUS_COLORS.pending).ring
                    }`}
                  >
                    {detail.status}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
                <img
                  src={detail.photoUrl}
                  alt={`Attendance proof from ${subjectName}`}
                  className="w-full max-h-[42vh] object-cover object-center"
                />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 divide-y divide-gray-100">
                <div className="flex gap-3 p-3.5">
                  <div className="h-8 w-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-400">
                      Why submitted
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {detail.failureReasonLabel || detail.failureReasonCode || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 p-3.5">
                  <div className="h-8 w-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0">
                    <Clock3 className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-400">
                      Received
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {formatWhen(detail.receivedAt || detail.capturedAt)}
                    </p>
                  </div>
                </div>
                {(detail.geofenceStatus || detail.distanceMeters != null) && (
                  <div className="flex gap-3 p-3.5">
                    <div className="h-8 w-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-teal-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-400">
                        Location
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {geoLabel(detail.geofenceStatus)}
                        {detail.distanceMeters != null
                          ? ` · ${Math.round(detail.distanceMeters)}m from outlet`
                          : ''}
                      </p>
                    </div>
                  </div>
                )}
                {detail.rejectionReason ? (
                  <div className="flex gap-3 p-3.5">
                    <div className="h-8 w-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0">
                      <XCircle className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide font-semibold text-red-400">
                        Rejection reason
                      </p>
                      <p className="text-sm font-medium text-red-800 mt-0.5">
                        {detail.rejectionReason}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              {actionError ? (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {actionError}
                </p>
              ) : null}

              {detail.status === 'pending' && rejectOpen ? (
                <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-bold text-red-700">Reject this proof?</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Staff will be asked to try again. A note is optional.
                    </p>
                  </div>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    maxLength={240}
                    placeholder="e.g. Photo unclear — please resubmit"
                    className="w-full px-3 py-2.5 rounded-xl border border-red-200 bg-white text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                  />
                </div>
              ) : null}

              {detail.status !== 'pending' ? (
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  {detail.status === 'approved' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  This proof was already {detail.status}.
                </p>
              ) : null}
            </div>

            {detail.status === 'pending' ? (
              <div className="px-5 py-4 border-t border-gray-100 bg-white">
                {rejectOpen ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setRejectOpen(false);
                        setRejectReason('');
                      }}
                      className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        rejectMutation.mutate({ id: detail.id, reason: rejectReason.trim() })
                      }
                      className="flex-[1.4] px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
                    >
                      Confirm reject
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setRejectOpen(true)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 text-red-700 font-semibold hover:bg-red-50 disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => approveMutation.mutate(detail.id)}
                      className="flex-[1.4] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-teal-700 text-white font-semibold hover:bg-teal-800 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-5 py-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeDetail}
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200"
                >
                  Done
                </button>
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
