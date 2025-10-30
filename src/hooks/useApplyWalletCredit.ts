import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ApplyWalletCreditParams {
  guestId: string;
  bookingId?: string;
  amountToApply?: number;
}

export function useApplyWalletCredit() {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ guestId, bookingId, amountToApply }: ApplyWalletCreditParams) => {
      if (!tenantId || !user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('apply-wallet-credit', {
        body: {
          guest_id: guestId,
          booking_id: bookingId,
          tenant_id: tenantId,
          staff_id: user.id,
          amount_to_apply: amountToApply,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to apply wallet credit');

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      
      toast.success('Wallet credit applied', {
        description: `₦${data.amount_applied?.toLocaleString()} applied. Remaining balance: ₦${data.remaining_balance?.toLocaleString()}`,
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to apply wallet credit: ${error.message}`);
    },
  });
}