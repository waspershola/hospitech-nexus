import { useMutation, useQuery } from '@tanstack/react-query';
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
  description: string;
  metadata?: any;
  timestamp: string;
}

interface LogActivityParams {
  staff_id: string;
  action: string;
  description: string;
  department?: string;
  role?: string;
  entity?: string;
  entity_id?: string;
  metadata?: Record<string, any>;
}

interface ActivityFilters {
  staff_id?: string;
  department?: string;
  action?: string;
}

/**
 * Hook for fetching staff activities
 * Used to display activity logs with filtering
 */
export function useStaffActivities(filters?: ActivityFilters) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['staff-activities', tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from('staff_activity')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (filters?.staff_id) {
        query = query.eq('staff_id', filters.staff_id);
      }
      if (filters?.department && filters.department !== 'all') {
        query = query.eq('department', filters.department);
      }
      if (filters?.action && filters.action !== 'all') {
        query = query.eq('action', filters.action);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StaffActivity[];
    },
    enabled: !!tenantId,
  });
}

/**
 * Hook for logging staff activities
 * Used to track all staff-related actions for audit trail
 */
export function useLogStaffActivity() {
  const { tenantId, user } = useAuth();

  const logActivity = useMutation({
    mutationFn: async (params: LogActivityParams) => {
      if (!tenantId || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('staff_activity')
        .insert({
          tenant_id: tenantId,
          staff_id: params.staff_id,
          department: params.department,
          role: params.role,
          action: params.action,
          entity: params.entity,
          entity_id: params.entity_id,
          description: params.description,
          metadata: params.metadata,
        })
        .select()
        .single();

      if (error) {
        console.error('Error logging activity:', error);
        // Don't throw - we don't want to fail the main operation if logging fails
        return null;
      }

      return data;
    },
  });

  return {
    logActivity: logActivity.mutateAsync,
    isLogging: logActivity.isPending,
  };
}
