import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface RecordPaymentParams {
  transaction_ref: string;
  guest_id?: string;
  organization_id?: string;
  booking_id?: string;
  amount: number;
  expected_amount?: number;
  payment_type?: 'partial' | 'full' | 'overpayment';
  method: string;
  provider_id?: string;
  location_id?: string;
  department?: string;
  wallet_id?: string;
  metadata?: Record<string, any>;
}

export function useRecordPayment() {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RecordPaymentParams) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          tenant_id: tenantId,
          recorded_by: user?.id,
          ...params,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Payment failed');

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['wallets', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['finance-analytics', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-records', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['booking-folio'] });
      
      toast.success('Payment recorded successfully', {
        description: `Transaction: ${data.payment?.transaction_ref || ''}`,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
