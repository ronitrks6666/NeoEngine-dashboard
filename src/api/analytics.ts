import { api } from './client';

export const analyticsApi = {
  getOutletAnalytics: async (
    outletId: string,
    params?: { period?: 'daily' | 'weekly' | 'monthly' | 'payCycle'; startDate?: string; endDate?: string; shiftType?: string; search?: string }
  ) => {
    const q = new URLSearchParams();
    if (params?.period) q.set('period', params.period);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.shiftType) q.set('shiftType', params.shiftType);
    if (params?.search) q.set('search', params.search || '');
    const { data } = await api.get(`/analytics/outlet/${outletId}?${q.toString()}`);
    return data;
  },
};
