import { useEffect, useMemo, useRef, useState } from 'react';
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

interface MyTaskDetailDialogProps {
  task: ManagerTaskItem;
  viewOnly: boolean;
  onClose: () => void;
  onTaskUpdated: (task: ManagerTaskItem) => void;
  onCompleted: () => void;
}

export function MyTaskDetailDialog({
  task,
  viewOnly,
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

  const handleMarkDone = async () => {
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
      }
      await taskApi.completeOnBehalf(localTask.id, photoUrl ? { photoUrl } : undefined);
      onCompleted();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUploadingProof(false);
      setCompleting(false);
    }
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
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
                      {item.isCompleted && item.completedByName ? (
                        <p className="mt-1 pl-8 text-xs text-gray-500">Done by {item.completedByName}</p>
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
                          {canEdit && (
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

          {localTask.isCompleted && completionProofUrl && (
            <section>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                Completion proof
              </p>
              <a
                href={completionProofUrl}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-xl border border-emerald-100"
              >
                <img src={completionProofUrl} alt="Completion proof" className="max-h-48 w-full object-contain bg-gray-50" />
              </a>
            </section>
          )}

          {canEdit && (
            <section className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/30 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                Task completion photo (optional)
              </p>
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

        {!viewOnly && localTask.id && (
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
    </div>
  );
}
