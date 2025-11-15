import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReconciliationResult {
  success: boolean;
  message: string;
  results: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    details: Array<{
      payment_id: string;
      transaction_ref: string;
      folio_id?: string;
      amount?: number;
      status: 'success' | 'error' | 'skipped';
      error?: string;
      reason?: string;
    }>;
  };
}

export function useReconcileFolioPayments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<ReconciliationResult>(
        'reconcile-folio-payments',
        { body: {} }
      );

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Reconciliation failed');

      return data;
    },
    onSuccess: (data) => {
      const { successful, failed, skipped } = data.results;
      
      // Invalidate all relevant queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['outstanding-folios'] });
      queryClient.invalidateQueries({ queryKey: ['booking-folio'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      
      if (successful > 0) {
        toast.success('Folio Reconciliation Complete', {
          description: `Successfully reconciled ${successful} payment(s). ${failed > 0 ? `${failed} failed.` : ''} ${skipped > 0 ? `${skipped} skipped.` : ''}`,
        });
      } else if (failed > 0) {
        toast.error('Reconciliation Had Errors', {
          description: `${failed} payment(s) failed to reconcile. ${skipped} skipped.`,
        });
      } else {
        toast.info('No Payments to Reconcile', {
          description: 'All payments are already properly linked to folios.',
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Reconciliation Failed', {
        description: error.message,
      });
    },
  });
}
