import { api } from './client';

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
  startTime?: string;
  timeLimitMinutes?: number;
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
    if (params?.shiftType) q.set('shiftType', params.shiftType);
    if (params?.search) q.set('search', params.search || '');
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const { data } = await api.get(`/task/templates/${outletId}?${q.toString()}`);
    return data;
  },

  completeOnBehalf: async (taskId: string) => {
    const { data } = await api.post(`/task/complete-owner/${taskId}`);
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
