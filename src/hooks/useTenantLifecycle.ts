import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useTenantLifecycle() {
  const queryClient = useQueryClient();

  // Get all tenants with subscription info
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants-with-lifecycle'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*, tenant_subscriptions(*, platform_plans(name, slug)), user_roles(count)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Get lifecycle stats
  const { data: lifecycleStats, isLoading: statsLoading } = useQuery({
    queryKey: ['lifecycle-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('tenant-lifecycle', {
        body: {
          action: 'get_lifecycle_stats',
        },
      });

      if (error) throw error;
      return data.stats;
    },
  });

  // Activate tenant
  const activateTenant = useMutation({
    mutationFn: async (tenantId: string) => {
      const { data, error } = await supabase.functions.invoke('tenant-lifecycle', {
        body: {
          action: 'activate_tenant',
          tenant_id: tenantId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants-with-lifecycle'] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-stats'] });
      toast.success('Tenant activated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to activate tenant');
    },
  });

  // Suspend tenant
  const suspendTenant = useMutation({
    mutationFn: async ({ tenantId, reason }: { tenantId: string; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke('tenant-lifecycle', {
        body: {
          action: 'suspend_tenant',
          tenant_id: tenantId,
          tenant_data: { suspension_reason: reason },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants-with-lifecycle'] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-stats'] });
      toast.success('Tenant suspended');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to suspend tenant');
    },
  });

  // Deactivate tenant
  const deactivateTenant = useMutation({
    mutationFn: async (tenantId: string) => {
      const { data, error } = await supabase.functions.invoke('tenant-lifecycle', {
        body: {
          action: 'deactivate_tenant',
          tenant_id: tenantId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants-with-lifecycle'] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-stats'] });
      toast.success('Tenant deactivated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to deactivate tenant');
    },
  });

  return {
    tenants,
    lifecycleStats,
    isLoading: tenantsLoading || statsLoading,
    activateTenant,
    suspendTenant,
    deactivateTenant,
  };
}
