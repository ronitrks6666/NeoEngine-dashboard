import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Save, StickyNote } from 'lucide-react';
import {
  neoNotesApi,
  type NeoNoteDto,
  type NeoNotesFeedSection,
} from '@/api/neoNotes';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { NeoNotesRichTextEditor } from '@/components/neoNotes/NeoNotesRichTextEditor';
import { NeoNotesRichTextView } from '@/components/neoNotes/NeoNotesRichTextView';
import { isRichTextEmpty } from '@/lib/richText';

function formatHeadingDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return ymd;
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatWhen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DateHeading({ ymd }: { ymd: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <p className="text-sm font-bold text-gray-800 shrink-0">{formatHeadingDate(ymd)}</p>
      <div className="flex-1 border-t border-gray-200 min-w-[2rem]" />
    </div>
  );
}

function NoteCard({
  note,
  editable,
  onTogglePublic,
  onEdit,
  onDelete,
}: {
  note: NeoNoteDto;
  editable: boolean;
  onTogglePublic?: () => void;
  onEdit?: (body: string) => void;
  onDelete?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);

  useEffect(() => {
    setDraft(note.body);
    setEditing(false);
  }, [note.id, note.body]);

  const changedAt = formatWhen(note.publicVisibilityChangedAt || note.updatedAt);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{note.authorName}</p>
          <p className="text-xs text-gray-500">
            {note.isPublic ? 'Public — outlet can see' : 'Private — only author'}
          </p>
          {changedAt ? (
            <p className="text-[11px] text-gray-400 mt-1">
              {note.isPublic ? `Shared ${changedAt}` : `Updated ${changedAt}`}
            </p>
          ) : null}
        </div>
        {editable ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onTogglePublic}
              className="p-2 rounded-lg hover:bg-gray-50 text-gray-600"
              title={note.isPublic ? 'Make private' : 'Make public'}
            >
              {note.isPublic ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4" />}
            </button>
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="p-2 rounded-lg hover:bg-gray-50 text-gray-600 text-sm font-medium"
              >
                Edit
              </button>
            ) : null}
            <button
              type="button"
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-red-50 text-red-600 text-sm font-medium"
            >
              Delete
            </button>
          </div>
        ) : note.isPublic ? (
          <Eye className="h-4 w-4 text-emerald-600 shrink-0" />
        ) : null}
      </div>

      {editing ? (
        <div className="space-y-2">
          <NeoNotesRichTextEditor value={draft} onChange={setDraft} rows={4} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(note.body);
                setEditing(false);
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onEdit?.(draft);
                setEditing(false);
              }}
              className="px-3 py-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <NeoNotesRichTextView html={note.body} />
      )}
    </div>
  );
}

function notesForSection(section: NeoNotesFeedSection, todayYmd: string): NeoNoteDto[] {
  if (section.date === todayYmd) {
    return section.notes.filter((note) => !note.isMine);
  }
  return section.notes;
}

type Props = {
  outletId: string | null;
  /** Dashboard card: today editor + short feed preview */
  compact?: boolean;
  className?: string;
};

