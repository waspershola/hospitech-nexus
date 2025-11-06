import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSoftDelete() {
  const queryClient = useQueryClient();

  const softDeleteTenant = useMutation({
    mutationFn: async (tenantId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('soft_delete_tenant', {
        _tenant_id: tenantId,
        _deleted_by: user.id
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete tenant');
      }
      
      return result;
    },
    onSuccess: () => {
      toast.success('Tenant moved to trash', {
        description: 'The tenant can be restored later if needed'
      });
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete tenant');
    }
  });

  const restoreTenant = useMutation({
    mutationFn: async (tenantId: string) => {
      const { data, error } = await supabase.rpc('restore_tenant', {
        _tenant_id: tenantId
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to restore tenant');
      }
      
      return result;
    },
    onSuccess: () => {
      toast.success('Tenant restored successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-tenants'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to restore tenant');
    }
  });

  return {
    softDeleteTenant,
    restoreTenant
  };
}
