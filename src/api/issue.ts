import { api } from './client';

export interface IssueAttachment {
  url: string;
  kind: 'image' | 'video' | 'document' | 'audio';
  fileName?: string;
  mimeType?: string;
}

export interface IssueAssignee {
  userId: string;
  userType: 'OWNER' | 'EMPLOYEE';
}

export interface Issue {
  id: string;
  outletId: string;
  issueNumber: number;
  title: string;
  description?: string;
  categoryId?: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignees: IssueAssignee[];
  attachments: IssueAttachment[];
  linkedTaskIds: string[];
  lastMessageAt?: string;
  lastMessagePreview?: string;
  resolvedAt?: string;
  resolvedBy?: { userId: string; userType: string; displayName?: string } | null;
  closedAt?: string;
  closedBy?: { userId: string; userType: string; displayName?: string } | null;
  createdBy?: { userId: string; userType: string; displayName?: string } | null;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  unreadMentions: number;
  participants: IssueAssignee[];
  isReadByAll?: boolean;
  pinnedMessageIds?: string[];
}

export interface IssueMessage {
  id: string;
  issueId: string;
  authorId: string;
  authorType: string;
  authorName?: string;
  text: string;
  attachments: IssueAttachment[];
  replyToMessageId?: string | null;
  mentions: { userId: string; userType: string; offset: number; length: number }[];
  systemEvent?: { type: string;[key: string]: unknown } | null;
  locationMeta?: { lat: number; lng: number; label: string } | null;
  contactMeta?: { name: string; phone?: string; email?: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueCategory {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  order: number;
}

export const issueApi = {
  // ── Issues CRUD ──────────────────────────────────────────────────────
  listIssues: async (
    outletId: string,
    params?: {
      status?: string;
      excludeClosed?: boolean;
      priority?: string;
      categoryId?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      skip?: number;
      q?: string;
    }
  ) => {
    const q = new URLSearchParams();
    q.set('outletId', outletId);
    if (params?.status) q.set('status', params.status);
    if (params?.excludeClosed) q.set('excludeClosed', 'true');
    if (params?.priority) q.set('priority', params.priority);
    if (params?.categoryId) q.set('categoryId', params.categoryId);
    if (params?.sortBy) q.set('sortBy', params.sortBy);
    if (params?.sortOrder) q.set('sortOrder', params.sortOrder);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.skip) q.set('skip', String(params.skip));
    if (params?.q?.trim()) q.set('q', params.q.trim());
    const { data } = await api.get<{ data: Issue[]; pagination: { limit: number; skip: number; hasMore: boolean } }>(
      `/issues?${q.toString()}`
    );
    return data;
  },

  getIssue: async (issueId: string) => {
    const { data } = await api.get<{ data: Issue }>(`/issues/${issueId}`);
    return data;
  },

  createIssue: async (payload: {
    outletId: string;
    title: string;
    description?: string;
    categoryId?: string;
    priority?: string;
    assignees?: IssueAssignee[];
    attachments?: IssueAttachment[];
  }) => {
    const { data } = await api.post<{ data: Issue; firstMessageId: string }>('/issues', payload);
    return data;
  },

  updateIssue: async (
    issueId: string,
    payload: {
      title?: string;
      description?: string;
      categoryId?: string | null;
      priority?: string;
      assignees?: IssueAssignee[];
    }
  ) => {
    const { data } = await api.patch<{ data: Issue }>(`/issues/${issueId}`, payload);
    return data;
  },

  deleteIssue: async (issueId: string) => {
    const { data } = await api.delete(`/issues/${issueId}`);
    return data;
  },

  changeStatus: async (issueId: string, status: string) => {
    const { data } = await api.post<{ data: Issue }>(`/issues/${issueId}/status`, { status });
    return data;
  },

  // ── Messages (chat) ──────────────────────────────────────────────────
  getMessages: async (issueId: string, params?: { before?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.before) q.set('before', params.before);
    if (params?.limit) q.set('limit', String(params.limit));
    const { data } = await api.get<{ data: IssueMessage[]; pagination: { hasMore: boolean } }>(
      `/issues/${issueId}/messages?${q.toString()}`
    );
    return data;
  },

  sendMessage: async (
    issueId: string,
    payload: {
      text: string;
      attachments?: IssueAttachment[];
      locationMeta?: { lat: number; lng: number; label: string } | null;
      contactMeta?: { name: string; phone?: string; email?: string } | null;
      replyToMessageId?: string;
      mentions?: { userId: string; userType: string; offset: number; length: number }[];
    }
  ) => {
    const { data } = await api.post<{ data: IssueMessage }>(`/issues/${issueId}/messages`, payload);
    return data;
  },

  markRead: async (issueId: string, lastReadMessageId: string) => {
    const { data } = await api.post(`/issues/${issueId}/read`, { lastReadMessageId });
    return data;
  },

  // ── Categories ───────────────────────────────────────────────────────
  getCategories: async (outletId: string) => {
    const { data } = await api.get<{ data: IssueCategory[] }>(`/issues/categories?outletId=${outletId}`);
    return data;
  },

  createCategory: async (outletId: string, name: string, color?: string) => {
    const { data } = await api.post<{ data: IssueCategory }>('/issues/categories', { outletId, name, color });
    return data;
  },

  // ── Attachments ──────────────────────────────────────────────────────
  uploadAttachment: async (file: File): Promise<{ url: string; kind: string; fileName: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<{ success: boolean; url: string; kind: string; fileName: string }>(
      '/upload/issue-attachment',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return { url: data.url, kind: data.kind || 'document', fileName: data.fileName || file.name };
  },

  pinMessage: async (issueId: string, messageId: string) => {
    const { data } = await api.post(`/issues/${issueId}/pin`, { messageId });
    return data;
  },

  unpinMessage: async (issueId: string, messageId: string) => {
    const { data } = await api.delete(`/issues/${issueId}/pin/${messageId}`);
    return data;
  },

  getPinnedMessages: async (issueId: string) => {
    const { data } = await api.get<{ data: { pinnedMessageIds: string[]; pinnedMessages: IssueMessage[] } }>(
      `/issues/${issueId}/pins`
    );
    return data;
  },

  getMessageReaders: async (issueId: string, messageId: string) => {
    const { data } = await api.get<{ data: { userId: string; userType: string; displayName: string; lastReadAt: string | null }[] }>(
      `/issues/${issueId}/messages/${messageId}/readers`
    );
    return data;
  },
};
