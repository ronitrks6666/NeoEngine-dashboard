import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi, type StaffNote } from '@/api/employee';
import { getApiErrorMessage } from '@/api/auth';
import { Loader2 } from 'lucide-react';

const KIND_LABELS: Record<string, string> = {
  hold: 'Put on hold',
  resume: 'Resumed',
  deactivate: 'Deactivated',
  transfer: 'Transfer',
};

const KIND_COLORS: Record<string, string> = {
  hold: 'bg-amber-100 text-amber-800',
  resume: 'bg-green-100 text-green-800',
  deactivate: 'bg-red-100 text-red-800',
  transfer: 'bg-emerald-100 text-emerald-800',
};

function formatNoteDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type Props = {
  employeeId: string;
  filter?: 'all' | 'system' | 'manual';
};

export function StaffNotesPanel({ employeeId, filter = 'all' }: Props) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');

  const notesQuery = useQuery({
    queryKey: ['staff-notes', employeeId],
    queryFn: () => employeeApi.getStaffNotes(employeeId),
    enabled: !!employeeId,
  });

  const addMutation = useMutation({
    mutationFn: (text: string) => employeeApi.addStaffNote(employeeId, text),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['staff-notes', employeeId] });
    },
  });

  const notes = (notesQuery.data ?? []).filter((n: StaffNote) => {
    if (filter === 'all') return true;
    if (filter === 'manual') return !n.kind || n.kind === 'general';
    return !!n.kind && n.kind !== 'general';
  });

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Hold, deactivate, and transfer actions are logged here. Anyone with staff access can add a note.
      </p>

      {notesQuery.isLoading ? (
        <div className="flex justify-center py-6 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-2">No notes yet.</p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {notes.map((note) => {
            const kind = note.kind && note.kind !== 'general' ? note.kind : null;
            const meta = [note.createdByName, formatNoteDate(note.createdAt)].filter(Boolean).join(' · ');
            return (
              <li
                key={note.id}
                className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5"
              >
                {kind && KIND_LABELS[kind] ? (
                  <span
                    className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md mb-1.5 ${KIND_COLORS[kind] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {KIND_LABELS[kind]}
                  </span>
                ) : null}
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.text}</p>
                {meta ? <p className="text-[11px] text-gray-400 mt-1">{meta}</p> : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-2 border-t border-gray-100 pt-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          maxLength={2000}
          disabled={addMutation.isPending}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y min-h-[72px]"
        />
        <div className="flex items-center justify-between gap-2">
          {addMutation.isError ? (
            <p className="text-xs text-red-600">{getApiErrorMessage(addMutation.error)}</p>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={!draft.trim() || addMutation.isPending}
            onClick={() => addMutation.mutate(draft.trim())}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {addMutation.isPending ? 'Saving…' : 'Add note'}
          </button>
        </div>
      </div>
    </div>
  );
}
