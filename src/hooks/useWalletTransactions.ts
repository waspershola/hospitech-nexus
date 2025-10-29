import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  payment_id: string | null;
  tenant_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export function useWalletTransactions(walletId?: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['wallet-transactions', tenantId, walletId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('wallet_transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (walletId) {
        query = query.eq('wallet_id', walletId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as WalletTransaction[];
    },
    enabled: !!tenantId,
  });
}
