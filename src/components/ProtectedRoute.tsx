import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types/auth';
import { getDefaultEmployeeDashboardPath } from '@/lib/webDashboardAccess';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  loginPath?: string;
}

export function ProtectedRoute({ children, allowedRoles, loginPath = '/login' }: ProtectedRouteProps) {
  const { token, role, featurePermissions, hydrate } = useAuth();
  const location = useLocation();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!token || !role) {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    if (role === 'SUPER_ADMIN') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
    if (role === 'EMPLOYEE') {
      return <Navigate to={getDefaultEmployeeDashboardPath(featurePermissions)} replace />;
    }
    return <Navigate to="/owner/dashboard" replace />;
  }

  return <>{children}</>;
}
