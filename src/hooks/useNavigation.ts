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
 * Database-driven navigation hook with role + department filtering
 * Fetches navigation items based on user's tenant, role, and department
 */
export function useNavigation() {
  const { tenantId, role, department } = useAuth();
  
  return useQuery({
    queryKey: ['navigation', tenantId, role, department],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('navigation_items')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      
      // Filter by role AND department
      const filtered = (data as NavigationItem[]).filter(item => {
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
  });
}
