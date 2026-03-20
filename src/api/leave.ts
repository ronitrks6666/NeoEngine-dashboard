import { api } from './client';

export const leaveApi = {
  getLeaves: async (
    outletId: string,
    params?: {
      status?: string;
      employeeId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
      search?: string;
    }
  ) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.employeeId) q.set('employeeId', params.employeeId);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.search?.trim()) q.set('search', params.search.trim());
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const { data } = await api.get(`/leave/outlet/${outletId}?${q.toString()}`);
    return data;
  },

  approve: async (leaveId: string, reason?: string) => {
    const { data } = await api.put(`/leave/${leaveId}/approve`, { reason });
    return data;
  },

  reject: async (leaveId: string, reason?: string) => {
    const { data } = await api.put(`/leave/${leaveId}/reject`, { reason });
    return data;
  },

  assign: async (payload: { outletId: string; employeeId: string; startDate: string; endDate: string; reason?: string }) => {
    const { data } = await api.post('/leave/assign', payload);
    return data;
  },

  getRules: async (outletId: string) => {
    const { data } = await api.get(`/leave/rules/${outletId}`);
    return data;
  },

  updateRules: async (outletId: string, payload: object) => {
    const { data } = await api.put(`/leave/rules/${outletId}`, payload);
    return data;
  },
};
