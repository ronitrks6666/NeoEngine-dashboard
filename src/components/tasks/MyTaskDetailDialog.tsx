import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { format, parseISO } from 'date-fns';
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  ImagePlus,
  Loader2,
  Square,
  X,
} from 'lucide-react';
import { taskApi, type ManagerTaskChecklistItem, type ManagerTaskItem } from '@/api/task';
import { getApiErrorMessage } from '@/api/auth';

function resolveMediaUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/api\/?$/, '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

const PROOF_SKIP_REASON_MIN_LENGTH = 3;

function formatDueLabel(task: ManagerTaskItem) {
  if (task.dueAt) {
    try {
      return `Due ${format(parseISO(task.dueAt), 'h:mm a')}`;
    } catch {
      return null;
    }
  }
  if (task.startTime) return `Starts ${task.startTime}`;
  return null;
}

const WEB_PROOF_SKIP_DEFAULT =
  'Completed on web dashboard — photo/video proof requires the mobile app camera.';

interface MyTaskDetailDialogProps {
  task: ManagerTaskItem;
  viewOnly: boolean;
  /** Web cannot capture live camera proof — use skip-reason flow instead of file upload. */
  disableProofUpload?: boolean;
  onClose: () => void;
  onTaskUpdated: (task: ManagerTaskItem) => void;
  onCompleted: () => void;
}

