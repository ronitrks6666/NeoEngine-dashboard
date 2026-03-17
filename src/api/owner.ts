import { api } from './client';

export interface Outlet {
  _id: string;
  name: string;
  address?: string;
  phone?: string;
  ownerId: string;
  geofence?: { latitude?: number; longitude?: number; radius?: number };
}

export const ownerApi = {
  getOutlets: async () => {
    const { data } = await api.get<{ success: boolean; data: { outlets: Outlet[] } }>('/owner/outlets');
    return data.data.outlets;
  },

  createOutlet: async (payload: { name: string; address: string; phone: string; geofence?: object }) => {
    const { data } = await api.post('/owner/create-outlet', payload);
    return data;
  },

  updateOutlet: async (outletId: string, payload: Partial<{ name: string; address: string; phone: string; geofence: object }>) => {
    const { data } = await api.put(`/owner/outlets/${outletId}`, payload);
    return data;
  },

  deleteOutlet: async (outletId: string) => {
    const { data } = await api.delete(`/owner/outlets/${outletId}`);
    return data;
  },
};
