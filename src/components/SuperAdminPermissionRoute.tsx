import { Navigate } from 'react-router-dom';
import { useSuperAdminPermissions } from '@/hooks/useSuperAdminPermissions';
import type { SuperAdminPermission } from '@/constants/superAdminPermissions';

interface Props {
  permission: SuperAdminPermission;
  children: React.ReactNode;
}

export function SuperAdminPermissionRoute({ permission, children }: Props) {
  const { can } = useSuperAdminPermissions();
  if (!can(permission)) {
    return <Navigate to="/super-admin/dashboard" replace />;
  }
  return <>{children}</>;
}
