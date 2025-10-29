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
      
      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([{ ...org, tenant_id: tenantId }])
        .select()
        .single();
      
      if (orgError) throw orgError;
      
      // Auto-create organization wallet
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .insert([{
          tenant_id: tenantId,
          wallet_type: 'organization',
          owner_id: orgData.id,
          name: `${orgData.name} Wallet`,
          currency: 'NGN',
        }])
        .select()
        .single();
      
      if (walletError) throw walletError;
      
      // Link wallet back to organization
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ wallet_id: walletData.id })
        .eq('id', orgData.id);
      
      if (updateError) throw updateError;
      
      return { ...orgData, wallet_id: walletData.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['wallets', tenantId] });
      toast.success('Organization and wallet created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create organization: ${error.message}`);
    },
  });

  return {
    organizations: query.data ?? [],
    isLoading: query.isLoading,
    createOrganization: createMutation.mutate,
  };
}
