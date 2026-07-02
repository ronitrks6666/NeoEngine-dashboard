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
  // Personal
  profilePhotoUrl?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  secondaryPhone?: string;
  guardianPhone?: string;
  department?: string;
  joiningDate?: string;
  previousExperience?: string;
  // Addresses
  localAddress?: string;
  temporaryAddress?: string;
  permanentAddress?: string;
  locationLink?: string;
  // Financial / Payroll
  salary?: number;
  upiId?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  panNumber?: string;
  pfNumber?: string;
  esicNumber?: string;
  // Scheduling
  minHoursPerDay?: number;
  punchInTime?: string;
  // Medical
  hasMedicalCondition?: boolean;
  medicalConditionNotes?: string;
  bodyMarks?: string;
  bodyMarksPhotoUrl?: string;
  // Compliance
  policeVerificationStatus?: 'pending' | 'verified' | 'not_required';
  policeVerificationNotes?: string;
  // Status
  userStatus?: 'active' | 'on_hold';
  userStatusReason?: string;
  metadata?: {
    multiOutletAccess?: boolean;
    multiOutletOutletIds?: string[];
  };
  outletId?: string | { _id?: string; name?: string };
}

export const employeeApi = {
  getMyEmployees: async (params?: {
    outletId?: string;
    shiftType?: string;
    search?: string;
    page?: number;
    limit?: number;
    /** Set true on owner staff/history views to include deactivated staff; omit for active-only (matches mobile app default). */
    includeInactive?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (params?.outletId) q.set('outletId', params.outletId);
    if (params?.shiftType) q.set('shiftType', params.shiftType);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.includeInactive) q.set('includeInactive', '1');
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
    parentRoleId?: string | null;
    salary?: number | null;
    minHoursPerDay?: number | null;
    punchInTime?: string | null;
    upiId?: string | null;
    weeklyOffDays?: string[];
    reportsToEmployeeId?: string | null;
    reportsToOwnerId?: string | null;
    // Personal
    dateOfBirth?: string | null;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    secondaryPhone?: string | null;
    guardianPhone?: string | null;
    department?: string | null;
    joiningDate?: string | null;
    previousExperience?: string | null;
    // Addresses
    localAddress?: string | null;
    temporaryAddress?: string | null;
    permanentAddress?: string | null;
    locationLink?: string | null;
    // Financial
    bankAccountNumber?: string | null;
    ifscCode?: string | null;
    panNumber?: string | null;
    pfNumber?: string | null;
    esicNumber?: string | null;
    // Medical
    hasMedicalCondition?: boolean;
    medicalConditionNotes?: string | null;
    bodyMarks?: string | null;
    // Compliance
    policeVerificationStatus?: 'pending' | 'verified' | 'not_required';
    policeVerificationNotes?: string | null;
    // Status
    userStatus?: 'active' | 'on_hold';
    userStatusReason?: string | null;
    multiOutletAccess?: boolean;
    multiOutletOutletIds?: string[];
    multiOutletPermissionMode?: 'keep' | 'reset';
    newPassword?: string;
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

  createParentRole: async (name: string, outletId?: string, departmentId?: string) => {
    const { data } = await api.post('/employee/create-parent-role', {
      name,
      ...(outletId ? { outletId } : {}),
      ...(departmentId ? { departmentId } : {}),
    });
    return data;
  },

  createRole: async (payload: { name: string; parentRoleId: string; outletId: string }) => {
    const { data } = await api.post('/employee/create-role', payload);
    return data;
  },

  updateRole: async (
    roleId: string,
    payload: { name?: string; minHoursPerDay?: number; punchInTime?: string | null }
  ) => {
    const { data } = await api.put(`/employee/role/${roleId}`, payload);
    return data;
  },

  getDepartments: async (outletId: string) => {
    const { data } = await api.get(`/employee/departments/${outletId}`);
    return data;
  },

  createDepartment: async (payload: { name: string; outletId: string }) => {
    const { data } = await api.post('/employee/departments', payload);
    return data;
  },

  updateDepartment: async (departmentId: string, payload: { name?: string; isActive?: boolean }) => {
    const { data } = await api.put(`/employee/departments/${departmentId}`, payload);
    return data;
  },

  getRolesOverview: async (outletId: string) => {
    const { data } = await api.get(`/employee/roles-overview/${outletId}`);
    return data;
  },

  updateParentRole: async (
    parentRoleId: string,
    payload: { name?: string; description?: string; departmentId?: string | null }
  ) => {
    const { data } = await api.put(`/employee/parent-role/${parentRoleId}`, payload);
    return data;
  },

  getFreeRoles: async (outletId: string, parentRoleId?: string) => {
    const q = parentRoleId ? `?parentRoleId=${encodeURIComponent(parentRoleId)}` : '';
    const { data } = await api.get(`/employee/free-roles/${outletId}${q}`);
    return data;
  },

  getDutyRoster: async (params: { outletId: string; search?: string }) => {
    const q = new URLSearchParams({ outletId: params.outletId });
    if (params.search?.trim()) q.set('search', params.search.trim());
    const { data } = await api.get(`/employee/duty-roster?${q.toString()}`);
    return data;
  },

  getStaffNotes: async (employeeId: string) => {
    const { data } = await api.get<{
      success?: boolean;
      data?: { notes: StaffNote[] };
    }>(`/employee/staff/${employeeId}/notes`);
    return (data?.data?.notes ?? []) as StaffNote[];
  },

  addStaffNote: async (employeeId: string, text: string) => {
    const { data } = await api.post(`/employee/staff/${employeeId}/notes`, { text });
    return data;
  },
};

export type StaffNote = {
  id: string;
  text: string;
  kind?: 'general' | 'hold' | 'resume' | 'deactivate' | 'transfer';
  createdAt?: string;
  createdByName?: string;
};

export type DutyRosterRow = {
  id: string;
  name: string;
  roleName: string;
  activeRoleId: string | null;
  parentRoleId: string | null;
  shiftType: string;
  punchInTime: string | null;
  minHoursPerDay: number | null;
  weeklyOffDays: string[];
  effectivePunchInTime: string;
  effectiveMinHoursPerDay: number;
  punchInSource: 'employee' | 'role' | 'outlet';
  hoursSource: 'employee' | 'role' | 'outlet';
};
