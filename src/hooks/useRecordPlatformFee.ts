import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RecordPlatformFeeParams {
  request_id: string;
  tenant_id: string;
  service_category: string;
  amount: number;
  payment_location?: string;
  payment_method?: string;
}

export function useRecordPlatformFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RecordPlatformFeeParams) => {
      console.log('[useRecordPlatformFee] Recording platform fee for request:', params.request_id);

      const { data, error } = await supabase.functions.invoke('record-platform-fee', {
        body: params,
      });

      if (error) {
        console.error('[useRecordPlatformFee] Error:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to record platform fee');
      }

      return data;
    },
    onSuccess: (data, variables) => {
      console.log('[useRecordPlatformFee] Platform fee recorded successfully:', data);
      
      // Invalidate platform fee queries
      queryClient.invalidateQueries({ queryKey: ['platform-fee-config'] });
      queryClient.invalidateQueries({ queryKey: ['platform-fee-ledger'] });
      
      // Don't show toast for successful fee recording (silent operation)
      // The payment success toast is already shown by the payment collection handler
    },
    onError: (error: Error) => {
      console.error('[useRecordPlatformFee] Mutation error:', error);
      // Non-blocking: don't show error toast to user
      // Payment was already marked as collected, fee recording is supplementary
    },
  });
}
