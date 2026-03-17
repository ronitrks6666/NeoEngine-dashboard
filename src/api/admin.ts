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
  punchesLast30Days: number;
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

  getAnalytics: async () => {
    const { data } = await api.get<{ success: boolean; data: AdminAnalytics }>('/admin/analytics');
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
};
