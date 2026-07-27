import { api } from './client';

export type NeoNoteRevision = {
  body: string;
  isPublic: boolean;
  changedAt: string;
  action: 'create' | 'edit' | 'visibility' | 'delete';
};

export type NeoNoteDto = {
  id: string;
  outletId: string;
  noteDate: string;
  body: string;
  isPublic: boolean;
  isMine: boolean;
  authorName: string;
  authorUserType: string;
  publicVisibilityChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
  revisions: NeoNoteRevision[];
};

export type NeoNotesDayPayload = {
  outletName: string;
  today: string;
  noteDate: string;
  myNote: NeoNoteDto | null;
  publicNotes: NeoNoteDto[];
};

export type NeoNotesFeedSection = {
  date: string;
  notes: NeoNoteDto[];
};

export type NeoNotesFeedPayload = {
  outletName: string;
  today: string;
  sections: NeoNotesFeedSection[];
};

/** Prefer /owner/neo-notes — prod often runs a stale server.js without /api/neo-notes. */
const NEO_NOTES_BASE = '/owner/neo-notes';

export const neoNotesApi = {
  getDates: async (outletId: string) => {
    const { data } = await api.get<{
      success: boolean;
      data: { outletName: string; today: string; dates: string[] };
    }>(`${NEO_NOTES_BASE}/dates`, { params: { outletId } });
    return data.data;
  },

  getDay: async (outletId: string, noteDate?: string) => {
    const { data } = await api.get<{ success: boolean; data: NeoNotesDayPayload }>(
      `${NEO_NOTES_BASE}/day`,
      { params: { outletId, noteDate: noteDate || undefined } }
    );
    return data.data;
  },

  getFeed: async (outletId: string) => {
    const { data } = await api.get<{ success: boolean; data: NeoNotesFeedPayload }>(
      `${NEO_NOTES_BASE}/feed`,
      { params: { outletId } }
    );
    return data.data;
  },

  saveNote: async (input: {
    outletId: string;
    noteDate?: string;
    body: string;
    isPublic?: boolean;
  }) => {
    const { data } = await api.post<{ success: boolean; data: { note: NeoNoteDto } }>(
      NEO_NOTES_BASE,
      input
    );
    return data.data.note;
  },

  updateNote: async (noteId: string, input: { body?: string; isPublic?: boolean }) => {
    const { data } = await api.put<{ success: boolean; data: { note: NeoNoteDto } }>(
      `${NEO_NOTES_BASE}/${noteId}`,
      input
    );
    return data.data.note;
  },

  deleteNote: async (noteId: string) => {
    const { data } = await api.delete<{ success: boolean }>(`${NEO_NOTES_BASE}/${noteId}`);
    return data;
  },
};
