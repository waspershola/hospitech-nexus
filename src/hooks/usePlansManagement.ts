import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePlansManagement() {
  const queryClient = useQueryClient();

  // Get all plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['platform-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Get all subscriptions
  const { data: subscriptions, isLoading: subscriptionsLoading } = useQuery({
    queryKey: ['tenant-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_subscriptions')
        .select('*, platform_plans(*), tenants(name, slug)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Create plan
  const createPlan = useMutation({
    mutationFn: async (planData: any) => {
      const { data, error } = await supabase.functions.invoke('manage-plans', {
        body: {
          action: 'create_plan',
          plan_data: planData,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
      toast.success('Plan created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create plan');
    },
  });

  // Update plan
  const updatePlan = useMutation({
    mutationFn: async ({ planId, planData }: { planId: string; planData: any }) => {
      const { data, error } = await supabase.functions.invoke('manage-plans', {
        body: {
          action: 'update_plan',
          plan_id: planId,
          plan_data: planData,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
      toast.success('Plan updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update plan');
    },
  });

  // Assign plan to tenant
  const assignPlan = useMutation({
    mutationFn: async ({ tenantId, planId, billingCycle }: { tenantId: string; planId: string; billingCycle?: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-plans', {
        body: {
          action: 'assign_plan',
          tenant_id: tenantId,
          plan_id: planId,
          subscription_data: { billing_cycle: billingCycle || 'monthly' },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-subscriptions'] });
      toast.success('Plan assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign plan');
    },
  });

  // Update subscription
  const updateSubscription = useMutation({
    mutationFn: async ({ tenantId, subscriptionData }: { tenantId: string; subscriptionData: any }) => {
      const { data, error } = await supabase.functions.invoke('manage-plans', {
        body: {
          action: 'update_subscription',
          tenant_id: tenantId,
          subscription_data: subscriptionData,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-subscriptions'] });
      toast.success('Subscription updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update subscription');
    },
  });

  return {
    plans,
    subscriptions,
    isLoading: plansLoading || subscriptionsLoading,
    createPlan,
    updatePlan,
    assignPlan,
    updateSubscription,
  };
}

// Hook for checking plan limits
export function usePlanLimits(tenantId?: string) {
  return useQuery({
    queryKey: ['plan-limits', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('tenant_subscriptions')
        .select('*, platform_plans(*)')
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;

      const limits = data?.platform_plans?.limits || {};
      const features = data?.platform_plans?.features || {};

      return {
        subscription: data,
        limits,
        features,
        planName: data?.platform_plans?.name || 'No Plan',
        status: data?.status,
      };
    },
    enabled: !!tenantId,
  });
}
