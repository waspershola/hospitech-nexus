import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Permission {
  id: string;
  tenant_id: string;
  role: string;
  permission_key: string;
  allowed: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const PERMISSION_KEYS = {
  FINANCIAL: {
    'discount_over_10': 'Approve discounts over 10%',
    'process_refunds': 'Process refunds',
    'write_off_debt': 'Write off debts',
    'view_reports': 'View financial reports',
    'manage_payments': 'Manage payments',
  },
  BOOKING: {
    'allow_overbooking': 'Allow overbooking',
    'require_deposit': 'Require deposit on booking',
    'modify_rates': 'Modify room rates',
    'cancel_bookings': 'Cancel bookings',
  },
  DATA: {
    'access_guest_notes': 'Access guest notes',
    'export_data': 'Export data',
    'view_audit_logs': 'View audit logs',
  },
  ROOMS: {
    'manage_categories': 'Manage room categories',
    'override_status': 'Override room status',
    'assign_rooms': 'Assign rooms to guests',
  }
};

export function usePermissions() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['permissions', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_permissions')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (error) throw error;
      return data as Permission[];
    },
    enabled: !!tenantId,
  });

  const upsertPermissionMutation = useMutation({
    mutationFn: async ({ 
      role, 
      permission_key, 
      allowed 
    }: { 
      role: 'owner' | 'manager' | 'frontdesk' | 'housekeeping' | 'maintenance' | 'guest'; 
      permission_key: string; 
      allowed: boolean;
    }) => {
      const { error } = await supabase
        .from('hotel_permissions')
        .upsert([{
          tenant_id: tenantId,
          role,
          permission_key,
          allowed,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions', tenantId] });
      toast.success('Permission updated');
    },
    onError: (error) => {
      console.error('Failed to update permission:', error);
      toast.error('Failed to update permission');
    }
  });

  return {
    permissions: query.data || [],
    isLoading: query.isLoading,
    updatePermission: upsertPermissionMutation.mutate,
    isUpdating: upsertPermissionMutation.isPending,
  };
}
