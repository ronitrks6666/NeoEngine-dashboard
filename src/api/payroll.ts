import { api } from './client';

export const payrollApi = {
  getPeriods: async (outletId: string) => {
    const { data } = await api.get(`/payroll/outlet/${outletId}/periods`);
    return data;
  },

  createPeriod: async (outletId: string, payload: { startDate: string; endDate: string }) => {
    const { data } = await api.post(`/payroll/outlet/${outletId}/period`, payload);
    return data;
  },

  processPeriod: async (outletId: string, periodId: string) => {
    const { data } = await api.post(`/payroll/outlet/${outletId}/period/${periodId}/process`);
    return data;
  },

  lockPeriod: async (outletId: string, periodId: string) => {
    const { data } = await api.post(`/payroll/outlet/${outletId}/period/${periodId}/lock`);
    return data;
  },

  getPeriod: async (outletId: string, periodId: string) => {
    const { data } = await api.get(`/payroll/outlet/${outletId}/period/${periodId}`);
    return data;
  },

  addPayment: async (outletId: string, employeeId: string, payload: { amount: number; notes?: string; payrollPeriodId?: string }) => {
    const { data } = await api.post(`/payroll/outlet/${outletId}/employee/${employeeId}/payment-v2`, payload);
    return data;
  },

  exportPayroll: async (outletId: string, periodId?: string) => {
    const q = periodId ? `?periodId=${periodId}` : '';
    const { data } = await api.get(`/payroll/outlet/${outletId}/export${q}`);
    return data;
  },
};
