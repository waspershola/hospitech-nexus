import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ForceCheckoutParams {
  bookingId: string;
  reason: string;
  createReceivable?: boolean;
  approvalToken: string;
}

export function useForceCheckout() {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, reason, createReceivable = true, approvalToken }: ForceCheckoutParams) => {
      if (!tenantId || !user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('force-checkout', {
        body: {
          booking_id: bookingId,
          tenant_id: tenantId,
          manager_id: user.id,
          reason,
          create_receivable: createReceivable,
          approval_token: approvalToken,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Force checkout failed');

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      
      toast.success('Guest checked out with manager override', {
        description: data.receivable_created 
          ? `Balance due: ₦${data.balance_due?.toLocaleString()} tracked as receivable`
          : 'Checkout completed',
      });
    },
    onError: (error: Error) => {
      toast.error(`Force checkout failed: ${error.message}`);
    },
  });
}