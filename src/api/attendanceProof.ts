import { api } from './client';

export type AttendanceProofType = 'IN' | 'BREAK_START' | 'OUT';
export type AttendanceProofStatus = 'pending' | 'approved' | 'rejected';

export type AttendanceProof = {
  id: string;
  employeeId?: string | null;
  employeeName?: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
  outletId?: string | null;
  dateKey: string;
  type: AttendanceProofType;
  status: AttendanceProofStatus;
  photoUrl: string;
  capturedAt?: string;
  receivedAt?: string;
  location?: { latitude?: number; longitude?: number; accuracy?: number } | null;
  geofenceStatus?: string;
  distanceMeters?: number | null;
  failureReasonCode?: string;
  failureReasonLabel?: string;
  attemptCount?: number;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  linkedPunchId?: string | null;
  createdAt?: string;
};

export type AttendanceProofListData = {
  proofs: AttendanceProof[];
  pendingCount: number;
  pendingCountByType: { IN: number; BREAK_START: number; OUT: number };
};

export const attendanceProofApi = {
  listForOutlet: async (
    outletId: string,
    params?: {
      status?: AttendanceProofStatus | 'all';
      type?: AttendanceProofType | 'all';
      dateKey?: string;
      limit?: number;
    }
  ) => {
    const q = new URLSearchParams();
    if (params?.status && params.status !== 'all') q.set('status', params.status);
    if (params?.type && params.type !== 'all') q.set('type', params.type);
    if (params?.dateKey) q.set('dateKey', params.dateKey);
    if (params?.limit != null) q.set('limit', String(params.limit));
    const qs = q.toString();
    const { data } = await api.get<{ success: boolean; data: AttendanceProofListData }>(
      `/attendance-proof/outlet/${outletId}${qs ? `?${qs}` : ''}`
    );
    return data.data;
  },

  approve: async (proofId: string) => {
    const { data } = await api.post<{ success: boolean; message?: string }>(
      `/attendance-proof/${proofId}/approve`
    );
    return data;
  },

  reject: async (proofId: string, reason?: string) => {
    const { data } = await api.post<{ success: boolean; message?: string }>(
      `/attendance-proof/${proofId}/reject`,
      { reason: reason || '' }
    );
    return data;
  },
};
