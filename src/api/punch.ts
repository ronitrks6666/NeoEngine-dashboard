import { api } from './client';

export const punchApi = {
  punchInForEmployee: async (targetEmployeeId: string, outletId: string, lat?: number, lng?: number) => {
    const { data } = await api.post('/punch/owner/in-for-employee', {
      targetEmployeeId,
      outletId,
      latitude: lat ?? 0,
      longitude: lng ?? 0,
    });
    return data;
  },

  punchOutForEmployee: async (targetEmployeeId: string, outletId: string, lat?: number, lng?: number) => {
    const { data } = await api.post('/punch/owner/out-for-employee', {
      targetEmployeeId,
      outletId,
      latitude: lat ?? 0,
      longitude: lng ?? 0,
    });
    return data;
  },

  breakStartForEmployee: async (targetEmployeeId: string, outletId: string) => {
    const { data } = await api.post('/punch/owner/break-start-for-employee', {
      targetEmployeeId,
      outletId,
    });
    return data;
  },

  breakEndForEmployee: async (targetEmployeeId: string, outletId: string, lat?: number, lng?: number) => {
    const { data } = await api.post('/punch/owner/break-end-for-employee', {
      targetEmployeeId,
      outletId,
      latitude: lat ?? 0,
      longitude: lng ?? 0,
    });
    return data;
  },
};