export function NeoNotesPanel({ outletId, compact = false, className = '' }: Props) {
  const queryClient = useQueryClient();
  const [todayBody, setTodayBody] = useState('');
  const [todayIsPublic, setTodayIsPublic] = useState(false);
  const [todayNoteId, setTodayNoteId] = useState<string | null>(null);

  const todayQuery = useQuery({
    queryKey: ['neo-notes-today', outletId],
    queryFn: () => neoNotesApi.getDay(outletId!, ''),
    enabled: !!outletId,
  });

  const feedQuery = useQuery({
    queryKey: ['neo-notes-feed', outletId, compact],
    queryFn: () => neoNotesApi.getFeed(outletId!),
    enabled: !!outletId,
  });

  useEffect(() => {
    const data = todayQuery.data;
    if (!data) return;
    setTodayBody(data.myNote?.body || '');
    setTodayIsPublic(!!data.myNote?.isPublic);
    setTodayNoteId(data.myNote?.id || null);
  }, [todayQuery.data]);

  const todayYmd = todayQuery.data?.today ?? feedQuery.data?.today ?? new Date().toISOString().slice(0, 10);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['neo-notes-today', outletId] });
    void queryClient.invalidateQueries({ queryKey: ['neo-notes-feed', outletId] });
  }, [outletId, queryClient]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (isRichTextEmpty(todayBody)) {
        return Promise.reject(new Error('Note is empty'));
      }
      return neoNotesApi.saveNote({
        outletId: outletId!,
        body: todayBody.trim(),
        isPublic: todayIsPublic,
      });
    },
    onSuccess: () => invalidate(),
    onError: (err) => window.alert(getApiErrorMessage(err) || 'Could not save note'),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { noteId: string; body?: string; isPublic?: boolean }) =>
      neoNotesApi.updateNote(input.noteId, {
        body: input.body,
        isPublic: input.isPublic,
      }),
    onSuccess: () => invalidate(),
    onError: (err) => window.alert(getApiErrorMessage(err) || 'Could not update note'),
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => neoNotesApi.deleteNote(noteId),
    onSuccess: () => invalidate(),
    onError: (err) => window.alert(getApiErrorMessage(err) || 'Could not delete note'),
  });

  const visibleFeedSections = useMemo(() => {
    const sections = feedQuery.data?.sections ?? [];
    return sections
      .map((section) => ({
        ...section,
        notes: notesForSection(section, todayYmd),
      }))
      .filter((section) => section.notes.length > 0);
  }, [feedQuery.data?.sections, todayYmd]);

  const feedPreview = compact ? visibleFeedSections.slice(0, 2) : visibleFeedSections;

  if (!outletId) {
    return (
      <div className={`rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-800 ${className}`}>
        Select an outlet to use Neo Notes.
      </div>
    );
  }

  if (todayQuery.isLoading) {
    return (
      <div className={`rounded-2xl border border-emerald-100 bg-white p-6 ${className}`}>
        <LoadingSpinner className="py-8" />
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-emerald-100 bg-white shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <StickyNote className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">Neo Notes</p>
            <p className="text-xs text-gray-500 truncate">
              {todayQuery.data?.outletName || 'Your outlet'} — private by default, share with the eye icon
            </p>
          </div>
        </div>
        {compact ? (
          <Link
            to="/owner/neo-notes"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap"
          >
            Open full
          </Link>
        ) : null}
      </div>

      <div className="p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-1">Write today&apos;s note</p>
          <p className="text-xs text-gray-500 mb-3">
            Use the toolbar for bold, lists, and more. Toggle public to share with everyone at this outlet.
          </p>
          <NeoNotesRichTextEditor
            value={todayBody}
            onChange={setTodayBody}
            rows={compact ? 3 : 5}
            placeholder="Handover points, priorities, reminders…"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
            <button
              type="button"
              onClick={() => {
                const next = !todayIsPublic;
                setTodayIsPublic(next);
                if (todayNoteId && !isRichTextEmpty(todayBody)) {
                  updateMutation.mutate({ noteId: todayNoteId, isPublic: next });
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            >
              {todayIsPublic ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {todayIsPublic ? 'Public' : 'Private'}
            </button>
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => {
                if (isRichTextEmpty(todayBody) && todayNoteId) {
                  if (window.confirm('Remove your note for today?')) {
                    deleteMutation.mutate(todayNoteId);
                    setTodayBody('');
                  }
                  return;
                }
                saveMutation.mutate();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {feedQuery.isLoading ? (
          <LoadingSpinner className="py-6" />
        ) : feedPreview.length > 0 ? (
          <div className="space-y-4">
            {feedPreview.map((section) => (
              <div key={section.date} className="space-y-3">
                <DateHeading ymd={section.date} />
                {section.notes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    editable={!compact && note.isMine && section.date !== todayYmd}
                    onTogglePublic={() =>
                      updateMutation.mutate({
                        noteId: note.id,
                        isPublic: !note.isPublic,
                      })
                    }
                    onEdit={(body) =>
                      updateMutation.mutate({
                        noteId: note.id,
                        body,
                      })
                    }
                    onDelete={() => {
                      if (window.confirm('Delete this note permanently?')) {
                        deleteMutation.mutate(note.id);
                      }
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No notes yet.</p>
        )}
      </div>
    </div>
  );
}
