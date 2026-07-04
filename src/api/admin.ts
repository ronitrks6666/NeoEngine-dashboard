import { api } from './client';
import type { FeatureMenuConfig, FeatureMenuPrefRow } from './owner';

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
  ownerIds?: Array<string | { _id: string; name: string; email?: string; phone?: string }>;
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

  createOutlet: async (payload: { name: string; address: string; phone: string; ownerId: string; ownerIds?: string[]; geofence?: object }) => {
    const { data } = await api.post('/admin/create-outlet', payload);
    return data;
  },

  updateOwner: async (id: string, payload: { name?: string; phone?: string; isActive?: boolean }) => {
    const { data } = await api.put(`/admin/owners/${id}`, payload);
    return data;
  },

  updateOutlet: async (
    id: string,
    payload: { name?: string; address?: string; phone?: string; ownerId?: string; ownerIds?: string[]; isActive?: boolean }
  ) => {
    const { data } = await api.put(`/admin/outlets/${id}`, payload);
    return data;
  },

  getOutletFeatureMenu: async (outletId: string) => {
    const { data } = await api.get<{
      success: boolean;
      data: { outletId: string; outletName: string } & FeatureMenuConfig;
    }>(`/super-admin/outlets/${outletId}/feature-menu`);
    return data.data;
  },

  updateOutletFeatureMenu: async (
    outletId: string,
    payload: { webNav?: FeatureMenuPrefRow[]; mobileMore?: FeatureMenuPrefRow[] }
  ) => {
    const { data } = await api.put<{
      success: boolean;
      data: Awaited<ReturnType<typeof adminApi.getOutletFeatureMenu>>;
    }>(`/super-admin/outlets/${outletId}/feature-menu`, payload);
    return data.data;
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

  getMe: async () => {
    const { data } = await api.get<{
      success: boolean;
      data: {
        id: string;
        name: string;
        email: string;
        phone: string;
        role: 'PRIMARY' | 'SUB';
        permissions: string[];
      };
    }>('/super-admin/me');
    return data.data;
  },

  getDashboardOverview: async () => {
    const { data } = await api.get<{
      success: boolean;
      data: DashboardOverview;
    }>('/super-admin/dashboard-overview');
    return data.data;
  },

  getPlans: async () => {
    const { data } = await api.get<{ success: boolean; data: SubscriptionPlan[] }>('/super-admin/plans');
    return data.data;
  },

  getSubscriptions: async () => {
    const { data } = await api.get<{ success: boolean; data: SubscriptionRow[] }>(
      '/super-admin/subscriptions'
    );
    return data.data;
  },

  updateSubscription: async (
    outletId: string,
    payload: {
      status?: string;
      paymentStatus?: string;
      planKey?: string;
      couponCode?: string;
      couponId?: string;
      notes?: string;
      billingCycleMonths?: number;
      soldById?: string;
      totalPaidInr?: number;
    }
  ) => {
    const { data } = await api.put(`/super-admin/subscriptions/${outletId}`, payload);
    return data.data;
  },

  getSalesReps: async () => {
    const { data } = await api.get<{
      success: boolean;
      data: { id: string; name: string; email: string; role: string }[];
    }>('/super-admin/sales-reps');
    return data.data;
  },

  getCoupons: async () => {
    const { data } = await api.get<{ success: boolean; data: BillingCoupon[] }>('/super-admin/coupons');
    return data.data;
  },

  createCoupon: async (payload: Partial<BillingCoupon> & { code: string; name: string }) => {
    const { data } = await api.post('/super-admin/coupons', payload);
    return data.data;
  },

  updateCoupon: async (id: string, payload: Partial<BillingCoupon>) => {
    const { data } = await api.put(`/super-admin/coupons/${id}`, payload);
    return data.data;
  },

  getSubAdmins: async () => {
    const { data } = await api.get<{ success: boolean; data: SubAdmin[] }>('/super-admin/sub-admins');
    return data.data;
  },

  createSubAdmin: async (payload: {
    name: string;
    email: string;
    password: string;
    phone: string;
    permissions: string[];
    permissionTemplate?: string;
    cloneFromId?: string;
  }) => {
    const { data } = await api.post('/super-admin/sub-admins', payload);
    return data.data;
  },

  updateSubAdmin: async (
    id: string,
    payload: Partial<{
      name: string;
      phone: string;
      permissions: string[];
      permissionTemplate: string;
      cloneFromId: string;
      isActive: boolean;
      password: string;
    }>
  ) => {
    const { data } = await api.put(`/super-admin/sub-admins/${id}`, payload);
    return data.data;
  },

  getPermissionTemplates: async () => {
    const { data } = await api.get<{
      success: boolean;
      data: { key: string; name: string; description: string; permissions: string[] }[];
    }>('/super-admin/permission-templates');
    return data.data;
  },

  getSubAdminPerformance: async (id: string) => {
    const { data } = await api.get<{ success: boolean; data: SalesPerformance }>(
      `/super-admin/sub-admins/${id}/performance`
    );
    return data.data;
  },

  getMySalesPerformance: async () => {
    const { data } = await api.get<{ success: boolean; data: SalesPerformance }>(
      '/super-admin/my-sales-performance'
    );
    return data.data;
  },
};

