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

      // Call platform navigation sync edge function
      const { data, error } = await supabase.functions.invoke('platform-nav-sync', {
        method: 'GET',
        body: { tenant_id: tenantId },
      });
      
      if (error) throw error;
      if (!data?.data) throw new Error('No navigation data received');
      
      const navItems = data.data as NavigationItem[];
      
      // Filter by role AND department on client side
      const filtered = navItems.filter(item => {
        // Check role access
        const hasRole = role && item.allowed_roles.includes(role);
        if (!hasRole) return false;
        
        // Check department access
        // Empty array means visible to all departments
        const allowedDepts = item.allowed_departments || [];
        const hasAccess = 
          allowedDepts.length === 0 || // All departments
          (department && allowedDepts.includes(department)); // Specific department match
        
        return hasAccess;
      });
      
      return filtered;
    },
    enabled: !!tenantId && !!role,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}
