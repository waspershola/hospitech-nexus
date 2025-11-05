import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PlatformPlan {
  id: string;
  name: string;
  monthly_price: number;
  included_sms: number;
  trial_days: number;
  feature_flags: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export function usePlatformPlans() {
  const queryClient = useQueryClient();

  // Fetch all plans
  const { data: plans, isLoading } = useQuery({
    queryKey: ['platform-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_plans')
        .select('*')
        .order('monthly_price', { ascending: true });

      if (error) throw error;
      return data as PlatformPlan[];
    },
  });

  // Create plan
  const createPlan = useMutation({
    mutationFn: async (planData: Omit<PlatformPlan, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('platform_plans')
        .insert([planData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Plan created successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
    },
    onError: (error: any) => {
      console.error('Create plan error:', error);
      toast.error(error.message || 'Failed to create plan');
    },
  });

  // Update plan
  const updatePlan = useMutation({
    mutationFn: async ({ id, ...planData }: Partial<PlatformPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('platform_plans')
        .update(planData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Plan updated successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
    },
    onError: (error: any) => {
      console.error('Update plan error:', error);
      toast.error(error.message || 'Failed to update plan');
    },
  });

  // Delete plan
  const deletePlan = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('platform_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Plan deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
    },
    onError: (error: any) => {
      console.error('Delete plan error:', error);
      toast.error(error.message || 'Failed to delete plan');
    },
  });

  // Assign plan to tenant
  const assignPlan = useMutation({
    mutationFn: async ({ tenantId, planId, applyProRata = false }: { 
      tenantId: string; 
      planId: string; 
      applyProRata?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('assign-plan', {
        method: 'POST',
        body: { tenant_id: tenantId, plan_id: planId, apply_pro_rata: applyProRata },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Plan assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
    },
    onError: (error: any) => {
      console.error('Assign plan error:', error);
      toast.error(error.message || 'Failed to assign plan');
    },
  });

  return {
    plans: plans || [],
    isLoading,
    createPlan,
    updatePlan,
    deletePlan,
    assignPlan,
  };
}
