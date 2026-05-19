import { api } from './client';

export interface Owner {
  _id: string;
  name: string;
  email: string;
  phone: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface Outlet {
  _id: string;
  name: string;
  address?: string;
  phone?: string;
  ownerId: string | { _id: string; name: string; email?: string; phone?: string };
}

export interface AdminAnalytics {
  totalOwners: number;
  totalOutlets: number;
  totalEmployees: number;
  punchesDateRange: number;
  totalIssues: number;
  openIssues: number;
  totalTickets: number;
  openTickets: number;
  punchesByDay: { date: string; count: number }[];
}

export const adminApi = {
  getOwners: async () => {
    const { data } = await api.get<{ success: boolean; data: { owners: Owner[] } }>('/admin/owners');
    return data.data.owners;
  },

  getOutlets: async () => {
    const { data } = await api.get<{ success: boolean; data: { outlets: Outlet[] } }>('/admin/outlets');
    return data.data.outlets;
  },

  getAnalytics: async (params?: { startDate?: string; endDate?: string; outletId?: string }) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.outletId) query.append('outletId', params.outletId);
    
    const { data } = await api.get<{ success: boolean; data: AdminAnalytics }>(`/admin/analytics?${query.toString()}`);
    return data.data;
  },

  createOwner: async (payload: { name: string; email: string; password: string; phone: string }) => {
    const { data } = await api.post('/admin/create-owner', payload);
    return data;
  },

  createOutlet: async (payload: { name: string; address: string; phone: string; ownerId: string; geofence?: object }) => {
    const { data } = await api.post('/admin/create-outlet', payload);
    return data;
  },

  impersonateOwner: async (ownerId: string) => {
    const { data } = await api.post<{
      success: boolean;
      token: string;
      userType: string;
      user: { id: string; name: string; email: string; phone: string };
    }>('/super-admin/impersonate', { ownerId });
    return data;
  },

  getAuditLogs: async () => {
    const { data } = await api.get('/super-admin/audit-logs');
    return data.data;
  },

  getTickets: async () => {
    const { data } = await api.get('/super-admin/support-tickets');
    return data.data;
  },

  getTicketDetails: async (id: string) => {
    const { data } = await api.get(`/super-admin/support-tickets/${id}`);
    return data.data;
  },

  replyTicket: async (id: string, content: string) => {
    const { data } = await api.post(`/super-admin/support-tickets/${id}/reply`, { content });
    return data.data;
  },

  updateTicketStatus: async (id: string, status: string) => {
    const { data } = await api.put(`/super-admin/support-tickets/${id}/status`, { status });
    return data.data;
  },
};
