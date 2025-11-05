import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NavigationItem {
  id: string;
  tenant_id: string;
  name: string;
  path: string;
  icon: string;
  allowed_roles: string[];
  allowed_departments: string[];
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
  
  return useQuery({
    queryKey: ['platform-navigation', tenantId, role, department],
    queryFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant ID required for navigation');
      }

      console.log('Fetching navigation for tenant:', tenantId, 'role:', role, 'department:', department);

      // Call platform navigation sync edge function with query params
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
      
      // Filter by role AND department on client side
      const filtered = navItems.filter(item => {
        // Check role access
        const hasRole = role && item.allowed_roles.includes(role);
        if (!hasRole) {
          console.log(`Item ${item.name} filtered out - role mismatch. Required: ${item.allowed_roles}, User has: ${role}`);
          return false;
        }
        
        // Check department access
        // Empty array means visible to all departments
        const allowedDepts = item.allowed_departments || [];
        const hasAccess = 
          allowedDepts.length === 0 || // All departments
          (department && allowedDepts.includes(department)); // Specific department match
        
        if (!hasAccess) {
          console.log(`Item ${item.name} filtered out - department mismatch. Required: ${allowedDepts}, User has: ${department}`);
        }
        
        return hasAccess;
      });
      
      console.log('Filtered navigation items:', filtered.length);
      return filtered;
    },
    enabled: !!tenantId && !!role,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}
