import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WaiveFeeParams {
  ledger_ids: string[];
  waived_reason: string;
  approval_notes?: string;
}

export function usePlatformFeeWaiver() {
  const queryClient = useQueryClient();

  const waiveFee = useMutation({
    mutationFn: async ({ ledger_ids, waived_reason, approval_notes }: WaiveFeeParams) => {
      const { data, error } = await supabase.functions.invoke('waive-platform-fee', {
        body: {
          ledger_ids,
          waived_reason,
          approval_notes
        }
      });

      if (error) {
        console.error('[usePlatformFeeWaiver] Error:', error);
        throw new Error(error.message || 'Failed to waive platform fee');
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully waived ${data.waived_count} fee(s) totaling ₦${data.total_waived_amount.toFixed(2)}`);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['platform-fee-configs'] });
      queryClient.invalidateQueries({ queryKey: ['platform-fee-summary'] });
      queryClient.invalidateQueries({ queryKey: ['platform-fee-ledger'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to waive fee: ${error.message}`);
    },
  });

  return { waiveFee };
}
