import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES, PERMISSIONS, hasPermission as checkPermission, hasAnyPermission } from '@/lib/roles';

/**
 * Centralized role management hook
 * Provides role-checking utilities and permission validation
 * Now includes department awareness for staff hierarchy
 */
export function useRole() {
  const { role, user, tenantId } = useAuth();
  
  // Fetch staff information for department awareness
  const { data: staffInfo } = useQuery({
    queryKey: ['my-staff-info', user?.id, tenantId],
    queryFn: async () => {
      if (!user?.id || !tenantId) return null;
      
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .single();
      
      if (error) {
        console.error('Error fetching staff info:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id && !!tenantId,
  });
  
  return {
    role,
    user,
    tenantId,
    
    // Staff information
    staffInfo,
    department: staffInfo?.department,
    branch: staffInfo?.branch,
    
    // Check if user has specific role
    hasRole: (requiredRole: string) => role === requiredRole,
    
    // Check if user has any of the roles
    hasAnyRole: (allowedRoles: string[]) => role ? allowedRoles.includes(role) : false,
    
    // Check permission using lib/roles.ts
    can: (permission: readonly string[]) => checkPermission(role, permission),
    
    // Check if user has any of multiple permissions
    hasAnyPermission: (permissions: readonly string[][]) => hasAnyPermission(role, permissions),
    
    // Department checks
    isMyDepartment: (dept: string) => staffInfo?.department === dept,
    canManageDepartment: (dept: string) => {
      // Owners and managers can manage all departments
      if (role === ROLES.OWNER || role === ROLES.MANAGER) return true;
      // Supervisors can only manage their own department
      if (role === ROLES.SUPERVISOR) return staffInfo?.department === dept;
      return false;
    },
    
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
    isStoreManager: role === ROLES.STORE_MANAGER,
    isProcurement: role === ROLES.PROCUREMENT,
    
    // Helper for conditional rendering
    roleIn: (...allowedRoles: string[]) => role ? allowedRoles.includes(role) : false,
  };
}
