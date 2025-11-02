import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StaffActivity {
  id: string;
  tenant_id: string;
  staff_id: string;
  department?: string;
  role?: string;
  action: string;
  entity?: string;
  entity_id?: string;
  description?: string;
  metadata?: any;
  timestamp: string;
}

export interface ActivityFilters {
  staff_id?: string;
  department?: string;
  action?: string;
  start_date?: string;
  end_date?: string;
}

export function useStaffActivity(filters?: ActivityFilters) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['staff-activity', tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from('staff_activity')
        .select('*, staff:staff_id(full_name, email)')
        .eq('tenant_id', tenantId!)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (filters?.staff_id) {
        query = query.eq('staff_id', filters.staff_id);
      }
      if (filters?.department) {
        query = query.eq('department', filters.department);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.start_date) {
        query = query.gte('timestamp', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('timestamp', filters.end_date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StaffActivity[];
    },
    enabled: !!tenantId,
  });
}
