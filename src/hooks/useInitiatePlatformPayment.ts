import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InitiatePaymentParams {
  tenant_id: string;
  payment_method_id: string;
  ledger_ids?: string[]; // Optional: for retry attempts with specific fee entries
}

interface InitiatePaymentResponse {
  success: boolean;
  payment_id?: string;
  payment_reference?: string;
  payment_url?: string;
  total_amount?: number;
  provider?: string;
  fee_count?: number;
  error?: string;
}

export function useInitiatePlatformPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenant_id, payment_method_id, ledger_ids }: InitiatePaymentParams) => {
      console.log('[useInitiatePlatformPayment] Initiating payment for tenant:', tenant_id);
      if (ledger_ids) {
        console.log('[useInitiatePlatformPayment] Retrying specific ledger entries:', ledger_ids);
      }

      const { data, error } = await supabase.functions.invoke<InitiatePaymentResponse>(
        'initiate-platform-fee-payment',
        {
          body: {
            tenant_id,
            payment_method_id,
            ledger_ids, // Include ledger_ids for retry attempts
          },
        }
      );

      if (error) {
        console.error('[useInitiatePlatformPayment] Error:', error);
        throw new Error(error.message || 'Failed to initiate payment');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Payment initiation failed');
      }

      return data;
    },
    onSuccess: (data, variables) => {
      const isRetry = variables.ledger_ids && variables.ledger_ids.length > 0;
      toast.success(isRetry ? 'Retry payment initiated' : 'Payment initiated successfully', {
        description: `Redirecting to payment gateway...`,
      });

      // Redirect to payment URL
      console.log('[useInitiatePlatformPayment] Redirecting to:', data.payment_url);
      
      // Redirect to actual payment gateway
      if (data.payment_url) {
        window.location.href = data.payment_url;
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['platform-fee-configs'] });
      queryClient.invalidateQueries({ queryKey: ['platform-fee-summary'] });
      queryClient.invalidateQueries({ queryKey: ['platform-fee-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-payment-history'] });
    },
    onError: (error: Error) => {
      console.error('[useInitiatePlatformPayment] Mutation error:', error);
      toast.error('Failed to initiate payment', {
        description: error.message,
      });
    },
  });
}
