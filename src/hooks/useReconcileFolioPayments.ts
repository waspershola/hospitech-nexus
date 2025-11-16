import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ReconcileResults {
  total_found: number;
  linked: number;
  failed: Array<{
    payment_id: string;
    transaction_ref?: string;
    amount?: number;
    error?: string;
    reason?: string;
  }>;
}

export function useReconcileFolioPayments() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data, error } = await supabase.functions.invoke('reconcile-folio-payments', {
        body: { tenant_id: tenantId }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Reconciliation failed');

      return data.results as ReconcileResults;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['stay_folios', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['payments', tenantId] });
      
      if (results.linked > 0) {
        toast.success('Reconciliation Complete', {
          description: `Linked ${results.linked} of ${results.total_found} orphan payments.`
        });
      } else if (results.total_found === 0) {
        toast.info('No Orphan Payments Found', {
          description: 'All payments are already linked to folios.'
        });
      } else {
        toast.warning('Reconciliation Complete', {
          description: `Could not link ${results.failed.length} payments. Check logs for details.`
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Reconciliation Failed', {
        description: error.message
      });
    },
  });
}
