import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformRole } from './usePlatformRole';

export interface NavigationItem {
  id: string;
  tenant_id: string;
  name: string;
  path: string;
  icon: string;
  roles_allowed: string[];
  departments_allowed: string[];
  parent_id: string | null;
  order_index: number;
  is_active: boolean;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Platform-driven navigation hook with role + department filtering
 * Fetches navigation items from platform_nav_items via edge function
 * Supports tenant-specific overrides and global navigation
 */
export function useNavigation() {
  const { tenantId, role, department } = useAuth();
  const { platformRole } = usePlatformRole();
  
  return useQuery({
    queryKey: ['platform-navigation', tenantId, role, department, platformRole],
    queryFn: async () => {
      // Fetch navigation items via edge function
      console.log('Fetching navigation - platformRole:', platformRole, 'tenantId:', tenantId, 'role:', role, 'department:', department);

      const { data, error } = await supabase.functions.invoke('platform-nav-sync', {
        body: {},
        method: 'POST',
      });
      
      if (error) {
        console.error('Navigation fetch error:', error);
        throw error;
      }
      
      if (!data?.data) {
        console.warn('No navigation data received from edge function');
        throw new Error('No navigation data received');
      }
      
      const navItems = data.data as NavigationItem[];
      console.log('Received navigation items:', navItems.length);
      
      // Define platform roles and tenant roles
      const platformRoles = ['super_admin', 'admin', 'support_admin', 'billing_admin'];
      const tenantRoles = ['owner', 'manager', 'frontdesk', 'finance', 'accountant', 'housekeeping', 'maintenance', 'kitchen', 'bar', 'staff'];
      
      // Filter based on user's role type
      const filtered = navItems.filter(item => {
        // Check if this is a platform item (has platform roles in roles_allowed)
        const isPlatformItem = item.roles_allowed.some(r => platformRoles.includes(r));
        
        if (isPlatformItem) {
          // Platform item - check platform role
          const hasPlatformAccess = platformRole && item.roles_allowed.includes(platformRole);
          if (!hasPlatformAccess) {
            console.log(`Platform item ${item.name} filtered out - platform role mismatch. Required: ${item.roles_allowed}, User has: ${platformRole}`);
          }
          return hasPlatformAccess;
        } else {
          // Tenant item - check tenant role AND department
          const hasRole = role && item.roles_allowed.includes(role);
          if (!hasRole) {
            console.log(`Tenant item ${item.name} filtered out - role mismatch. Required: ${item.roles_allowed}, User has: ${role}`);
            return false;
          }
          
          // Check department access (empty array means visible to all departments)
          const allowedDepts = item.departments_allowed || [];
          const hasAccess = 
            allowedDepts.length === 0 || // All departments
            (department && allowedDepts.includes(department)); // Specific department match
          
          if (!hasAccess) {
            console.log(`Tenant item ${item.name} filtered out - department mismatch. Required: ${allowedDepts}, User has: ${department}`);
          }
          
          return hasAccess;
        }
      });
      
      console.log('Filtered navigation items:', filtered.length);
      return filtered;
    },
    enabled: !!platformRole || (!!tenantId && !!role),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}
