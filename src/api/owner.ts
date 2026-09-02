import { api } from './client';

export interface PayrollSettings {
  cycleType?: 'every_x_days' | 'specific_day_of_month';
  cycleDays?: number;
  cycleDayOfMonth?: number;
  expectedHoursPerDayDefault?: number;
  paidLeavesEnabled?: boolean;
  allowedPaidLeavesPerCycle?: number;
  overtimeEnabled?: boolean;
  overtimeApprovalRequired?: boolean;
  minuteBasedTrackingEnabled?: boolean;
  allowUnlimitedWorkHoursPerDay?: boolean;
}

export interface PostShiftEnforcement {
  enabled?: boolean;
  shadowMode?: boolean;
  graceWindowMinutes?: number;
  escalationWindowMinutes?: number;
  hardCutoffMinutes?: number;
  staffChoiceMinutes?: number;
  fixCollectSeconds?: number;
  accuracyCutoffM?: number;
  geofenceRadiusOverrideM?: number;
  otPaidWithoutApproval?: boolean;
  requireFaceOnDispute?: boolean;
  disputeWindowHours?: number;
}

export type BrandProfile = {
  displayName: string | null;
  logoUrl: string | null;
};

export type FeatureMenuPrefRow = { key: string; enabled: boolean };

export type FeatureMenuCatalogItem = {
  key: string;
  label: string;
  path?: string;
  section?: string;
  locked?: boolean;
};

export type FeatureMenuSection = {
  defaults: FeatureMenuPrefRow[];
  items: FeatureMenuPrefRow[];
  catalog: FeatureMenuCatalogItem[];
};

export type FeatureMenuConfig = {
  webNav: FeatureMenuSection;
  mobileMore: FeatureMenuSection;
};

export interface Outlet {
  _id: string;
  name: string;
  address?: string;
  phone?: string;
  ownerId: string;
  geofence?: { latitude?: number; longitude?: number; radius?: number };
  payCycleDays?: number;
  gstNumber?: string;
  timezone?: string;
  punchInTime?: string;
  /** Hours after shift end before system auto punch-out (attendance logout). */
  shiftAutoLogoutGraceHours?: number | null;
  openingHours?: {
    day: string;
    closed: boolean;
    openTime: string;
    closeTime: string;
  }[];
  payCycleType?: 'every_x_days' | 'specific_day_of_month';
  leaveAllowanceDaysPerMonth?: number;
  rulesAndRegulations?: string;
  payrollSettings?: PayrollSettings;
  postShiftEnforcement?: PostShiftEnforcement;
}

export type OutletShift = {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  outletId?: string;
};

export const ownerApi = {
  getOutlets: async (params?: { search?: string }) => {
    const q = new URLSearchParams();
    if (params?.search?.trim()) q.set('search', params.search.trim());
    const qs = q.toString();
    const { data } = await api.get<{ success: boolean; data: { outlets: Outlet[] } }>(
      `/owner/outlets${qs ? `?${qs}` : ''}`
    );
    return data.data.outlets;
  },

  getOutlet: async (outletId: string) => {
    const { data } = await api.get<{ success: boolean; data: { outlet: Outlet } }>(`/owner/outlets/${outletId}`);
    return data.data.outlet;
  },

  createOutlet: async (payload: {
    name: string;
    address: string;
    phone: string;
    geofence?: object;
    gstNumber?: string;
  }) => {
    const { data } = await api.post('/owner/create-outlet', payload);
    return data;
  },

  updateOutlet: async (outletId: string, payload: Partial<{
    name: string;
    address: string;
    phone: string;
    geofence: object;
    payCycleDays?: number;
    gstNumber?: string;
    timezone?: string;
    punchInTime?: string;
    shiftAutoLogoutGraceHours?: number | null;
    openingHours?: {
      day: string;
      closed: boolean;
      openTime: string;
      closeTime: string;
    }[];
    payCycleType?: string;
    leaveAllowanceDaysPerMonth?: number;
    rulesAndRegulations?: string;
    payrollSettings?: Partial<PayrollSettings>;
    postShiftEnforcement?: Partial<PostShiftEnforcement>;
  }>) => {
    const { data } = await api.put(`/owner/outlets/${outletId}`, payload);
    return data;
  },

  deleteOutlet: async (outletId: string) => {
    const { data } = await api.delete(`/owner/outlets/${outletId}`);
    return data;
  },

  getShifts: async (outletId: string) => {
    const { data } = await api.get<{ success?: boolean; data?: { shifts?: OutletShift[] }; shifts?: OutletShift[] }>(
      `/shift/outlet/${outletId}`
    );
    return data?.data?.shifts || data?.shifts || [];
  },

  createShifts: async (
    outletId: string,
    shifts: { name: string; startTime: string; endTime: string }[]
  ) => {
    const { data } = await api.post(`/shift/outlet/${outletId}/bulk`, { shifts });
    return data;
  },

  updateShift: async (
    shiftId: string,
    payload: { name?: string; startTime?: string; endTime?: string }
  ) => {
    const { data } = await api.put(`/shift/${shiftId}`, payload);
    return data;
  },

  deleteShift: async (shiftId: string) => {
    const { data } = await api.delete(`/shift/${shiftId}`);
    return data;
  },

  createTicket: async (payload: { title: string; content: string; priority?: string }) => {
    const { data } = await api.post('/owner/support-tickets', payload);
    return data.data;
  },

  getTickets: async () => {
    const { data } = await api.get('/owner/support-tickets');
    return data.data;
  },

  getTicketDetails: async (id: string) => {
    const { data } = await api.get(`/owner/support-tickets/${id}`);
    return data.data;
  },

  replyTicket: async (id: string, content: string) => {
    const { data } = await api.post(`/owner/support-tickets/${id}/reply`, { content });
    return data.data;
  },

  getBrand: async () => {
    const { data } = await api.get<{ success: boolean; data: { brand: BrandProfile | null } }>(
      '/owner/brand'
    );
    return data.data.brand;
  },

  updateBrand: async (payload: { brandDisplayName?: string | null; brandLogoUrl?: string | null }) => {
    const { data } = await api.put<{ success: boolean; data: { brand: BrandProfile | null } }>(
      '/owner/brand',
      payload
    );
    return data.data.brand;
  },

  uploadBrandLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post<{ success: boolean; url: string }>(
      '/upload/brand-logo',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data.url;
  },

  getOutletRules: async (outletId: string) => {
    const { data } = await api.get<{
      success: boolean;
      data: { outletName: string; rulesAndRegulations: string; rulesVersion: number };
    }>(`/owner/outlets/${outletId}/rules`);
    return data.data;
  },

  updateOutletRules: async (outletId: string, rulesAndRegulations: string) => {
    const { data } = await api.put<{
      success: boolean;
      message: string;
      data: { rulesVersion: number };
    }>(`/owner/outlets/${outletId}/rules`, { rulesAndRegulations });
    return data;
  },

  getFeatureMenu: async (outletId: string) => {
    const { data } = await api.get<{ success: boolean; data: FeatureMenuConfig }>(
      `/owner/feature-menu?outletId=${encodeURIComponent(outletId)}`
    );
    return data.data;
  },
};
