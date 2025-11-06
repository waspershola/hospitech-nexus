import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Plan {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  price_monthly: number;
  price_yearly: number;
  limits?: Record<string, any>;
  features?: string[];
  is_active: boolean;
  is_public?: boolean;
  trial_days: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function usePlatformPlans() {
  const queryClient = useQueryClient();

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['platform-plans'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-plans', {
        method: 'GET',
      });

      if (error) throw error;
      return data as Plan[];
    },
  });

  const createPlan = useMutation({
    mutationFn: async (planData: Partial<Plan>) => {
      const { data, error } = await supabase.functions.invoke('manage-plans', {
        method: 'POST',
        body: planData,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
      toast.success('Plan created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create plan');
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Plan> & { id: string }) => {
      const { data, error } = await supabase.functions.invoke(`manage-plans/${id}`, {
        method: 'PATCH',
        body: updates,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
      toast.success('Plan updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update plan');
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke(`manage-plans/${id}`, {
        method: 'DELETE',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
      toast.success('Plan deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete plan');
    },
  });

  return {
    plans,
    isLoading,
    error,
    createPlan,
    updatePlan,
    deletePlan,
  };
}
