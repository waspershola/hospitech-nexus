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
      
      // First get transactions with payment/booking/room/guest data
      let query = supabase
        .from('wallet_transactions')
        .select(`
          *,
          payment:payments(
            booking:bookings(
              room:rooms(number),
              guest:guests(name)
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (walletId) {
        query = query.eq('wallet_id', walletId);
      }
      
      const { data: transactions, error } = await query;
      if (error) throw error;

      // Fetch profiles for created_by users
      const createdByIds = [...new Set(transactions?.map(t => t.created_by).filter(Boolean))] as string[];
      
      let profiles: any = {};
      if (createdByIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', createdByIds);
        
        profiles = Object.fromEntries(
          (profilesData || []).map(p => [p.id, p.full_name])
        );
      }

      // Merge profile data into transactions
      return transactions?.map(txn => ({
        ...txn,
        created_by_name: txn.created_by ? profiles[txn.created_by] : null,
      }));
    },
    enabled: !!tenantId,
  });
}
