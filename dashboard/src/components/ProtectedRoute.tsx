import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/lib/api';
import { UnauthorizedPage } from '@/pages/Unauthorized';

interface ProtectedRouteProps {
  permission?: string;
  roles?: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ permission, roles, children, fallback }: ProtectedRouteProps) {
  const { hasPermission, isRole } = useAuth();

  if (permission && !hasPermission(permission)) {
    return fallback ?? <UnauthorizedPage />;
  }
  if (roles?.length && !isRole(...roles)) {
    return fallback ?? <UnauthorizedPage />;
  }
  return <>{children}</>;
}
