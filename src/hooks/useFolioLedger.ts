import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface LedgerEntry {
  id: string;
  transaction_date: string;
  transaction_type: string;
  description: string;
  reference: string | null;
  debit: number;
  credit: number;
  running_balance: number;
  staff_name: string | null;
  source: string | null;
}

export function useFolioLedger(folioId: string | null) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  // Real-time subscription for ledger updates
  useEffect(() => {
    if (!folioId || !tenantId) return;

    console.log('[useFolioLedger] Setting up real-time subscription for folio:', folioId);

    const channel = supabase
      .channel(`folio-ledger-${folioId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'folio_transactions',
        filter: `folio_id=eq.${folioId}`,
      }, (payload) => {
        console.log('[useFolioLedger] Transaction change detected:', payload);
        queryClient.invalidateQueries({ queryKey: ['folio-ledger', folioId, tenantId] });
        queryClient.invalidateQueries({ queryKey: ['folio', folioId, tenantId] });
      })
      .subscribe();

    return () => {
      console.log('[useFolioLedger] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [folioId, tenantId, queryClient]);

  return useQuery({
    queryKey: ['folio-ledger', folioId, tenantId],
    queryFn: async () => {
      if (!folioId || !tenantId) {
        return [];
      }

      // Fetch transactions with running balance calculation
      const { data, error } = await supabase
        .from('folio_transactions')
        .select(`
          id,
          created_at,
          transaction_type,
          description,
          reference_id,
          reference_type,
          amount,
          department,
          metadata,
          created_by
        `)
        .eq('folio_id', folioId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[useFolioLedger] Error fetching ledger:', error);
        throw error;
      }

      // Calculate running balance
      let runningBalance = 0;
      const ledgerEntries: LedgerEntry[] = (data || []).map((txn) => {
        const isDebit = txn.transaction_type === 'charge' || txn.transaction_type === 'adjustment_increase';
        const isCredit = txn.transaction_type === 'payment' || txn.transaction_type === 'adjustment_decrease';

        const debit = isDebit ? txn.amount : 0;
        const credit = isCredit ? txn.amount : 0;

        runningBalance += debit - credit;

        const metadata = txn.metadata as Record<string, any> | null;
        
        return {
          id: txn.id,
          transaction_date: txn.created_at,
          transaction_type: txn.transaction_type,
          description: txn.description,
          reference: txn.reference_id || txn.reference_type || null,
          debit,
          credit,
          running_balance: runningBalance,
          staff_name: metadata?.staff_name || null,
          source: txn.department || metadata?.source || null,
        };
      });

      console.log('[useFolioLedger] Ledger entries calculated:', ledgerEntries.length);
      return ledgerEntries;
    },
    enabled: !!folioId && !!tenantId,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });
}
