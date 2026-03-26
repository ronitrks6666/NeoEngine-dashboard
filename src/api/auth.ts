import { api } from './client';
import type { UserRole } from '@/types/auth';

export interface SuperAdminLoginPayload {
  email: string;
  password: string;
}

export interface OwnerLoginPayload {
  email?: string;
  phone?: string;
  password: string;
}

export interface OwnerOtpPayload {
  phone: string;
  otp?: string;
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

  /** Owner login: email+password (owner API) or phone+password (auth API) */
  ownerLogin: async (payload: OwnerLoginPayload) => {
    const { email, phone, password } = payload;
    const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';

    if (email) {
      const { data } = await api.post<LoginResponse>('/owner/login', { email, password });
      return data;
    }
    if (cleanPhone.length === 10) {
      const { data } = await api.post<LoginResponse>('/auth/login', { phone: cleanPhone, password });
      return data;
    }
    throw new Error('Enter email or 10-digit phone number');
  },

  sendOtp: async (phone: string) => {
    const cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.length !== 10) throw new Error('Enter valid 10-digit phone number');
    const { data } = await api.post('/auth/send-otp', { phone: cleanPhone });
    return data;
  },

  verifyOtp: async (phone: string, otp: string) => {
    const cleanPhone = String(phone).replace(/\D/g, '');
    const { data } = await api.post<LoginResponse>('/auth/verify-otp', { phone: cleanPhone, otp });
    return data;
  },

  setPassword: async (newPassword: string) => {
    const { data } = await api.post('/owner/set-password', { newPassword });
    return data;
  },
};

export function persistAuth(token: string, user: object, role: UserRole) {
  localStorage.setItem('neoengine_token', token);
  localStorage.setItem('neoengine_user', JSON.stringify(user));
  localStorage.setItem('neoengine_role', role);
}

export function clearAuth() {
  localStorage.removeItem('neoengine_token');
  localStorage.removeItem('neoengine_user');
  localStorage.removeItem('neoengine_role');
}

export function getStoredAuth(): { token: string; user: object; role: UserRole } | null {
  const token = localStorage.getItem('neoengine_token');
  const userStr = localStorage.getItem('neoengine_user');
  if (!token || !userStr) return null;
  try {
    const user = JSON.parse(userStr);
    let role = localStorage.getItem('neoengine_role') as UserRole | null;
    if (!role || (role !== 'OWNER' && role !== 'SUPER_ADMIN')) {
      role = 'OWNER';
    }
    return { token, user, role };
  } catch {
    return null;
  }
}
