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
  overpayment_action?: 'wallet' | 'refund';
  force_approve?: boolean;
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
    onSuccess: async (data) => {
      // Phase 1 Enhancement: Better cache management with forced refetch
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['payments', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['wallets', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['wallet-transactions', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['finance-analytics', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['reconciliation-records', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['booking-folio'] }),
        queryClient.invalidateQueries({ queryKey: ['folio-by-id'] }),
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] }),
      ]);
      
      // Force immediate refetch for active queries
      await queryClient.refetchQueries({ 
        queryKey: ['booking-folio'], 
        type: 'active' 
      });
      
      // Broadcast update event for multi-tab consistency
      if (data.booking_id) {
        window.postMessage({ 
          type: 'FOLIO_UPDATED', 
          bookingId: data.booking_id 
        }, '*');
      }
      
      toast.success('Payment recorded successfully', {
        description: data.post_checkout 
          ? 'Post-checkout payment recorded in ledger'
          : `Transaction: ${data.payment?.transaction_ref || ''}`,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
