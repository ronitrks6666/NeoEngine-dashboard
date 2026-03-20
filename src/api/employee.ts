import { api } from './client';

export interface Employee {
  _id: string;
  name: string;
  phone: string;
  outletId: string;
  activeRoleId?: { _id: string; name: string } | string;
  shiftType?: string;
  isActive?: boolean;
  reportsToEmployeeId?: { name?: string } | string | null;
  reportsToOwnerId?: { name?: string } | string | null;
}

export const employeeApi = {
  getMyEmployees: async (params?: { outletId?: string; shiftType?: string; search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.outletId) q.set('outletId', params.outletId);
    if (params?.shiftType) q.set('shiftType', params.shiftType);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const { data } = await api.get(`/employee/my-employees?${q.toString()}`);
    return data;
  },

  getAvailableRoles: async (outletId: string) => {
    const { data } = await api.get(`/employee/available-roles/${outletId}`);
    return data;
  },

  create: async (payload: {
    name: string;
    phone: string;
    tempPassword: string;
    outletId: string;
    /** Pick existing outlet role (legacy / integrations) */
    activeRoleId?: string;
    /** Master role only — backend creates Chef-1, Chef-2, … under this outlet */
    parentRoleId?: string;
    shiftType?: string;
    reportsToEmployeeId?: string;
    reportsToOwnerId?: string;
  }) => {
    const { data } = await api.post('/employee/create', payload);
    return data;
  },

  update: async (employeeId: string, payload: Partial<{
    name: string;
    phone: string;
    shiftType: string;
    isActive: boolean;
    activeRoleId?: string | null;
    salary?: number | null;
    minHoursPerDay?: number | null;
    punchInTime?: string | null;
    upiId?: string | null;
    reportsToEmployeeId?: string | null;
    reportsToOwnerId?: string | null;
  }>) => {
    const { data } = await api.put(`/employee/staff/${employeeId}`, payload);
    return data;
  },

  getDocuments: async (employeeId: string) => {
    const { data } = await api.get(`/employee/${employeeId}/documents`);
    return data;
  },

  assignRole: async (employeeId: string, activeRoleId: string) => {
    const { data } = await api.post('/employee/assign-role', { employeeId, activeRoleId });
    return data;
  },

  getParentRoles: async () => {
    const { data } = await api.get('/employee/parent-roles');
    return data;
  },

  createParentRole: async (name: string, outletId?: string) => {
    const { data } = await api.post('/employee/create-parent-role', {
      name,
      ...(outletId ? { outletId } : {}),
    });
    return data;
  },

  createRole: async (payload: { name: string; parentRoleId: string; outletId: string }) => {
    const { data } = await api.post('/employee/create-role', payload);
    return data;
  },
};
