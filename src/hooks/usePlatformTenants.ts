import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePlatformTenants() {
  const queryClient = useQueryClient();

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['platform-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data separately
      const enriched = await Promise.all(
        (data || []).map(async (tenant) => {
          const [creditPool, assignments] = await Promise.all([
            supabase
              .from('platform_sms_credit_pool')
              .select('*')
              .eq('tenant_id', tenant.id)
              .maybeSingle(),
            supabase
              .from('tenant_provider_assignments')
              .select('*, provider:platform_sms_providers(*)')
              .eq('tenant_id', tenant.id),
          ]);

          return {
            ...tenant,
            credit_pool: creditPool.data,
            provider_assignments: assignments.data || [],
          };
        })
      );

      return enriched;
    },
  });

  const createTenant = useMutation({
    mutationFn: async (tenantData: {
      hotel_name: string;
      owner_email: string;
      owner_password?: string;
      plan_id: string;
      domain?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('tenant-management/create', {
        body: tenantData,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      toast.success('Tenant created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create tenant');
    },
  });

  const updateTenantPlan = useMutation({
    mutationFn: async ({
      id,
      plan_id,
    }: {
      id: string;
      plan_id: string;
    }) => {
      const { data, error } = await supabase
        .from('platform_tenants')
        .update({ plan_id })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      toast.success('Tenant plan updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update tenant plan');
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
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      toast.success('Tenant suspended');
    },
    onError: (error: any) => {
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
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      toast.success('Tenant activated');
    },
    onError: (error: any) => {
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
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      toast.success('Tenant deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete tenant');
    },
  });

  const assignProvider = useMutation({
    mutationFn: async ({
      tenant_id,
      provider_id,
      sender_id,
      is_default = true,
    }: {
      tenant_id: string;
      provider_id: string;
      sender_id: string;
      is_default?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('tenant_provider_assignments')
        .insert({
          tenant_id,
          provider_id,
          sender_id,
          is_default,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      toast.success('Provider assigned to tenant');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign provider');
    },
  });

  const addCredits = useMutation({
    mutationFn: async ({
      tenant_id,
      credits,
      reference,
    }: {
      tenant_id: string;
      credits: number;
      reference?: string;
    }) => {
      // Get current pool
      const { data: pool } = await supabase
        .from('platform_sms_credit_pool')
        .select('*')
        .eq('tenant_id', tenant_id)
        .maybeSingle();

      const currentTotal = pool?.total_credits || 0;
      const currentConsumed = pool?.consumed_credits || 0;

      const { data, error } = await supabase
        .from('platform_sms_credit_pool')
        .upsert({
          tenant_id,
          total_credits: currentTotal + credits,
          consumed_credits: currentConsumed,
          last_topup_at: new Date().toISOString(),
          billing_reference: reference,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      toast.success('Credits added successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add credits');
    },
  });

  return {
    tenants,
    isLoading,
    createTenant,
    updateTenantPlan,
    suspendTenant,
    activateTenant,
    deleteTenant,
    assignProvider,
    addCredits,
  };
}
