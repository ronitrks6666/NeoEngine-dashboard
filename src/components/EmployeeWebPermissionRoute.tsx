import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  getDefaultEmployeeDashboardPath,
  hasOwnerRouteAccess,
} from '@/lib/webDashboardAccess';

interface EmployeeWebPermissionRouteProps {
  children: React.ReactNode;
  routePath: string;
}

export function EmployeeWebPermissionRoute({
  children,
  routePath,
}: EmployeeWebPermissionRouteProps) {
  const { role, featurePermissions } = useAuth();

  if (role === 'OWNER') {
    return <>{children}</>;
  }

  if (role === 'EMPLOYEE' && !hasOwnerRouteAccess(routePath, featurePermissions, role)) {
    return (
      <Navigate to={getDefaultEmployeeDashboardPath(featurePermissions)} replace />
    );
  }

  return <>{children}</>;
}
