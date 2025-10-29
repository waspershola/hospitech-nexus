import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FinanceLocation {
  id: string;
  tenant_id: string;
  name: string;
  department: string | null;
  provider_id: string | null;
  wallet_id: string | null;
  status: 'active' | 'inactive';
  created_by: string | null;
  created_at: string;
}

export function useFinanceLocations() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['finance-locations', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('finance_locations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as FinanceLocation[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (location: Omit<FinanceLocation, 'id' | 'tenant_id' | 'created_at'>) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('finance_locations')
        .insert([{ ...location, tenant_id: tenantId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-locations', tenantId] });
      toast.success('Location created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create location: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FinanceLocation> & { id: string }) => {
      const { data, error } = await supabase
        .from('finance_locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-locations', tenantId] });
      toast.success('Location updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update location: ${error.message}`);
    },
  });

  return {
    locations: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createLocation: createMutation.mutate,
    updateLocation: updateMutation.mutate,
  };
}