export interface SubscriptionPlan {
  _id: string;
  key: string;
  name: string;
  description?: string;
  basePricePerMonth: number;
  includedStaff: number;
  extraStaffPrice: number;
  currency: string;
  defaultTrialDays: number;
}

export interface BillingCoupon {
  _id: string;
  code: string;
  name: string;
  description?: string;
  type: 'free_trial' | 'percent_off' | 'fixed_off';
  trialDays: number;
  percentOff: number;
  fixedAmountOffInr: number;
  maxRedemptions: number;
  redemptionCount: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface SubAdmin {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'SUB';
  permissions: string[];
  permissionTemplate?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface SalesPerformance {
  superAdminId: string;
  name?: string;
  ownersOnboarded: number;
  outletsOnboarded: number;
  outletsLinkedToOwners: number;
  onFreeTrial: number;
  activePaid: number;
  unpaid: number;
  activeSubscriptions: number;
  totalRevenueClosedInr: number;
  totalDueInr: number;
  byBillingCycle: Record<string, number>;
  recentSubscriptions: {
    outletName: string;
    ownerName: string;
    status: string;
    paymentStatus: string;
    billingCycleMonths: number;
    totalPaidInr: number;
    amountDueInr: number;
    couponCode: string;
    createdAt?: string;
  }[];
}

export interface OnboardingRow {
  outletId: string;
  outletName: string;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
  planName: string;
  planKey: string;
  status: string;
  paymentStatus: string;
  staffCount: number;
  monthlyAmountInr: number;
  billingCycleMonths: number;
  periodListPriceInr: number;
  discountAmountInr: number;
  amountDueInr: number;
  totalPaidInr: number;
  couponCode?: string;
  couponType?: string;
  couponName?: string;
  soldByName?: string;
  trialEndsAt?: string;
}

export interface DashboardOverview {
  recentOwners: { _id: string; name: string; email: string; phone: string; createdAt: string }[];
  recentOwnersCount: number;
  recentOutletsCount: number;
  onboarding: OnboardingRow[];
  subscriptionSummary: Record<string, number>;
  plans: SubscriptionPlan[];
  totalOwners: number;
  totalOutlets: number;
}

export interface SubscriptionRow {
  outlet: {
    _id: string;
    name: string;
    address?: string;
    phone?: string;
    createdAt?: string;
    owner?: { _id: string; name: string; email?: string; phone?: string };
  };
  subscription: {
    _id: string;
    status: string;
    paymentStatus: string;
    planKey: string;
    planName: string;
    trialEndsAt?: string;
    currentPeriodEnd?: string;
    couponId?: string;
    couponCode?: string;
    couponType?: string;
    couponName?: string;
    billingCycleMonths: number;
    staffCount: number;
    monthlyAmountInr: number;
    listPriceInr: number;
    periodListPriceInr: number;
    discountAmountInr: number;
    amountDueInr: number;
    totalPaidInr: number;
    soldById?: string;
    soldByName?: string;
    includedStaff: number;
    extraStaffPrice: number;
    basePricePerMonth: number;
    notes?: string;
  };
};
