import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AssignPlanRequest {
  tenant_id: string;
  plan_id: string;
}

export function useAssignPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenant_id, plan_id }: AssignPlanRequest) => {
      const { data, error } = await supabase
        .from('platform_tenants')
        .update({ plan_id })
        .eq('id', tenant_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-plan'] });
      toast.success('Plan assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign plan');
    },
  });
}
