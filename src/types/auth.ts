export type UserRole = 'SUPER_ADMIN' | 'OWNER';

export interface SuperAdmin {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface AuthState {
  user: SuperAdmin | Owner | null;
  role: UserRole | null;
  token: string | null;
  isFirstLogin?: boolean;
}
