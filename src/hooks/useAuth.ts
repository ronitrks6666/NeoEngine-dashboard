import { create } from 'zustand';
import type { AuthState, SuperAdmin, Owner, EmployeeUser } from '@/types/auth';
import {
  authApi,
  persistAuth,
  clearAuth,
  getStoredAuth,
  getApiErrorMessage,
} from '@/api/auth';
import {
  hasWebDashboardAccess,
  WEB_DASHBOARD_ACCESS_DENIED_MESSAGE,
} from '@/lib/webDashboardAccess';
import { useOutletStore } from '@/stores/outletStore';
import { syncEmployeeOutletStore } from '@/lib/employeeOutlets';

function getInitialState(): AuthState {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const impersonateToken = urlParams.get('impersonate_token');
    const impersonateUser = urlParams.get('impersonate_user');

    if (impersonateToken && impersonateUser) {
      try {
        const user = JSON.parse(decodeURIComponent(impersonateUser));
        persistAuth(impersonateToken, user, 'OWNER');
        return {
          user: user,
          role: 'OWNER',
          token: impersonateToken,
        };
      } catch {
        // ignore
      }
    }
  }

  const stored = getStoredAuth();
  if (stored) {
    return {
      user: stored.user as SuperAdmin | Owner | EmployeeUser,
      role: stored.role,
      token: stored.token,
      featurePermissions: stored.featurePermissions ?? null,
    };
  }
  return { user: null, role: null, token: null, featurePermissions: null };
}

export type MerchantLoginResult = {
  isFirstLogin: boolean;
  userType: 'OWNER' | 'EMPLOYEE';
};

