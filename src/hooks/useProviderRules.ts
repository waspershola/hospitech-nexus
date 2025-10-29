import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProviderRule {
  id: string;
  tenant_id: string;
  provider_id: string;
  location_id: string | null;
  department: string | null;
  auto_reconcile: boolean;
  max_txn_limit: number | null;
  created_by: string | null;
  created_at: string;
}

export function useProviderRules() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['provider-rules', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('finance_provider_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ProviderRule[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (rule: Omit<ProviderRule, 'id' | 'tenant_id' | 'created_at'>) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('finance_provider_rules')
        .insert([{ ...rule, tenant_id: tenantId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-rules', tenantId] });
      toast.success('Provider rule created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create rule: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProviderRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('finance_provider_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-rules', tenantId] });
      toast.success('Rule updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update rule: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('finance_provider_rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-rules', tenantId] });
      toast.success('Rule deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete rule: ${error.message}`);
    },
  });

  return {
    rules: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createRule: createMutation.mutate,
    updateRule: updateMutation.mutate,
    deleteRule: deleteMutation.mutate,
  };
}
