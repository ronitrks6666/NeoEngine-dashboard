import { useAuth } from '@/hooks/useAuth';
import type { SuperAdmin } from '@/types/auth';
import type { SuperAdminPermission } from '@/constants/superAdminPermissions';

export function useSuperAdminPermissions() {
  const { user, role } = useAuth();
  const admin = role === 'SUPER_ADMIN' ? (user as SuperAdmin) : null;
  const isPrimary = admin?.role !== 'SUB';
  const permissions = admin?.permissions ?? [];

  const can = (perm: SuperAdminPermission) => {
    if (role !== 'SUPER_ADMIN' || !admin) return false;
    if (isPrimary) return true;
    return permissions.includes(perm);
  };

  const canAny = (perms: SuperAdminPermission[]) => perms.some((p) => can(p));

  return { can, canAny, isPrimary, permissions, admin };
}
