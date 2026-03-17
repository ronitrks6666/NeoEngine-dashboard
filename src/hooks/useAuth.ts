import { create } from 'zustand';
import type { AuthState, SuperAdmin, Owner } from '@/types/auth';
import { authApi, persistAuth, clearAuth, getStoredAuth } from '@/api/auth';

function getInitialState(): AuthState {
  const stored = getStoredAuth();
  if (stored) {
    return {
      user: stored.user as SuperAdmin | Owner,
      role: stored.role,
      token: stored.token,
    };
  }
  return { user: null, role: null, token: null };
}

interface AuthStore extends AuthState {
  loginAsSuperAdmin: (email: string, password: string) => Promise<void>;
  loginAsOwner: (identifier: string, password: string, isPhone?: boolean) => Promise<{ isFirstLogin: boolean }>;
  loginAsOwnerWithOtp: (phone: string, otp: string) => Promise<{ isFirstLogin: boolean }>;
  logout: () => void;
  hydrate: () => void;
}

export const useAuth = create<AuthStore>()((set) => ({
  ...getInitialState(),

  loginAsSuperAdmin: async (email, password) => {
        const res = await authApi.superAdminLogin({ email, password });
        if (!res.success || !res.data?.superAdmin || !res.data?.token) {
          throw new Error(res.message || 'Login failed');
        }
        persistAuth(res.data.token, res.data.superAdmin, 'SUPER_ADMIN');
        set({
          user: res.data.superAdmin as SuperAdmin,
          role: 'SUPER_ADMIN',
          token: res.data.token,
        });
      },

      loginAsOwner: async (identifier: string, password: string, isPhone?: boolean) => {
        const payload = isPhone
          ? { phone: identifier, password }
          : { email: identifier, password };
        const res = await authApi.ownerLogin(payload);
        const token = res.data?.token ?? res.token;
        const ownerData = res.data?.owner ?? res.user;
        if (!res.success || !token || !ownerData) {
          throw new Error(res.message || 'Login failed');
        }
        const owner: Owner = {
          id: ownerData.id,
          name: ownerData.name,
          email: ownerData.email ?? '',
          phone: ownerData.phone ?? '',
        };
        persistAuth(token, owner, 'OWNER');
        set({
          user: owner,
          role: 'OWNER',
          token,
          isFirstLogin: res.isFirstLogin ?? false,
        });
        return { isFirstLogin: res.isFirstLogin ?? false };
      },

      loginAsOwnerWithOtp: async (phone: string, otp: string) => {
        const res = await authApi.verifyOtp(phone, otp);
        if (res.userType !== 'OWNER') throw new Error('This phone is not registered as Owner');
        const token = res.token;
        const ownerData = res.user;
        if (!res.success || !token || !ownerData) {
          throw new Error(res.message || 'Verification failed');
        }
        const owner: Owner = {
          id: ownerData.id,
          name: ownerData.name,
          email: ownerData.email ?? '',
          phone: ownerData.phone ?? '',
        };
        persistAuth(token, owner, 'OWNER');
        set({
          user: owner,
          role: 'OWNER',
          token,
          isFirstLogin: res.isFirstLogin ?? false,
        });
        return { isFirstLogin: res.isFirstLogin ?? false };
      },

      logout: () => {
        clearAuth();
        set({ user: null, role: null, token: null });
      },

      hydrate: () => {
        const stored = getStoredAuth();
        if (stored) {
          set({
            user: stored.user as SuperAdmin | Owner,
            role: stored.role,
            token: stored.token,
          });
        }
      },
    }));
