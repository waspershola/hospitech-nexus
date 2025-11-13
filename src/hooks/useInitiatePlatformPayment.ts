import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InitiatePaymentParams {
  tenant_id: string;
  payment_method_id: string;
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
    mutationFn: async ({ tenant_id, payment_method_id }: InitiatePaymentParams) => {
      console.log('[useInitiatePlatformPayment] Initiating payment for tenant:', tenant_id);

      const { data, error } = await supabase.functions.invoke<InitiatePaymentResponse>(
        'initiate-platform-fee-payment',
        {
          body: {
            tenant_id,
            payment_method_id,
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
    onSuccess: (data) => {
      toast.success('Payment initiated successfully', {
        description: `Redirecting to payment gateway...`,
      });

      // Redirect to payment URL
      console.log('[useInitiatePlatformPayment] Redirecting to:', data.payment_url);
      
      // Note: In production, this will redirect to actual payment gateway
      // For now, we just log the URL
      toast.info('Payment gateway integration pending', {
        description: 'Phase 5 will integrate actual payment providers',
      });

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
