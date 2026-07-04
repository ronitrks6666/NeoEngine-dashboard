import { api } from './client';

export interface ChecklistItem {
  text: string;
  order: number;
  referenceMediaUrl?: string;
  referenceMediaKind?: 'image' | 'gif' | 'video';
}

export interface ManagerTaskItem {
  id: string;
  taskTemplateId?: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  taskMediaKind?: 'image' | 'gif' | 'video' | null;
  isCompleted: boolean;
  completedAt?: string | null;
  completedByName?: string | null;
  forDate?: string;
  startTime?: string | null;
  timeLimitMinutes?: number | null;
  dueAt?: string | null;
  escalationLevel?: number;
  escalationEnabled?: boolean;
  mandatoryProofOfCompletion?: boolean;
  completionProofSkipReason?: string | null;
  assignedTo?: { name?: string } | null;
  isCollaborative?: boolean;
  assignees?: { id: string; name: string }[];
  photoPath?: string | null;
  completionMedia?: Array<{ url: string; kind?: string }>;
  checklistItems?: ManagerTaskChecklistItem[];
}

export interface ManagerTaskChecklistItem {
  id: string;
  text: string;
  order?: number;
  isCompleted: boolean;
  completedAt?: string | null;
  completedByName?: string | null;
  proofSkipReason?: string | null;
  referenceMedia?: Array<{ url: string; kind?: string }>;
  staffMedia?: Array<{ url: string; kind?: string }>;
}

export interface ManagerTasksResponse {
  tasks: ManagerTaskItem[];
  viewOnly: boolean;
  date: string;
}

export interface TaskTemplatePayload {
  title: string;
  description?: string;
  parentRoleId?: string;
  outletId: string;
  shiftType?: 'Day' | 'Night' | 'Both';
  taskType?: 'daily' | 'onetime' | 'specific-days';
  specificDate?: string;
  specificDays?: number[];
  imageUrl?: string;
  hourlyFrequency?: number;
  assignToType?: 'role' | 'staff';
  assignToRoleId?: string;
  assignToEmployeeId?: string;
  assignToEmployeeIds?: string[];
  isCollaborative?: boolean;
  startTime?: string;
  timeLimitMinutes?: number;
  intervalMinutes?: number;
  repeatEndTime?: string;
  escalationEnabled?: boolean;
  mandatoryProofOfCompletion?: boolean;
  checklistItems?: ChecklistItem[];
}

