import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Organization {
  id: string;
  tenant_id: string;
  name: string;
  contact_person: string | null;
  contact_email: string | null;
  wallet_id: string | null;
  credit_limit: number;
  allow_negative_balance: boolean;
  active: boolean;
  created_at: string;
}

export function useOrganizations() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['organizations', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');
      
      if (error) throw error;
      return data as Organization[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (org: Omit<Organization, 'id' | 'tenant_id' | 'created_at'>) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('organizations')
        .insert([{ ...org, tenant_id: tenantId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', tenantId] });
      toast.success('Organization created successfully');
    },
  });

  return {
    organizations: query.data ?? [],
    isLoading: query.isLoading,
    createOrganization: createMutation.mutate,
  };
}
