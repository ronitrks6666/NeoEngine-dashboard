import { api } from './client';

export const activityApi = {
  getAttendance: async (
    outletId: string,
    params?: { startDate?: string; endDate?: string; period?: string; search?: string; page?: number; limit?: number }
  ) => {
    const q = new URLSearchParams();
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.period) q.set('period', params.period);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const { data } = await api.get(`/activity/attendance/${outletId}?${q.toString()}`);
    return data;
  },

  getOutletActivity: async (
    outletId: string,
    params?: { startDate?: string; endDate?: string; period?: string; page?: number; limit?: number }
  ) => {
    const q = new URLSearchParams();
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.period) q.set('period', params.period);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const { data } = await api.get(`/activity/outlet/${outletId}?${q.toString()}`);
    return data;
  },
};