interface AuthStore extends AuthState {
  loginAsSuperAdmin: (email: string, password: string) => Promise<void>;
  loginAsOwner: (identifier: string, password: string, isPhone?: boolean) => Promise<MerchantLoginResult>;
  loginAsOwnerWithOtp: (phone: string, otp: string) => Promise<MerchantLoginResult>;
  impersonateAsOwner: (ownerId: string) => Promise<{ token: string; owner: Owner }>;
  refreshSuperAdminProfile: () => Promise<void>;
  refreshEmployeeSession: () => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

function sessionFromMerchantResponse(res: Awaited<ReturnType<typeof authApi.merchantLogin>>) {
  const token = res.data?.token ?? res.token;
  if (!res.success || !token) {
    throw new Error(res.message || 'Login failed');
  }

  if (res.userType === 'EMPLOYEE') {
    if (!hasWebDashboardAccess(res.featurePermissions)) {
      throw new Error(WEB_DASHBOARD_ACCESS_DENIED_MESSAGE);
    }
    const emp = res.employee;
    if (!emp?.id) {
      throw new Error('Login failed');
    }
    const employee: EmployeeUser = {
      id: String(emp.id),
      name: emp.name,
      phone: emp.phone,
      outletId: emp.outletId ? String(emp.outletId) : undefined,
      outletName: emp.outletName ?? undefined,
      activeRoleId: emp.activeRoleId ? String(emp.activeRoleId) : undefined,
      roleLabel: res.role,
    };
    persistAuth(token, employee, 'EMPLOYEE', res.featurePermissions ?? null);
    void syncEmployeeOutletStore({
      outletId: employee.outletId,
      outletName: employee.outletName,
    });
    return {
      user: employee,
      role: 'EMPLOYEE' as const,
      token,
      isFirstLogin: res.isFirstLogin ?? false,
      featurePermissions: res.featurePermissions ?? null,
      userType: 'EMPLOYEE' as const,
    };
  }

  const ownerData = res.data?.owner ?? res.user;
  if (!ownerData) {
    throw new Error(res.message || 'Login failed');
  }
  const owner: Owner = {
    id: String(ownerData.id),
    name: ownerData.name,
    email: ownerData.email ?? '',
    phone: ownerData.phone ?? '',
  };
  persistAuth(token, owner, 'OWNER', null);
  return {
    user: owner,
    role: 'OWNER' as const,
    token,
    isFirstLogin: res.isFirstLogin ?? false,
    featurePermissions: null,
    userType: 'OWNER' as const,
  };
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
      featurePermissions: null,
    });
  },

  loginAsOwner: async (identifier: string, password: string, isPhone?: boolean) => {
    const payload = isPhone
      ? { phone: identifier, password }
      : { email: identifier, password };
    const res = await authApi.merchantLogin(payload);
    const session = sessionFromMerchantResponse(res);
    set({
      user: session.user,
      role: session.role,
      token: session.token,
      isFirstLogin: session.isFirstLogin,
      featurePermissions: session.featurePermissions,
    });
    return { isFirstLogin: session.isFirstLogin, userType: session.userType };
  },

  loginAsOwnerWithOtp: async (phone: string, otp: string) => {
    const res = await authApi.verifyOtp(phone, otp);
    const session = sessionFromMerchantResponse(res);
    set({
      user: session.user,
      role: session.role,
      token: session.token,
      isFirstLogin: session.isFirstLogin,
      featurePermissions: session.featurePermissions,
    });
    return { isFirstLogin: session.isFirstLogin, userType: session.userType };
  },

  impersonateAsOwner: async (ownerId: string) => {
    const { adminApi } = await import('@/api/admin');
    const res = await adminApi.impersonateOwner(ownerId);

    if (!res.success || !res.token || !res.user) {
      throw new Error('Impersonation failed');
    }

    const owner: Owner = {
      id: res.user.id,
      name: res.user.name,
      email: res.user.email ?? '',
      phone: res.user.phone ?? '',
    };

    return { token: res.token, owner };
  },

  refreshSuperAdminProfile: async () => {
    const state = useAuth.getState();
    if (state.role !== 'SUPER_ADMIN' || !state.token) return;
    try {
      const { adminApi } = await import('@/api/admin');
      const me = await adminApi.getMe();
      persistAuth(state.token, me, 'SUPER_ADMIN');
      set({ user: me as SuperAdmin });
    } catch {
      // ignore — stale profile ok
    }
  },

  refreshEmployeeSession: async () => {
    const state = useAuth.getState();
    if (state.role !== 'EMPLOYEE' || !state.token) return;
    try {
      const me = await authApi.getMe();
      if (me.userType !== 'EMPLOYEE' || !me.employee) return;
      if (!hasWebDashboardAccess(me.featurePermissions)) {
        clearAuth();
        useOutletStore.getState().clear();
        set({ user: null, role: null, token: null, featurePermissions: null });
        return;
      }
      const employee: EmployeeUser = {
        id: String(me.employee.id),
        name: me.employee.name,
        phone: me.employee.phone,
        outletId: me.employee.outletId ? String(me.employee.outletId) : undefined,
        outletName: me.employee.outletName ?? undefined,
        activeRoleId: me.employee.activeRoleId ? String(me.employee.activeRoleId) : undefined,
        roleLabel: me.role,
      };
      persistAuth(state.token, employee, 'EMPLOYEE', me.featurePermissions ?? null);
      await syncEmployeeOutletStore({
        outletId: employee.outletId,
        outletName: employee.outletName,
      });
      set({
        user: employee,
        featurePermissions: me.featurePermissions ?? null,
        isFirstLogin: me.isFirstLogin,
      });
    } catch {
      // ignore — stale session ok until next API 401
    }
  },

  logout: () => {
    clearAuth();
    useOutletStore.getState().clear();
    set({ user: null, role: null, token: null, featurePermissions: null });
  },

  hydrate: () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const impersonateToken = urlParams.get('impersonate_token');
      const impersonateUser = urlParams.get('impersonate_user');

      if (impersonateToken && impersonateUser) {
        try {
          const user = JSON.parse(decodeURIComponent(impersonateUser));
          persistAuth(impersonateToken, user, 'OWNER');
          set({
            user: user as Owner,
            role: 'OWNER',
            token: impersonateToken,
            featurePermissions: null,
          });
          return;
        } catch {
          // ignore
        }
      }
    }

    const stored = getStoredAuth();
    if (stored) {
      if (stored.role === 'EMPLOYEE') {
        const emp = stored.user as EmployeeUser;
        void syncEmployeeOutletStore({
          outletId: emp.outletId,
          outletName: emp.outletName,
        });
      }
      set({
        user: stored.user as SuperAdmin | Owner | EmployeeUser,
        role: stored.role,
        token: stored.token,
        featurePermissions: stored.featurePermissions ?? null,
      });
    }
  },
}));

export { getApiErrorMessage };
