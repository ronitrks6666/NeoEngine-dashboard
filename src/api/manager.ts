import { api } from './client';

export interface DashboardData {
  outletId: string | null;
  outletName: string;
  outlets: { _id: string; name: string }[];
  todaySummary: {
    checkedInToday: number;
    totalEmployees: number;
    workingNow: number;
    pendingTasks: number;
    lateEntries: number;
  };
  staffStatus: { id: string; name: string; role: string; status: string; phone?: string; isLate?: boolean }[];
  alerts: unknown[];
  taskSummary: { total: number; completed: number; pending: number };
}

export const managerApi = {
  getDashboard: async (outletId?: string, shiftFilter?: string, search?: string) => {
    const params = new URLSearchParams();
    if (outletId) params.set('outletId', outletId);
    if (shiftFilter) params.set('shiftFilter', shiftFilter);
    if (search?.trim()) params.set('search', search.trim());
    const { data } = await api.get<{ success: boolean; data: DashboardData }>(
      `/manager/dashboard?${params.toString()}`
    );
    return data.data;
  },

  getBriefingPool: async (outletId: string, params?: { search?: string; limit?: number; offset?: number; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams({ outletId });
    if (params?.search) q.set('search', params.search);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    const { data } = await api.get(`/manager/briefing-pool?${q.toString()}`);
    return data;
  },

  getBriefingPoolEmployeeTasks: async (employeeId: string) => {
    const { data } = await api.get(`/manager/briefing-pool/${employeeId}/tasks`);
    return data;
  },

  getDashboardTasks: async (outletId: string, params?: { dateRange?: 'today' | 'week'; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams({ outletId });
    if (params?.dateRange) q.set('dateRange', params.dateRange);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    const { data } = await api.get(`/manager/dashboard-tasks?${q.toString()}`);
    return data;
  },

  getDashboardPunchesDaily: async (outletId: string, params?: { dateRange?: 'today' | 'week'; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams({ outletId });
    if (params?.dateRange) q.set('dateRange', params.dateRange);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    const { data } = await api.get(`/manager/dashboard-punches-daily?${q.toString()}`);
    return data;
  },
};
