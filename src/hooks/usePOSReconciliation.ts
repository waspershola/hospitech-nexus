import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function usePOSMatching() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ importId, autoMatch = false }: { importId: string; autoMatch?: boolean }) => {
      if (!tenantId) throw new Error('Tenant ID required');

      console.log('[POS-MATCHING-V1] Initiating matching:', { importId, autoMatch });

      const { data, error } = await supabase.functions.invoke('match-pos-settlement', {
        body: { importId, tenantId, autoMatch }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Matching failed');

      return data;
    },
    onSuccess: (data) => {
      const summary = data.summary;
      toast.success(
        `Matching complete: ${summary.exactMatches} exact, ${summary.probableMatches} probable, ${summary.unmatched} unmatched`
      );
      queryClient.invalidateQueries({ queryKey: ['pos-settlement-imports', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['pos-settlement-records', tenantId] });
    },
    onError: (error: Error) => {
      console.error('[POS-MATCHING-V1] Matching failed:', error);
      toast.error(`Matching failed: ${error.message}`);
    }
  });
}

export function usePOSReconciliationData(importId: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['pos-reconciliation', tenantId, importId],
    queryFn: async () => {
      if (!tenantId || !importId) return null;

      // Get settlement records with matched ledger entries
      const { data: settlementRecords, error: settlementError } = await supabase
        .from('pos_settlement_records')
        .select(`
          *,
          ledger_entry:ledger_entries(*)
        `)
        .eq('import_id', importId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (settlementError) throw settlementError;

      return {
        settlementRecords: settlementRecords || [],
        matched: settlementRecords?.filter(r => r.ledger_entry_id) || [],
        unmatched: settlementRecords?.filter(r => !r.ledger_entry_id) || []
      };
    },
    enabled: !!tenantId && !!importId
  });
}

export function useManualPOSMatch() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      settlementRecordId,
      ledgerEntryId
    }: {
      settlementRecordId: string;
      ledgerEntryId: string;
    }) => {
      if (!tenantId) throw new Error('Tenant ID required');

      const { error } = await supabase
        .from('pos_settlement_records')
        .update({
          ledger_entry_id: ledgerEntryId,
          matched_at: new Date().toISOString(),
          match_confidence: 'manual'
        })
        .eq('id', settlementRecordId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Records matched successfully');
      queryClient.invalidateQueries({ queryKey: ['pos-reconciliation', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['pos-settlement-records', tenantId] });
    },
    onError: (error: Error) => {
      toast.error(`Manual match failed: ${error.message}`);
    }
  });
}

export function useUnmatchPOSRecord() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settlementRecordId: string) => {
      if (!tenantId) throw new Error('Tenant ID required');

      const { error } = await supabase
        .from('pos_settlement_records')
        .update({
          ledger_entry_id: null,
          matched_at: null,
          match_confidence: null
        })
        .eq('id', settlementRecordId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Match removed');
      queryClient.invalidateQueries({ queryKey: ['pos-reconciliation', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['pos-settlement-records', tenantId] });
    },
    onError: (error: Error) => {
      toast.error(`Unmatch failed: ${error.message}`);
    }
  });
}
