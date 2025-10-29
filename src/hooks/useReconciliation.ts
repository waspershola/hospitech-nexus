import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { calculateMatchScore, findBestMatch } from '@/lib/finance/reconciliation';

export interface ReconciliationRecord {
  id: string;
  tenant_id: string;
  provider_id: string | null;
  reference: string;
  internal_txn_id: string | null;
  amount: number;
  status: 'matched' | 'unmatched' | 'partial' | 'overpaid';
  source: 'api' | 'csv';
  matched_by: string | null;
  reconciled_at: string | null;
  raw_data: Record<string, any> | null;
  created_at: string;
}

export function useReconciliation() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['reconciliation-records', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('finance_reconciliation_records')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ReconciliationRecord[];
    },
    enabled: !!tenantId,
  });

  const matchMutation = useMutation({
    mutationFn: async ({ recordId, paymentId }: { recordId: string; paymentId: string }) => {
      const { data, error } = await supabase
        .from('finance_reconciliation_records')
        .update({
          internal_txn_id: paymentId,
          status: 'matched',
          reconciled_at: new Date().toISOString(),
        })
        .eq('id', recordId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-records', tenantId] });
      toast.success('Transaction matched successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to match transaction: ${error.message}`);
    },
  });

  const unmatchMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const { data, error } = await supabase
        .from('finance_reconciliation_records')
        .update({
          internal_txn_id: null,
          status: 'unmatched',
          reconciled_at: null,
        })
        .eq('id', recordId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-records', tenantId] });
      toast.success('Transaction unmatched');
    },
    onError: (error: Error) => {
      toast.error(`Failed to unmatch transaction: ${error.message}`);
    },
  });

  const bulkMatchMutation = useMutation({
    mutationFn: async (records: Array<{ recordId: string; paymentId: string; confidence: string }>) => {
      const results = await Promise.allSettled(
        records.map(async ({ recordId, paymentId, confidence }) => {
          const { data, error } = await supabase
            .from('finance_reconciliation_records')
            .update({
              internal_txn_id: paymentId,
              status: 'matched',
              reconciled_at: new Date().toISOString(),
              raw_data: { 
                auto_match_confidence: confidence,
                matched_at: new Date().toISOString()
              },
            })
            .eq('id', recordId)
            .select()
            .single();

          if (error) throw error;
          return data;
        })
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      return { successful, failed, total: records.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-records', tenantId] });
      toast.success(`Bulk match complete: ${result.successful} matched, ${result.failed} failed`);
    },
    onError: (error: Error) => {
      toast.error(`Bulk match failed: ${error.message}`);
    },
  });

  const autoMatchMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant ID');

      // Get unmatched records
      const { data: unmatchedRecords, error: recordsError } = await supabase
        .from('finance_reconciliation_records')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'unmatched');

      if (recordsError) throw recordsError;

      // Get all payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId);

      if (paymentsError) throw paymentsError;

      // Find matches for each unmatched record
      const matches: Array<{ recordId: string; paymentId: string; confidence: string }> = [];

      for (const record of unmatchedRecords || []) {
        const match = findBestMatch(
          {
            reference: record.reference,
            amount: Number(record.amount),
            date: record.created_at,
          },
          payments || []
        );

        if (match && match.score.confidence === 'high') {
          matches.push({
            recordId: record.id,
            paymentId: match.paymentId,
            confidence: match.score.confidence,
          });
        }
      }

      return matches;
    },
    onSuccess: (matches) => {
      if (matches.length > 0) {
        bulkMatchMutation.mutate(matches);
      } else {
        toast.info('No high-confidence matches found');
      }
    },
    onError: (error: Error) => {
      toast.error(`Auto-match failed: ${error.message}`);
    },
  });

  return {
    records: query.data ?? [],
    isLoading: query.isLoading,
    matchTransaction: matchMutation.mutate,
    unmatchTransaction: unmatchMutation.mutate,
    bulkMatch: bulkMatchMutation.mutate,
    autoMatch: autoMatchMutation.mutate,
    isAutoMatching: autoMatchMutation.isPending,
  };
}
