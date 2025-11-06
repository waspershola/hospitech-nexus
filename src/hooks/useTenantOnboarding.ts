import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useTenantOnboarding(tenantId?: string) {
  const queryClient = useQueryClient();

  // Fetch onboarding status
  const { data: onboarding, isLoading: onboardingLoading } = useQuery({
    queryKey: ['tenant-onboarding', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('tenant_onboarding')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore not found
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch onboarding tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tenant-onboarding-tasks', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('tenant_onboarding_tasks')
        .select('*')
        .order('sort_order', { ascending: true });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Initialize onboarding
  const initializeOnboarding = useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase.rpc('initialize_tenant_onboarding', {
        p_tenant_id: tenantId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-onboarding'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-onboarding-tasks'] });
      toast.success('Onboarding initialized');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to initialize onboarding');
    },
  });

  // Complete a task
  const completeTask = useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId?: string }) => {
      const { error } = await supabase
        .from('tenant_onboarding_tasks')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          completed_by: userId,
        })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-onboarding-tasks'] });
      toast.success('Task completed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete task');
    },
  });

  // Update onboarding status
  const updateOnboardingStatus = useMutation({
    mutationFn: async ({ 
      tenantId, 
      status, 
      currentStep 
    }: { 
      tenantId: string; 
      status: string; 
      currentStep?: number 
    }) => {
      const updates: any = { status };
      
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
      
      if (currentStep !== undefined) {
        updates.current_step = currentStep;
      }

      const { error } = await supabase
        .from('tenant_onboarding')
        .update(updates)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-onboarding'] });
      toast.success('Onboarding updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update onboarding');
    },
  });

  // Calculate progress
  const progress = tasks ? {
    total: tasks.length,
    completed: tasks.filter(t => t.is_completed).length,
    percentage: Math.round((tasks.filter(t => t.is_completed).length / tasks.length) * 100),
    requiredCompleted: tasks.filter(t => t.is_required && t.is_completed).length,
    requiredTotal: tasks.filter(t => t.is_required).length,
  } : null;

  return {
    onboarding,
    tasks,
    progress,
    isLoading: onboardingLoading || tasksLoading,
    initializeOnboarding,
    completeTask,
    updateOnboardingStatus,
  };
}
