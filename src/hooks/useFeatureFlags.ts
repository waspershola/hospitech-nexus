import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FeatureFlag {
  id: string;
  flag_key: string;
  flag_name: string;
  description?: string;
  enabled_globally: boolean;
  tenant_id?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export function useFeatureFlags() {
  const queryClient = useQueryClient();

  const { data: flags, isLoading, error } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('feature-flags', {
        method: 'GET',
      });

      if (error) throw error;
      return data as FeatureFlag[];
    },
  });

  const createFlag = useMutation({
    mutationFn: async (flagData: Partial<FeatureFlag>) => {
      const { data, error } = await supabase.functions.invoke('feature-flags', {
        method: 'POST',
        body: flagData,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success('Feature flag created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create feature flag');
    },
  });

  const updateFlag = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FeatureFlag> & { id: string }) => {
      const { data, error } = await supabase.functions.invoke(`feature-flags/${id}`, {
        method: 'PATCH',
        body: updates,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success('Feature flag updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update feature flag');
    },
  });

  const deleteFlag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke(`feature-flags/${id}`, {
        method: 'DELETE',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success('Feature flag deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete feature flag');
    },
  });

  // Helper function to check if a feature is enabled
  const isFeatureEnabled = (flagKey: string, tenantId?: string): boolean => {
    if (!flags) return false;

    const flag = flags.find((f: FeatureFlag) => f.flag_key === flagKey);
    if (!flag) return false;

    // Check if globally enabled
    if (flag.enabled_globally) return true;

    // Check if specifically enabled for tenant
    if (tenantId && flag.tenant_id === tenantId) return true;

    return false;
  };

  return {
    flags,
    isLoading,
    error,
    createFlag,
    updateFlag,
    deleteFlag,
    isFeatureEnabled,
  };
}