export const taskApi = {
  uploadTaskImage: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post<{ success: boolean; url: string }>('/upload/task-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { url: data.url };
  },

  getTemplates: async (outletId: string, params?: { shiftType?: string; search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    q.set('_t', String(Date.now()));
    if (params?.shiftType) q.set('shiftType', params.shiftType);
    if (params?.search) q.set('search', params.search || '');
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const { data } = await api.get(`/task/templates/${outletId}?${q.toString()}`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    return data;
  },

  getManagerTasks: async (outletId: string, date?: string) => {
    const q = new URLSearchParams();
    q.set('outletId', outletId);
    q.set('_t', String(Date.now()));
    if (date) q.set('date', date);
    const { data } = await api.get<{ success: boolean; data: ManagerTasksResponse }>(
      `/task/manager-tasks?${q.toString()}`,
      { headers: { 'Cache-Control': 'no-cache' } }
    );
    return data.data;
  },

  uploadTaskCompletionPhoto: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post<{ success: boolean; url: string }>(
      '/upload/task-completion-photo',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return { url: data.url };
  },

  toggleChecklistItem: async (taskId: string, itemId: string, isCompleted: boolean) => {
    const { data } = await api.post<{
      success: boolean;
      data: { checklistItems: ManagerTaskChecklistItem[] };
    }>(`/task/checklist-item/${taskId}/${itemId}`, { isCompleted });
    return data.data;
  },

  addChecklistItemMedia: async (
    taskId: string,
    itemId: string,
    url: string,
    kind: 'image' | 'video' = 'image'
  ) => {
    const { data } = await api.post<{
      success: boolean;
      data: { checklistItems: ManagerTaskChecklistItem[] };
    }>(`/task/checklist-item-media/${taskId}/${itemId}`, { url, kind });
    return data.data;
  },

  completeOnBehalf: async (
    taskId: string,
    options?: {
      photoUrl?: string;
      notes?: string;
      completionProofSkipReason?: string;
      checklistProofSkipReasons?: Array<{ itemId: string; reason: string }>;
    }
  ) => {
    const { data } = await api.post(`/task/complete-owner/${taskId}`, options ?? {});
    return data;
  },

  uncompleteOnBehalf: async (taskId: string) => {
    const { data } = await api.post(`/task/uncomplete-owner/${taskId}`);
    return data;
  },

  createTemplate: async (payload: TaskTemplatePayload) => {
    const { data } = await api.post('/task/template/create', payload);
    return data;
  },

  updateTemplate: async (templateId: string, payload: Partial<TaskTemplatePayload & { title?: string; description?: string; shiftType?: string }>) => {
    const { data } = await api.put(`/task/template/${templateId}`, payload);
    return data;
  },

  deleteTemplate: async (templateId: string) => {
    const { data } = await api.delete(`/task/template/${templateId}`);
    return data;
  },

  duplicateTemplateToOutlet: async (
    templateId: string,
    payload: {
      targetOutletId: string;
      assignToType: 'role' | 'staff';
      parentRoleId?: string;
      assignToRoleId?: string;
      assignToEmployeeId?: string;
      assignToEmployeeIds?: string[];
      isCollaborative?: boolean;
    }
  ) => {
    const { data } = await api.post(`/task/template/${templateId}/duplicate-to-outlet`, payload);
    return data;
  },

  duplicateSopToOutlet: async (
    groupId: string,
    payload: {
      targetOutletId: string;
      assignToType: 'role' | 'staff';
      parentRoleId?: string;
      assignedEmployeeIds?: string[];
      assignToEmployeeId?: string;
    }
  ) => {
    const { data } = await api.post(`/task/template-group/${groupId}/duplicate-to-outlet`, payload);
    return data;
  },

  getTemplateGroups: async (outletId: string, params?: { deleted?: boolean }) => {
    const q = params?.deleted ? '?deleted=1' : '';
    const { data } = await api.get(`/task/template-groups/${outletId}${q}`);
    return data;
  },

  createTemplateGroup: async (payload: Record<string, unknown>) => {
    const { data } = await api.post('/task/template-group/create', payload);
    return data;
  },

  updateTemplateGroup: async (groupId: string, payload: Record<string, unknown>) => {
    const { data } = await api.put(`/task/template-group/${groupId}`, payload);
    return data;
  },

  deleteTemplateGroup: async (groupId: string) => {
    const { data } = await api.delete(`/task/template-group/${groupId}`);
    return data;
  },

  restoreTemplateGroup: async (groupId: string) => {
    const { data } = await api.post(`/task/template-group/${groupId}/restore`);
    return data;
  },

  getSopAcknowledgments: async (outletId: string, groupId?: string) => {
    const q = groupId ? `?groupId=${encodeURIComponent(groupId)}` : '';
    const { data } = await api.get(`/task/sop-acknowledgments/${outletId}${q}`);
    return data;
  },

  voiceToTask: async (audioBlob: Blob, outletId: string): Promise<{ transcript: string; task: Record<string, unknown> }> => {
    if (audioBlob.size === 0) {
      throw new Error('No audio recorded. Please speak and try again.');
    }
    const formData = new FormData();
    const ext = audioBlob.type.includes('webm') ? 'webm' : audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
    formData.append('audio', audioBlob, `recording.${ext}`);
    formData.append('outletId', outletId);
    const { data } = await api.post<{ success: boolean; data: { transcript: string; task: Record<string, unknown> } }>(
      `/task/voice-to-task?outletId=${encodeURIComponent(outletId)}`,
      formData
    );
    return data.data;
  },
};
