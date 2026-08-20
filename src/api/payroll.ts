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

  updatePayrollSettings: async (
    outletId: string,
    settings: PayrollSettings,
    options?: { lateRulesApplyFrom?: 'next_payroll_month' | 'current_and_next' }
  ) => {
    const { data } = await api.put<{
      success: boolean;
      message?: string;
      data: { settings: PayrollSettings };
    }>(`/payroll/outlet/${outletId}/settings`, {
      ...settings,
      ...(options?.lateRulesApplyFrom ? { lateRulesApplyFrom: options.lateRulesApplyFrom } : {}),
    });
    return data;
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

  reopenPeriod: async (outletId: string, periodId: string, reason: string) => {
    const { data } = await api.post(`/payroll/outlet/${outletId}/period/${periodId}/reopen`, { reason });
    return data;
  },

  getPeriod: async (outletId: string, periodId: string, params?: { search?: string }) => {
    const q = new URLSearchParams();
    if (params?.search?.trim()) q.set('search', params.search.trim());
    const qs = q.toString();
    const { data } = await api.get(`/payroll/outlet/${outletId}/period/${periodId}${qs ? `?${qs}` : ''}`);
    return data;
  },

  getPreLockChecks: async (
    outletId: string,
    periodId: string,
    params?: { type?: 'missing_bank' | 'non_positive_net' | 'attendance_gaps'; search?: string; limit?: number; offset?: number }
  ) => {
    const { data } = await api.get(`/payroll/outlet/${outletId}/period/${periodId}/prelock-checks`, {
      params,
    });
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

  bulkPreviewAdjustments: async (
    outletId: string,
    periodId: string,
    rows: Array<{ employeeId?: string; employeePhone?: string; type: string; amount: number; notes?: string }>
  ) => {
    const { data } = await api.post(
      `/payroll/outlet/${outletId}/period/${periodId}/adjustments/bulk-preview`,
      { rows }
    );
    return data;
  },

  bulkApplyAdjustments: async (
    outletId: string,
    periodId: string,
    payload: {
      rows: Array<{ employeeId?: string; employeePhone?: string; type: string; amount: number; notes?: string }>;
      skipInvalid?: boolean;
    }
  ) => {
    const { data } = await api.post(
      `/payroll/outlet/${outletId}/period/${periodId}/adjustments/bulk-apply`,
      payload
    );
    return data;
  },

  createPayoutBatch: async (
    outletId: string,
    periodId: string,
    payload?: { employeeIds?: string[]; label?: string; forceCreate?: boolean }
  ) => {
    const { data } = await api.post(
      `/payroll/outlet/${outletId}/period/${periodId}/payout-batches/create`,
      payload || {}
    );
    return data;
  },

  listPayoutBatches: async (outletId: string, periodId: string) => {
    const { data } = await api.get(`/payroll/outlet/${outletId}/period/${periodId}/payout-batches`);
    return data;
  },

  updatePayoutBatchItemStatus: async (
    outletId: string,
    periodId: string,
    batchId: string,
    employeeId: string,
    payload: { status: 'pending' | 'paid' | 'failed' | 'skipped'; utrNumber?: string; note?: string }
  ) => {
    const { data } = await api.post(
      `/payroll/outlet/${outletId}/period/${periodId}/payout-batches/${batchId}/item/${employeeId}/status`,
      payload
    );
    return data;
  },

  finalizePayoutBatch: async (outletId: string, periodId: string, batchId: string) => {
    const { data } = await api.post(
      `/payroll/outlet/${outletId}/period/${periodId}/payout-batches/${batchId}/finalize`
    );
    return data;
  },

  getPayrollAnalytics: async (outletId: string, limit = 6) => {
    const { data } = await api.get(`/payroll/outlet/${outletId}/payroll-analytics`, {
      params: { limit },
    });
    return data;
  },

  exportComplianceData: async (
    outletId: string,
    periodId: string,
    params?: { format?: 'json' | 'csv' }
  ) => {
    if (params?.format === 'csv') {
      const response = await api.get(
        `/payroll/outlet/${outletId}/period/${periodId}/compliance-export`,
        { params: { format: 'csv' }, responseType: 'blob' }
      );
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payroll-compliance-${periodId}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      return { success: true };
    }
    const { data } = await api.get(
      `/payroll/outlet/${outletId}/period/${periodId}/compliance-export`
    );
    return data;
  },

  getPendingAdjustments: async (outletId: string, periodId: string) => {
    const { data } = await api.get(`/payroll/outlet/${outletId}/period/${periodId}/pending-adjustments`);
    return data;
  },

  decideAdjustment: async (
    outletId: string,
    periodId: string,
    transactionId: string,
    payload: { decision: 'approve' | 'reject'; note?: string }
  ) => {
    const { data } = await api.post(
      `/payroll/outlet/${outletId}/period/${periodId}/adjustment/${transactionId}/decision`,
      payload
    );
    return data;
  },

  exportPayroll: async (outletId: string, periodId?: string) => {
    const q = periodId ? `?periodId=${periodId}` : '';
    const { data } = await api.get(`/payroll/outlet/${outletId}/export${q}`);
    return data;
  },

  getPayrollReport: async (outletId: string, periodId: string) => {
    const { data } = await api.get<{
      success: boolean;
      data: {
        period: {
          _id: string;
          periodStart?: string;
          periodEnd?: string;
          status?: string;
        };
        rows: import('@/utils/payrollExport').PayrollReportRow[];
      };
    }>(`/payroll/outlet/${outletId}/export`, {
      params: { periodId, format: 'report' },
    });
    return data.data;
  },

  downloadPayrollCsv: async (outletId: string, periodId: string) => {
    const response = await api.get(`/payroll/outlet/${outletId}/export`, {
      params: { periodId, format: 'csv' },
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payroll-${periodId}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  getPeriodAttendance: async (outletId: string, periodId: string, params?: { search?: string }) => {
    const q = new URLSearchParams();
    if (params?.search?.trim()) q.set('search', params.search.trim());
    const qs = q.toString();
    const { data } = await api.get(
      `/payroll/outlet/${outletId}/period/${periodId}/attendance${qs ? `?${qs}` : ''}`
    );
    return data;
  },

  setAttendanceAdjustment: async (
    outletId: string,
    periodId: string,
    payload: {
      employeeId: string;
      dateKey: string;
      adjustmentType: 'half_day' | 'full_day' | 'clear';
      notes?: string;
    }
  ) => {
    const { data } = await api.put(
      `/payroll/outlet/${outletId}/period/${periodId}/attendance-adjustment`,
      payload
    );
    return data;
  },

  getPaymentHistory: async (outletId: string, employeeId: string, limit = 50) => {
    const { data } = await api.get(`/payroll/outlet/${outletId}/employee/${employeeId}/payments?limit=${limit}`);
    return data;
  },
};
