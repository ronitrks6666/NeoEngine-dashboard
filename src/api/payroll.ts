import { api } from './client';
import type { PayrollSettings } from './owner';

export const payrollApi = {
  getPayrollSettings: async (outletId: string) => {
    const { data } = await api.get<{
      success: boolean;
      data: { settings: PayrollSettings };
    }>(`/payroll/outlet/${outletId}/settings`);
    return data.data.settings;
  },

  updatePayrollSettings: async (outletId: string, settings: PayrollSettings) => {
    const { data } = await api.put<{
      success: boolean;
      data: { settings: PayrollSettings };
    }>(`/payroll/outlet/${outletId}/settings`, settings);
    return data.data.settings;
  },

  getPeriods: async (outletId: string) => {
    const { data } = await api.get(`/payroll/outlet/${outletId}/periods`);
    return data;
  },

  createPeriod: async (outletId: string, payload: { periodStart: string; periodEnd: string }) => {
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

  getPeriod: async (outletId: string, periodId: string, params?: { search?: string }) => {
    const q = new URLSearchParams();
    if (params?.search?.trim()) q.set('search', params.search.trim());
    const qs = q.toString();
    const { data } = await api.get(`/payroll/outlet/${outletId}/period/${periodId}${qs ? `?${qs}` : ''}`);
    return data;
  },

  addPayment: async (outletId: string, employeeId: string, payload: { amount: number; notes?: string; payrollPeriodId?: string }) => {
    const { data } = await api.post(`/payroll/outlet/${outletId}/employee/${employeeId}/payment-v2`, payload);
    return data;
  },
  
  addAdjustment: async (outletId: string, employeeId: string, payload: { amount: number; type: string; notes?: string; payrollPeriodId?: string }) => {
    const { data } = await api.post(`/payroll/outlet/${outletId}/employee/${employeeId}/adjustment`, payload);
    return data;
  },

  exportPayroll: async (outletId: string, periodId?: string) => {
    const q = periodId ? `?periodId=${periodId}` : '';
    const { data } = await api.get(`/payroll/outlet/${outletId}/export${q}`);
    return data;
  },

  getPaymentHistory: async (outletId: string, employeeId: string, limit = 50) => {
    const { data } = await api.get(`/payroll/outlet/${outletId}/employee/${employeeId}/payments?limit=${limit}`);
    return data;
  },
};
