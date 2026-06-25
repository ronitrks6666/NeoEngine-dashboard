export type UserRole = 'SUPER_ADMIN' | 'OWNER' | 'EMPLOYEE';

export type SuperAdminRole = 'PRIMARY' | 'SUB';

export interface SuperAdmin {
  id: string;
  name: string;
  email: string;
  phone: string;
  role?: SuperAdminRole;
  permissions?: string[];
  isActive?: boolean;
  createdAt?: string;
}

export interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface EmployeeUser {
  id: string;
  name: string;
  phone: string;
  outletId?: string;
  outletName?: string;
  activeRoleId?: string;
  roleLabel?: string;
}

export type AuthUser = SuperAdmin | Owner | EmployeeUser;

export interface AuthState {
  user: AuthUser | null;
  role: UserRole | null;
  token: string | null;
  isFirstLogin?: boolean;
  featurePermissions?: Record<string, boolean> | null;
}
