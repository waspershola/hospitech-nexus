import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

  return {
    records: query.data ?? [],
    isLoading: query.isLoading,
    matchTransaction: matchMutation.mutate,
    unmatchTransaction: unmatchMutation.mutate,
  };
}
