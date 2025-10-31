import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FinanceProvider {
  id: string;
  tenant_id: string;
  name: string;
  type: 'pos' | 'online' | 'transfer' | 'cash' | 'credit_deferred';
  status: 'active' | 'inactive';
  fee_percent: number;
  fee_bearer: 'property' | 'guest';
  meta: Record<string, any>;
  created_at: string;
}

export function useFinanceProviders() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['finance-providers', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('finance_providers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as FinanceProvider[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (provider: Omit<FinanceProvider, 'id' | 'tenant_id' | 'created_at'>) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('finance_providers')
        .insert([{ ...provider, tenant_id: tenantId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-providers', tenantId] });
      toast.success('Provider added successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FinanceProvider> & { id: string }) => {
      const { data, error } = await supabase
        .from('finance_providers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-providers', tenantId] });
      toast.success('Provider updated successfully');
    },
  });

  return {
    providers: query.data ?? [],
    isLoading: query.isLoading,
    createProvider: createMutation.mutate,
    updateProvider: updateMutation.mutate,
  };
}
