import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { token, role, hydrate } = useAuth();
  const location = useLocation();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!token || !role) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    if (role === 'SUPER_ADMIN') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
    return <Navigate to="/owner/dashboard" replace />;
  }

  return <>{children}</>;
}
