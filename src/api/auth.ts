import { api } from './client';
import type { UserRole } from '@/types/auth';
import {
  hasWebDashboardAccess,
  WEB_DASHBOARD_ACCESS_DENIED_MESSAGE,
} from '@/lib/webDashboardAccess';

export interface SuperAdminLoginPayload {
  email: string;
  password: string;
}

export interface OwnerLoginPayload {
  email?: string;
  phone?: string;
  password: string;
}

export interface MerchantLoginResponse {
  success: boolean;
  message: string;
  isFirstLogin?: boolean;
  token?: string;
  refreshToken?: string;
  userType?: 'OWNER' | 'EMPLOYEE';
  user?: { id: string; name: string; email?: string; phone: string };
  employee?: {
    id: string;
    name: string;
    phone: string;
    outletId?: string;
    outletName?: string | null;
    activeRoleId?: string;
  };
  role?: string;
  featurePermissions?: Record<string, boolean> | null;
  data?: {
    superAdmin?: { id: string; name: string; email: string; phone: string };
    owner?: { id: string; name: string; email: string; phone: string };
    token: string;
  };
}

export interface LoginResponse {
  success: boolean;
  message: string;
  isFirstLogin?: boolean;
  data?: {
    superAdmin?: { id: string; name: string; email: string; phone: string };
    owner?: { id: string; name: string; email: string; phone: string };
    token: string;
  };
  token?: string;
  user?: { id: string; name: string; email?: string; phone: string };
  userType?: string;
}

export function getApiErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const err = error as { response?: { data?: { error?: string } }; message?: string };
    return err.response?.data?.error || err.message || 'Request failed';
  }
  return (error as Error)?.message || 'An error occurred';
}

export const authApi = {
  superAdminLogin: async (payload: SuperAdminLoginPayload) => {
    const { data } = await api.post<LoginResponse>('/admin/login', payload);
    return data;
  },

  /** Owner or employee login via email+password (owner API) or phone+password (auth API). */
  merchantLogin: async (payload: OwnerLoginPayload): Promise<MerchantLoginResponse> => {
    const { email, phone, password } = payload;
    const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';

    if (email) {
      const { data } = await api.post<MerchantLoginResponse>('/owner/login', { email, password });
      return data;
    }
    if (cleanPhone.length === 10) {
      const { data } = await api.post<MerchantLoginResponse>('/auth/login', {
        phone: cleanPhone,
        password,
      });
      return data;
    }
    throw new Error('Enter email or 10-digit phone number');
  },

  /** @deprecated use merchantLogin */
  ownerLogin: async (payload: OwnerLoginPayload) => authApi.merchantLogin(payload),

  sendOtp: async (phone: string) => {
    const cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.length !== 10) throw new Error('Enter valid 10-digit phone number');
    const { data } = await api.post('/auth/send-otp', { phone: cleanPhone });
    return data;
  },

  verifyOtp: async (phone: string, otp: string): Promise<MerchantLoginResponse> => {
    const cleanPhone = String(phone).replace(/\D/g, '');
    const { data } = await api.post<MerchantLoginResponse>('/auth/verify-otp', {
      phone: cleanPhone,
      otp,
    });
    if (data.userType === 'EMPLOYEE') {
      if (!hasWebDashboardAccess(data.featurePermissions)) {
        throw new Error(WEB_DASHBOARD_ACCESS_DENIED_MESSAGE);
      }
    }
    return data;
  },

  setPassword: async (newPassword: string) => {
    const { data } = await api.post('/owner/set-password', { newPassword });
    return data;
  },

  getMe: async () => {
    const { data } = await api.get<{
      success: boolean;
      userType: 'OWNER' | 'EMPLOYEE' | 'SUPER_ADMIN';
      user?: { id: string; name: string; email?: string; phone: string };
      employee?: {
        id: string;
        name: string;
        phone: string;
        outletId?: string;
        outletName?: string | null;
        activeRoleId?: string;
      };
      role?: string;
      featurePermissions?: Record<string, boolean> | null;
      isFirstLogin?: boolean;
    }>('/auth/me');
    return data;
  },
};

export function persistAuth(
  token: string,
  user: object,
  role: UserRole,
  featurePermissions?: Record<string, boolean> | null
) {
  const storage = typeof window !== 'undefined' && window.self !== window.top ? sessionStorage : localStorage;
  storage.setItem('neoengine_token', token);
  storage.setItem('neoengine_user', JSON.stringify(user));
  storage.setItem('neoengine_role', role);
  if (featurePermissions) {
    storage.setItem('neoengine_feature_permissions', JSON.stringify(featurePermissions));
  } else {
    storage.removeItem('neoengine_feature_permissions');
  }
}

export function clearAuth() {
  const clear = (storage: Storage) => {
    storage.removeItem('neoengine_token');
    storage.removeItem('neoengine_user');
    storage.removeItem('neoengine_role');
    storage.removeItem('neoengine_feature_permissions');
  };
  if (typeof window !== 'undefined' && window.self !== window.top) {
    clear(sessionStorage);
    return;
  }
  clear(localStorage);
}

export function getStoredAuth(): {
  token: string;
  user: object;
  role: UserRole;
  featurePermissions?: Record<string, boolean> | null;
} | null {
  const read = (storage: Storage) => ({
    token: storage.getItem('neoengine_token'),
    userStr: storage.getItem('neoengine_user'),
    role: storage.getItem('neoengine_role') as UserRole | null,
    permsStr: storage.getItem('neoengine_feature_permissions'),
  });

  let { token, userStr, role, permsStr } =
    typeof window !== 'undefined' && window.self !== window.top
      ? read(sessionStorage)
      : read(localStorage);

  if (!token) {
    const fromLocal = read(localStorage);
    token = fromLocal.token;
    userStr = fromLocal.userStr;
    role = fromLocal.role;
    permsStr = fromLocal.permsStr;
  }

  if (!token || !userStr || !role) return null;
  if (role !== 'OWNER' && role !== 'SUPER_ADMIN' && role !== 'EMPLOYEE') return null;

  try {
    const user = JSON.parse(userStr);
    let featurePermissions: Record<string, boolean> | null = null;
    if (permsStr) {
      try {
        featurePermissions = JSON.parse(permsStr);
      } catch {
        featurePermissions = null;
      }
    }
    if (role === 'EMPLOYEE' && !hasWebDashboardAccess(featurePermissions)) {
      return null;
    }
    return { token, user, role, featurePermissions };
  } catch {
    return null;
  }
}
