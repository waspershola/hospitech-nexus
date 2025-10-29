import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Wallet {
  id: string;
  tenant_id: string;
  wallet_type: 'guest' | 'department' | 'organization';
  owner_id: string | null;
  name: string | null;
  department: string | null;
  balance: number;
  currency: string;
  last_transaction_at: string | null;
  created_at: string;
}

export function useWallets(walletType?: string, ownerId?: string) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['wallets', tenantId, walletType, ownerId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('wallets')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (walletType) {
        query = query.eq('wallet_type', walletType);
      }
      
      if (ownerId) {
        query = query.eq('owner_id', ownerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Wallet[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (wallet: Omit<Wallet, 'id' | 'tenant_id' | 'created_at' | 'balance' | 'last_transaction_at'>) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('wallets')
        .insert([{ ...wallet, tenant_id: tenantId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets', tenantId] });
      toast.success('Wallet created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create wallet: ${error.message}`);
    },
  });

  return {
    wallets: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createWallet: createMutation.mutate,
  };
}
