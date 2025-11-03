import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getNavigationForRole, getDefaultDashboard, canAccessPath } from '@/lib/roleNavigation';

/**
 * Hook to get role-based navigation and dashboard routing
 */
export function useRoleNavigation() {
  const { role, department } = useAuth();

  const navigation = useMemo(() => {
    if (!role) return [];
    return getNavigationForRole(role, department || undefined);
  }, [role, department]);

  const defaultDashboard = useMemo(() => {
    if (!role) return '/dashboard';
    return getDefaultDashboard(role, department || undefined);
  }, [role, department]);

  const hasAccessToPath = (path: string) => {
    if (!role) return false;
    return canAccessPath(path, role, department || undefined);
  };

  return {
    navigation,
    defaultDashboard,
    hasAccessToPath,
  };
}
