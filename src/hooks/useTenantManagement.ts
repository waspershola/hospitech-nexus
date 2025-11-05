import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateTenantData {
  hotel_name: string;
  owner_email: string;
  plan_id: string;
  domain?: string;
}

export function useTenantManagement() {
  const queryClient = useQueryClient();

  const createTenant = useMutation({
    mutationFn: async (data: CreateTenantData) => {
      const { data: result, error } = await supabase.functions.invoke('tenant-management/create', {
        method: 'POST',
        body: data,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      toast.success('Tenant created successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      
      // Trigger onboarding
      onboardTenant.mutate(data.tenant.id);
    },
    onError: (error: any) => {
      console.error('Create tenant error:', error);
      toast.error(error.message || 'Failed to create tenant');
    },
  });

  const updateTenant = useMutation({
    mutationFn: async ({ tenantId, updates }: { tenantId: string; updates: any }) => {
      const { data, error } = await supabase.functions.invoke(`tenant-management/${tenantId}`, {
        method: 'PATCH',
        body: updates,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Tenant updated successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
    },
    onError: (error: any) => {
      console.error('Update tenant error:', error);
      toast.error(error.message || 'Failed to update tenant');
    },
  });

  const suspendTenant = useMutation({
    mutationFn: async (tenantId: string) => {
      const { data, error } = await supabase.functions.invoke(`tenant-management/${tenantId}/suspend`, {
        method: 'POST',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Tenant suspended');
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
    },
    onError: (error: any) => {
      console.error('Suspend tenant error:', error);
      toast.error(error.message || 'Failed to suspend tenant');
    },
  });

  const activateTenant = useMutation({
    mutationFn: async (tenantId: string) => {
      const { data, error } = await supabase.functions.invoke(`tenant-management/${tenantId}/activate`, {
        method: 'POST',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Tenant activated');
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
    },
    onError: (error: any) => {
      console.error('Activate tenant error:', error);
      toast.error(error.message || 'Failed to activate tenant');
    },
  });

  const deleteTenant = useMutation({
    mutationFn: async (tenantId: string) => {
      const { data, error } = await supabase.functions.invoke(`tenant-management/${tenantId}`, {
        method: 'DELETE',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Tenant deleted');
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
    },
    onError: (error: any) => {
      console.error('Delete tenant error:', error);
      toast.error(error.message || 'Failed to delete tenant');
    },
  });

  const onboardTenant = useMutation({
    mutationFn: async (tenantId: string) => {
      const { data, error } = await supabase.functions.invoke('onboard-tenant', {
        method: 'POST',
        body: { tenant_id: tenantId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Tenant onboarded successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
    },
    onError: (error: any) => {
      console.error('Onboard tenant error:', error);
      toast.error(error.message || 'Failed to onboard tenant');
    },
  });

  return {
    createTenant,
    updateTenant,
    suspendTenant,
    activateTenant,
    deleteTenant,
    onboardTenant,
  };
}
