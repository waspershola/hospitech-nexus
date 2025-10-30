import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface FinanceKPIs {
  totalInflow: number;
  totalOutflow: number;
  netBalance: number;
  pendingReceivables: { count: number; total: number };
  activeCreditWallets: { count: number; total: number };
}

export interface TransactionFeedItem {
  id: string;
  created_at: string;
  type: 'credit' | 'debit';
  amount: number;
  balance_after: number | null;
  description: string | null;
  department: string | null;
  source: string;
  wallet_id: string;
  payment_id: string | null;
  created_by: string | null;
  created_by_name?: string;
  guest_name?: string;
  org_name?: string;
  provider_name?: string;
  room_number?: string;
}

export interface ProviderBreakdown {
  provider_name: string;
  transaction_count: number;
  total_inflow: number;
  total_outflow: number;
  net_balance: number;
}

export function useFinanceOverview(dateRange?: { start: Date; end: Date }) {
  const { tenantId } = useAuth();

  // Today's KPIs
  const kpis = useQuery<FinanceKPIs>({
    queryKey: ['finance-overview-kpis', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      // Get today's transactions
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: txns } = await supabase
        .from('wallet_transactions')
        .select('type, amount')
        .eq('tenant_id', tenantId)
        .gte('created_at', startOfDay.toISOString());

      const totalInflow = txns?.filter(t => t.type === 'credit').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const totalOutflow = txns?.filter(t => t.type === 'debit').reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Get pending receivables
      const { data: receivables } = await supabase
        .from('receivables')
        .select('amount')
        .eq('tenant_id', tenantId)
        .eq('status', 'open');

      const pendingReceivables = {
        count: receivables?.length || 0,
        total: receivables?.reduce((sum, r) => sum + Number(r.amount), 0) || 0
      };

      // Get active credit wallets
      const { data: wallets } = await supabase
        .from('wallets')
        .select('balance')
        .eq('tenant_id', tenantId)
        .gt('balance', 0);

      const activeCreditWallets = {
        count: wallets?.length || 0,
        total: wallets?.reduce((sum, w) => sum + Number(w.balance), 0) || 0
      };

      return {
        totalInflow,
        totalOutflow,
        netBalance: totalInflow - totalOutflow,
        pendingReceivables,
        activeCreditWallets
      };
    },
    enabled: !!tenantId,
    refetchInterval: 30000 // Refresh every 30s
  });

  // Transaction Feed with real-time updates
  const transactionFeed = useQuery<TransactionFeedItem[]>({
    queryKey: ['finance-transaction-feed', tenantId, dateRange],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('wallet_transactions')
        .select(`
          *,
          payment:payments(
            method_provider,
            booking:bookings(
              room:rooms(number),
              guest:guests(name),
              organization:organizations(name)
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data: transactions, error } = await query;
      if (error) throw error;

      // Fetch user profiles for created_by
      const createdByIds = [...new Set(transactions?.map(t => t.created_by).filter(Boolean))] as string[];
      let profiles: Record<string, string> = {};

      if (createdByIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', createdByIds);

        profiles = Object.fromEntries(
          (profilesData || []).map(p => [p.id, p.full_name || 'Unknown'])
        );
      }

      // Map and enrich transaction data
      return transactions?.map(txn => ({
        id: txn.id,
        created_at: txn.created_at,
        type: txn.type as 'credit' | 'debit',
        amount: txn.amount,
        balance_after: txn.balance_after,
        description: txn.description,
        department: txn.department,
        source: txn.source,
        wallet_id: txn.wallet_id,
        payment_id: txn.payment_id,
        created_by: txn.created_by,
        created_by_name: txn.created_by ? profiles[txn.created_by] : null,
        guest_name: (txn.payment as any)?.booking?.guest?.name,
        org_name: (txn.payment as any)?.booking?.organization?.name,
        room_number: (txn.payment as any)?.booking?.room?.number,
        provider_name: (txn.payment as any)?.method_provider
      })) || [];
    },
    enabled: !!tenantId
  });

  // Provider Breakdown
  const providerBreakdown = useQuery<ProviderBreakdown[]>({
    queryKey: ['finance-provider-breakdown', tenantId, dateRange],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('wallet_transactions')
        .select(`
          type,
          amount,
          payment:payments(method_provider)
        `)
        .eq('tenant_id', tenantId);

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by provider
      const providerMap = new Map<string, ProviderBreakdown>();

      data?.forEach(txn => {
        const provider = (txn.payment as any)?.method_provider || 'Unknown';
        
        if (!providerMap.has(provider)) {
          providerMap.set(provider, {
            provider_name: provider,
            transaction_count: 0,
            total_inflow: 0,
            total_outflow: 0,
            net_balance: 0
          });
        }

        const item = providerMap.get(provider)!;
        item.transaction_count++;

        if (txn.type === 'credit') {
          item.total_inflow += Number(txn.amount);
        } else {
          item.total_outflow += Number(txn.amount);
        }

        item.net_balance = item.total_inflow - item.total_outflow;
      });

      return Array.from(providerMap.values()).sort((a, b) => b.net_balance - a.net_balance);
    },
    enabled: !!tenantId
  });

  // Real-time subscription
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('finance-transactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          // Invalidate queries to refetch
          kpis.refetch();
          transactionFeed.refetch();
          providerBreakdown.refetch();

          // Show toast for significant transactions
          const amount = Number(payload.new.amount);
          if (amount >= 10000) {
            const type = payload.new.type === 'credit' ? '💰' : '💸';
            toast.success(
              `${type} New ${payload.new.type} transaction`,
              {
                description: `₦${amount.toLocaleString()} - ${payload.new.description || 'No description'}`
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  return {
    kpis: kpis.data,
    kpisLoading: kpis.isLoading,
    transactionFeed: transactionFeed.data || [],
    transactionFeedLoading: transactionFeed.isLoading,
    providerBreakdown: providerBreakdown.data || [],
    providerBreakdownLoading: providerBreakdown.isLoading
  };
}
