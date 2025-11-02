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
  parent_id: string | null;
  order_index: number;
  is_active: boolean;
}

/**
 * Database-driven navigation hook
 * Fetches navigation items based on user's tenant and role
 */
export function useNavigation() {
  const { tenantId, role } = useAuth();
  
  return useQuery({
    queryKey: ['navigation', tenantId, role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('navigation_items')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      
      // Filter by role
      const filtered = (data as NavigationItem[]).filter(item => 
        role && item.allowed_roles.includes(role)
      );
      
      return filtered;
    },
    enabled: !!tenantId && !!role,
  });
}