export function MyTaskDetailDialog({
  task,
  viewOnly,
  disableProofUpload = false,
  onClose,
  onTaskUpdated,
  onCompleted,
}: MyTaskDetailDialogProps) {
  const [localTask, setLocalTask] = useState(task);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [uncompleting, setUncompleting] = useState(false);
  const [checklistBusy, setChecklistBusy] = useState<Record<string, boolean>>({});
  const [checklistMediaBusy, setChecklistMediaBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [proofModalStep, setProofModalStep] = useState<'task' | 'checklist'>('task');
  const [proofModalError, setProofModalError] = useState<string | null>(null);
  const [checklistProofFieldErrors, setChecklistProofFieldErrors] = useState<
    Record<string, string>
  >({});
  const [taskProofSkipReason, setTaskProofSkipReason] = useState('');
  const [checklistProofSkipReasons, setChecklistProofSkipReasons] = useState<Record<string, string>>({});
  const proofInputRef = useRef<HTMLInputElement>(null);
  const checklistFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setLocalTask(task);
    setProofPreview(null);
    setProofFile(null);
    setError(null);
  }, [task]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sortedChecklist = useMemo(
    () =>
      [...(localTask.checklistItems ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      ),
    [localTask.checklistItems]
  );

  const checklistDoneCount = sortedChecklist.filter((i) => i.isCompleted).length;
  const canEdit = !viewOnly && !localTask.isCompleted;

  const completionProofUrl =
    proofPreview ||
    resolveMediaUrl(localTask.photoPath) ||
    localTask.completionMedia?.[0]?.url ||
    null;

  const hasTaskProof = Boolean(proofFile || completionProofUrl);
  const mandatoryProof = Boolean(localTask.mandatoryProofOfCompletion);
  const missingChecklistProof = sortedChecklist.filter(
    (item) => !(item.staffMedia && item.staffMedia.length > 0)
  );

  const finalizeMarkDone = async (options?: {
    completionProofSkipReason?: string;
    checklistProofSkipReasons?: Array<{ itemId: string; reason: string }>;
  }) => {
    if (!canEdit || completing) return;
    setCompleting(true);
    setError(null);
    try {
      let photoUrl: string | undefined;
      if (proofFile) {
        setUploadingProof(true);
        const uploaded = await taskApi.uploadTaskCompletionPhoto(proofFile);
        photoUrl = uploaded.url;
        setUploadingProof(false);
      } else if (completionProofUrl && !proofFile) {
        photoUrl = completionProofUrl;
      }
      await taskApi.completeOnBehalf(localTask.id, {
        ...(photoUrl ? { photoUrl } : {}),
        ...(options?.completionProofSkipReason
          ? { completionProofSkipReason: options.completionProofSkipReason }
          : {}),
        ...(options?.checklistProofSkipReasons?.length
          ? { checklistProofSkipReasons: options.checklistProofSkipReasons }
          : {}),
      });
      setProofModalOpen(false);
      onCompleted();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUploadingProof(false);
      setCompleting(false);
    }
  };

  const handleMarkDone = async () => {
    if (!canEdit || completing) return;
    if (!localTask.id) {
      setError('This task is not ready to complete yet. Refresh the page and try again.');
      return;
    }
    if (!mandatoryProof) {
      await finalizeMarkDone();
      return;
    }

    if (disableProofUpload) {
      const webReason = taskProofSkipReason.trim() || WEB_PROOF_SKIP_DEFAULT;
      if (missingChecklistProof.length > 0) {
        const reasons = missingChecklistProof.map((item) => ({
          itemId: item.id,
          reason: (checklistProofSkipReasons[item.id] || '').trim() || WEB_PROOF_SKIP_DEFAULT,
        }));
        await finalizeMarkDone({
          completionProofSkipReason: webReason,
          checklistProofSkipReasons: reasons,
        });
        return;
      }
      await finalizeMarkDone({ completionProofSkipReason: webReason });
      return;
    }

    if (!hasTaskProof && taskProofSkipReason.trim().length < PROOF_SKIP_REASON_MIN_LENGTH) {
      setProofModalError(null);
      setChecklistProofFieldErrors({});
      setProofModalStep('task');
      setProofModalOpen(true);
      return;
    }

    if (missingChecklistProof.length > 0) {
      const reasons = missingChecklistProof
        .map((item) => ({
          itemId: item.id,
          reason: (checklistProofSkipReasons[item.id] || '').trim(),
        }))
        .filter((r) => r.reason.length >= PROOF_SKIP_REASON_MIN_LENGTH);
      if (reasons.length < missingChecklistProof.length) {
        setProofModalError(null);
        setChecklistProofFieldErrors({});
        setProofModalStep('checklist');
        setProofModalOpen(true);
        return;
      }
      await finalizeMarkDone({
        ...(!hasTaskProof ? { completionProofSkipReason: taskProofSkipReason.trim() } : {}),
        checklistProofSkipReasons: reasons,
      });
      return;
    }

    await finalizeMarkDone(
      !hasTaskProof ? { completionProofSkipReason: taskProofSkipReason.trim() } : undefined
    );
  };

  const handleProofModalContinue = async () => {
    const reasonTooShortMessage =
      'Please upload proof or enter a reason (at least 3 characters).';

    if (proofModalStep === 'task') {
      if (!hasTaskProof && taskProofSkipReason.trim().length < PROOF_SKIP_REASON_MIN_LENGTH) {
        setProofModalError(reasonTooShortMessage);
        return;
      }
      setProofModalError(null);
      if (missingChecklistProof.length > 0) {
        setChecklistProofFieldErrors({});
        setProofModalStep('checklist');
        return;
      }
      await finalizeMarkDone(
        !hasTaskProof ? { completionProofSkipReason: taskProofSkipReason.trim() } : undefined
      );
      return;
    }

    const fieldErrors: Record<string, string> = {};
    for (const item of missingChecklistProof) {
      const reason = (checklistProofSkipReasons[item.id] || '').trim();
      if (reason.length < PROOF_SKIP_REASON_MIN_LENGTH) {
        fieldErrors[item.id] = 'Enter at least 3 characters.';
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      setChecklistProofFieldErrors(fieldErrors);
      setProofModalError(
        'Add a reason for each checklist item missing proof, or upload the photos.'
      );
      return;
    }

    const reasons = missingChecklistProof.map((item) => ({
      itemId: item.id,
      reason: (checklistProofSkipReasons[item.id] || '').trim(),
    }));
    setProofModalError(null);
    setChecklistProofFieldErrors({});
    await finalizeMarkDone({
      ...(!hasTaskProof ? { completionProofSkipReason: taskProofSkipReason.trim() } : {}),
      checklistProofSkipReasons: reasons,
    });
  };

  const applyChecklistItems = (items: ManagerTaskChecklistItem[]) => {
    const next = { ...localTask, checklistItems: items };
    setLocalTask(next);
    onTaskUpdated(next);
  };

  const handleToggleChecklist = async (itemId: string, nextCompleted: boolean) => {
    if (!canEdit || checklistBusy[itemId]) return;
    setChecklistBusy((s) => ({ ...s, [itemId]: true }));
    setError(null);
    const prevItems = localTask.checklistItems ?? [];
    applyChecklistItems(
      prevItems.map((item) =>
        item.id === itemId ? { ...item, isCompleted: nextCompleted } : item
      )
    );
    try {
      const res = await taskApi.toggleChecklistItem(localTask.id, itemId, nextCompleted);
      applyChecklistItems(res.checklistItems);
    } catch (err) {
      applyChecklistItems(prevItems);
      setError(getApiErrorMessage(err));
    } finally {
      setChecklistBusy((s) => ({ ...s, [itemId]: false }));
    }
  };

  const handleChecklistProofPick = async (itemId: string, file: File) => {
    if (!canEdit || checklistMediaBusy[itemId]) return;
    setChecklistMediaBusy((s) => ({ ...s, [itemId]: true }));
    setError(null);
    try {
      const { url } = await taskApi.uploadTaskCompletionPhoto(file);
      const res = await taskApi.addChecklistItemMedia(localTask.id, itemId, url, 'image');
      applyChecklistItems(res.checklistItems);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setChecklistMediaBusy((s) => ({ ...s, [itemId]: false }));
    }
  };

  const handleTaskProofPick = (file: File) => {
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const handleUncomplete = async () => {
    if (viewOnly || uncompleting) return;
    setUncompleting(true);
    setError(null);
    try {
      await taskApi.uncompleteOnBehalf(localTask.id);
      onCompleted();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUncompleting(false);
    }
  };

  const dialog = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex max-h-[min(92vh,820px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_24px_80px_-12px_rgba(5,150,105,0.22)] ring-1 ring-emerald-900/5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-task-dialog-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-emerald-50 bg-gradient-to-b from-emerald-50/50 to-white px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="my-task-dialog-title" className="text-lg font-semibold text-gray-900">
                {localTask.title}
              </h3>
              {(localTask.escalationLevel ?? 0) > 0 && !localTask.isCompleted && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  <AlertCircle className="h-3 w-3" /> Needs attention
                </span>
              )}
              {localTask.isCompleted && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  <Check className="h-3 w-3" /> Done
                </span>
              )}
            </div>
            {formatDueLabel(localTask) && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                {formatDueLabel(localTask)}
              </p>
            )}
            {localTask.isCompleted && localTask.completedAt && (
              <p className="mt-1 text-xs text-gray-500">
                {[
                  localTask.completedByName ? `Completed by ${localTask.completedByName}` : null,
                  new Date(localTask.completedAt).toLocaleString(),
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          {localTask.imageUrl && (
            <div className="max-h-52 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
              <img
                src={resolveMediaUrl(localTask.imageUrl) ?? undefined}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
          )}

          <p className="text-sm leading-relaxed text-gray-600">
            {localTask.description?.trim() || 'No description'}
          </p>

          {localTask.assignedTo?.name && (
            <p className="text-xs text-gray-500">
              Originally assigned to{' '}
              <span className="font-medium text-gray-700">{localTask.assignedTo.name}</span>
            </p>
          )}

          {sortedChecklist.length > 0 && (
            <section className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Checklist</p>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  {checklistDoneCount}/{sortedChecklist.length}
                </span>
              </div>
              <ul className="space-y-3">
                {sortedChecklist.map((item) => {
                  const busy = checklistBusy[item.id];
                  const mediaBusy = checklistMediaBusy[item.id];
                  const refMedia = item.referenceMedia ?? [];
                  const staffMedia = item.staffMedia ?? [];
                  return (
                    <li
                      key={item.id}
                      className="rounded-xl border border-white bg-white p-3 shadow-sm"
                    >
                      <button
                        type="button"
                        disabled={!canEdit || busy}
                        onClick={() => handleToggleChecklist(item.id, !item.isCompleted)}
                        className={`flex w-full items-start gap-3 text-left ${
                          canEdit ? 'cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <span className="mt-0.5 shrink-0 text-emerald-600">
                          {busy ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : item.isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-300" />
                          )}
                        </span>
                        <span
                          className={`flex-1 text-sm ${
                            item.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'
                          }`}
                        >
                          {item.text}
                        </span>
                      </button>
                      {item.isCompleted && (item.completedByName || item.completedAt) ? (
                        <p className="mt-1 pl-8 text-xs text-gray-500">
                          {[
                            item.completedByName ? `Done by ${item.completedByName}` : null,
                            item.completedAt
                              ? new Date(item.completedAt).toLocaleString()
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      ) : null}
                      {item.proofSkipReason ? (
                        <p className="mt-1 pl-8 text-xs italic text-amber-700">
                          Reason (no photo): {item.proofSkipReason}
                        </p>
                      ) : null}

                      {refMedia.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2 pl-8">
                          {refMedia.map((m, i) => (
                            <a
                              key={`${m.url}-${i}`}
                              href={resolveMediaUrl(m.url) ?? m.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block h-14 w-14 overflow-hidden rounded-lg border border-gray-100"
                            >
                              <img
                                src={resolveMediaUrl(m.url) ?? m.url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      {(staffMedia.length > 0 || canEdit) && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
                          {staffMedia.map((m, i) => (
                            <a
                              key={`staff-${m.url}-${i}`}
                              href={resolveMediaUrl(m.url) ?? m.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block h-14 w-14 overflow-hidden rounded-lg border border-emerald-100 ring-2 ring-emerald-200/60"
                            >
                              <img
                                src={resolveMediaUrl(m.url) ?? m.url}
                                alt="Proof"
                                className="h-full w-full object-cover"
                              />
                            </a>
                          ))}
                          {canEdit && !disableProofUpload && (
                            <>
                              <input
                                ref={(el) => {
                                  checklistFileRefs.current[item.id] = el;
                                }}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void handleChecklistProofPick(item.id, file);
                                  e.target.value = '';
                                }}
                              />
                              <button
                                type="button"
                                disabled={mediaBusy}
                                onClick={() => checklistFileRefs.current[item.id]?.click()}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                              >
                                {mediaBusy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Camera className="h-3.5 w-3.5" />
                                )}
                                {staffMedia.length > 0 ? 'Replace proof' : 'Add proof'}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {localTask.isCompleted && (completionProofUrl || localTask.completionProofSkipReason) && (
            <section>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                Completion proof
              </p>
              {completionProofUrl ? (
                <a
                  href={completionProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-xl border border-emerald-100"
                >
                  <img
                    src={completionProofUrl}
                    alt="Completion proof"
                    className="max-h-48 w-full object-contain bg-gray-50"
                  />
                </a>
              ) : null}
              {localTask.completionProofSkipReason ? (
                <p className="mt-2 text-sm italic text-amber-700">
                  Reason (no photo): {localTask.completionProofSkipReason}
                </p>
              ) : null}
            </section>
          )}

          {canEdit && disableProofUpload && (
            <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-800">Proof on mobile</p>
              <p className="mt-1 text-sm text-blue-900/90">
                Photo and video proof must be captured with the live camera in the NeoEngine app. On web you can
                still mark this task done; a note will be recorded that proof was not uploaded here.
              </p>
            </section>
          )}

          {canEdit && !disableProofUpload && (
            <section className={`rounded-2xl border border-dashed p-4 ${mandatoryProof ? 'border-amber-300 bg-amber-50/40' : 'border-emerald-200 bg-emerald-50/30'}`}>
              <p className={`mb-2 text-xs font-bold uppercase tracking-wider ${mandatoryProof ? 'text-amber-800' : 'text-emerald-700'}`}>
                {mandatoryProof ? 'Task completion photo (required)' : 'Task completion photo (optional)'}
              </p>
              {mandatoryProof && !hasTaskProof ? (
                <p className="mb-2 text-xs text-amber-700">
                  This task requires proof of completion. Upload a photo or explain why you could not when marking done.
                </p>
              ) : null}
              <input
                ref={proofInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleTaskProofPick(file);
                  e.target.value = '';
                }}
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => proofInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-800 shadow-sm hover:bg-emerald-50"
                >
                  <ImagePlus className="h-4 w-4" />
                  {proofFile ? 'Change photo' : 'Upload proof'}
                </button>
                {proofPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setProofFile(null);
                      setProofPreview(null);
                    }}
                    className="text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    Remove
                  </button>
                )}
              </div>
              {proofPreview && (
                <img
                  src={proofPreview}
                  alt="Selected proof"
                  className="mt-3 max-h-40 rounded-xl border border-emerald-100 object-contain"
                />
              )}
            </section>
          )}

          {viewOnly && (
            <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              View only — this date is in the past.
            </p>
          )}

          {error && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        {!viewOnly && (
          <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4 sm:px-6">
            {localTask.isCompleted ? (
              <button
                type="button"
                disabled={uncompleting}
                onClick={() => void handleUncomplete()}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {uncompleting ? 'Updating…' : 'Mark as not done'}
              </button>
            ) : (
              <button
                type="button"
                disabled={completing || uploadingProof}
                onClick={() => void handleMarkDone()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-3 text-sm font-semibold text-white shadow-emerald hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-60"
              >
                {completing || uploadingProof ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {uploadingProof ? 'Uploading proof…' : completing ? 'Completing…' : 'Mark as done'}
              </button>
            )}
          </div>
        )}
      </div>

      {proofModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4"
          onClick={() => {
            setProofModalOpen(false);
            setProofModalError(null);
            setChecklistProofFieldErrors({});
          }}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {proofModalStep === 'task' ? (
              <>
                <h4 className="text-base font-semibold text-gray-900">Mandatory proof required</h4>
                <p className="mt-2 text-sm text-gray-600">
                  Upload a completion photo above, or explain why you could not upload proof.
                </p>
                <p className="mt-2 text-xs text-amber-700">Reason must be at least 3 characters.</p>
                <textarea
                  value={taskProofSkipReason}
                  onChange={(e) => {
                    setTaskProofSkipReason(e.target.value);
                    if (proofModalError) setProofModalError(null);
                  }}
                  rows={3}
                  placeholder="Reason you could not upload photo..."
                  className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm ${
                    proofModalError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                />
              </>
            ) : (
              <>
                <h4 className="text-base font-semibold text-gray-900">Checklist proof missing</h4>
                <p className="mt-2 text-sm text-gray-600">
                  Looks like you missed proof for some checklist items. Upload photos for each item, or add a reason below.
                </p>
                <p className="mt-2 text-xs text-amber-700">Each reason must be at least 3 characters.</p>
                <div className="mt-3 max-h-52 space-y-3 overflow-y-auto">
                  {missingChecklistProof.map((item) => (
                    <div key={item.id}>
                      <p className="text-xs font-medium text-gray-700">{item.text}</p>
                      <input
                        value={checklistProofSkipReasons[item.id] || ''}
                        onChange={(e) => {
                          setChecklistProofSkipReasons((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }));
                          if (checklistProofFieldErrors[item.id]) {
                            setChecklistProofFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next[item.id];
                              return next;
                            });
                          }
                          if (proofModalError) setProofModalError(null);
                        }}
                        placeholder="Reason or upload proof above"
                        className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                          checklistProofFieldErrors[item.id]
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200'
                        }`}
                      />
                      {checklistProofFieldErrors[item.id] ? (
                        <p className="mt-1 text-xs text-red-600">
                          {checklistProofFieldErrors[item.id]}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            )}
            {proofModalError ? (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {proofModalError}
              </p>
            ) : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setProofModalOpen(false);
                  setProofModalError(null);
                  setChecklistProofFieldErrors({});
                }}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleProofModalContinue()}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(dialog, document.body) : dialog;
}
