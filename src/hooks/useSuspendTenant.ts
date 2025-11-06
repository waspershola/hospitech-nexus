import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SuspendTenantParams {
  tenantId: string;
  reason: string;
}

export function useSuspendTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, reason }: SuspendTenantParams) => {
      // Update platform_tenants status and reason
      const { error: updateError } = await supabase
        .from('platform_tenants')
        .update({ 
          status: 'suspended',
          suspension_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (updateError) throw updateError;

      // Send notification
      try {
        await supabase.functions.invoke('send-lifecycle-notification', {
          body: {
            tenant_id: tenantId,
            event_type: 'suspended',
            details: { reason }
          }
        });
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
        // Don't fail the suspension if notification fails
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      toast.success('Tenant suspended', {
        description: 'All users have been blocked from accessing the system'
      });
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['platform-tenant', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenant-activity', variables.tenantId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to suspend tenant');
    }
  });
}
