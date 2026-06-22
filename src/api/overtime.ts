import { api } from './client';

export interface OvertimeRequest {
  _id: string;
  employeeId: { _id: string; name?: string };
  outletId: string;
  date: string;
  overtimeHours: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  description?: string;
  imageUrls?: string[];
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  /** Payroll month label derived from date (IST) */
  payrollMonthLabel?: string;
}

export const overtimeApi = {
  getOutletOvertime: async (
    outletId: string,
    params?: { status?: string; employeeId?: string; startDate?: string; endDate?: string }
  ) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.employeeId) q.set('employeeId', params.employeeId);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    const { data } = await api.get<{ success: boolean; data: { requests: OvertimeRequest[]; pendingCount: number } }>(
      `/overtime/outlet/${outletId}?${q.toString()}`
    );
    return data;
  },

  getRequestDetail: async (requestId: string) => {
    const { data } = await api.get<{ success: boolean; data: { request: OvertimeRequest; canUnapprove: boolean } }>(
      `/overtime/owner/${requestId}`
    );
    return data;
  },

  approve: async (requestId: string) => {
    const { data } = await api.put(`/overtime/${requestId}/approve`);
    return data;
  },

  reject: async (requestId: string, reason?: string) => {
    const { data } = await api.put(`/overtime/${requestId}/reject`, { rejectionReason: reason });
    return data;
  },

  unapprove: async (requestId: string, reason?: string) => {
    const { data } = await api.put(`/overtime/${requestId}/unapprove`, { unapproveReason: reason });
    return data;
  },
};
