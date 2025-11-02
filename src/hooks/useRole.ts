import { useAuth } from '@/contexts/AuthContext';
import { ROLES, PERMISSIONS, hasPermission as checkPermission, hasAnyPermission } from '@/lib/roles';

/**
 * Centralized role management hook
 * Provides role-checking utilities and permission validation
 */
export function useRole() {
  const { role, user, tenantId } = useAuth();
  
  return {
    role,
    user,
    tenantId,
    
    // Check if user has specific role
    hasRole: (requiredRole: string) => role === requiredRole,
    
    // Check if user has any of the roles
    hasAnyRole: (allowedRoles: string[]) => role ? allowedRoles.includes(role) : false,
    
    // Check permission using lib/roles.ts
    can: (permission: readonly string[]) => checkPermission(role, permission),
    
    // Check if user has any of multiple permissions
    hasAnyPermission: (permissions: readonly string[][]) => hasAnyPermission(role, permissions),
    
    // Role metadata for quick checks
    isOwner: role === ROLES.OWNER,
    isManager: role === ROLES.MANAGER,
    isFrontDesk: role === ROLES.FRONTDESK,
    isHousekeeping: role === ROLES.HOUSEKEEPING,
    isFinance: role === ROLES.FINANCE,
    isMaintenance: role === ROLES.MAINTENANCE,
    isRestaurant: role === ROLES.RESTAURANT,
    isBar: role === ROLES.BAR,
    isAccountant: role === ROLES.ACCOUNTANT,
    isSupervisor: role === ROLES.SUPERVISOR,
    
    // Helper for conditional rendering
    roleIn: (...allowedRoles: string[]) => role ? allowedRoles.includes(role) : false,
  };
}
