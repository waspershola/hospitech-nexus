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
  approval_token?: string;
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
    onMutate: async (newPayment) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['booking-folio'] });
      
      // Snapshot previous value
      const bookingId = newPayment.booking_id;
      if (!bookingId) return { previousFolio: null };
      
      const previousFolio = queryClient.getQueryData(['booking-folio', bookingId, tenantId]);
      
      // Optimistically update folio balance
      queryClient.setQueryData(['booking-folio', bookingId, tenantId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          totalPayments: (old?.totalPayments || 0) + newPayment.amount,
          balance: (old?.balance || 0) - newPayment.amount,
          payments: [
            ...(old?.payments || []),
            {
              id: 'optimistic-' + Date.now(),
              amount: newPayment.amount,
              method: newPayment.method,
              transaction_ref: newPayment.transaction_ref,
              created_at: new Date().toISOString(),
            }
          ]
        };
      });
      
      return { previousFolio, bookingId };
    },
    onError: (err, newPayment, context: any) => {
      // Rollback on error
      if (context?.previousFolio && context?.bookingId) {
        queryClient.setQueryData(
          ['booking-folio', context.bookingId, tenantId], 
          context.previousFolio
        );
      }
      toast.error(err.message);
    },
    onSuccess: async (data, variables) => {
      console.log('[useRecordPayment] PAYMENT-FIX-V2: Payment success, invalidating queries...');
      
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
        
        // PAYMENT-FIX-V2 Phase 3: Invalidate QR request queries
        queryClient.invalidateQueries({ queryKey: ['staff-requests'] }),
        ...(variables.metadata?.request_id 
          ? [queryClient.invalidateQueries({ queryKey: ['qr-request-detail', variables.metadata.request_id] })]
          : []
        ),
      ]);
      
      // Force immediate refetch for active queries
      await queryClient.refetchQueries({ 
        queryKey: ['booking-folio'], 
        type: 'active' 
      });
      
      // PAYMENT-FIX-V2 Phase 3: Force refetch for staff requests if this is a QR payment
      if (variables.metadata?.request_id) {
        await queryClient.refetchQueries({ 
          queryKey: ['staff-requests'],
          type: 'active'
        });
      }
      
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
    // onError already handled in onMutate
  });
}
