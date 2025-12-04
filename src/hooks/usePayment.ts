/**
 * Payment Hook - Phase 9 Offline Support
 * Attempts Electron offline path first, falls back to online Supabase
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  isElectronContext,
  offlineRecordPayment,
  saveFolioEvent,
} from '@/lib/offline/electronFolioBridge';

interface RecordPaymentParams {
  bookingId: string;
  guestId: string;
  guestName: string;
  folioId?: string;
  organizationId?: string;
  organizationName?: string;
  amount: number;
  paymentMethod: string;
  providerId?: string;
  providerName?: string;
  locationId?: string;
  locationName?: string;
  metadata?: Record<string, any>;
  overpaymentAction?: 'wallet' | 'room_advance' | 'refund';
  approval_token?: string;
  request_id?: string;
}

export function usePayment() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation({
    mutationFn: async (params: RecordPaymentParams) => {
      // Phase 9: Electron offline path first
      if (isElectronContext() && tenantId && params.folioId) {
        console.log('[usePayment] Attempting offline payment...');
        const offlineResult = await offlineRecordPayment(tenantId, {
          bookingId: params.bookingId,
          folioId: params.folioId,
          guestId: params.guestId,
          guestName: params.guestName,
          amount: params.amount,
          paymentMethod: params.paymentMethod,
          providerId: params.providerId,
          providerName: params.providerName,
          locationId: params.locationId,
          locationName: params.locationName,
          metadata: params.metadata,
        });

        if (offlineResult.data?.success) {
          console.log('[usePayment] Offline payment successful');
          
          // Save event to journal
          await saveFolioEvent(tenantId, {
            type: 'payment_recorded',
            folioId: params.folioId,
            bookingId: params.bookingId,
            timestamp: new Date().toISOString(),
            payload: {
              amount: params.amount,
              paymentMethod: params.paymentMethod,
              guestName: params.guestName,
              recordedBy: user?.id,
            },
          });

          return { success: true, offline: true, payment: offlineResult.data.payment };
        }

        // If offline failed with error, log but continue to online
        if (offlineResult.error) {
          console.warn('[usePayment] Offline payment failed, trying online:', offlineResult.error);
        }
      }

      // Online path - Direct Supabase call
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          tenantId,
          staffId: user?.id,
          ...params,
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Payment failed');

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['booking-folio', variables.bookingId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['folio', variables.folioId] });
      queryClient.invalidateQueries({ queryKey: ['folio-transactions', variables.folioId] });
      queryClient.invalidateQueries({ queryKey: ['qr-request'] });
      queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
      
      if (data.offline) {
        toast.success('Payment recorded (offline - will sync)');
      } else {
        toast.success('Payment recorded successfully');
      }
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Unknown error';
      
      if (errorMessage.includes('INSUFFICIENT_BALANCE')) {
        toast.error('Insufficient wallet balance');
      } else if (errorMessage.includes('WALLET_NOT_FOUND')) {
        toast.error('Organization wallet not configured');
      } else if (errorMessage.includes('REQUIRES_MANAGER_APPROVAL')) {
        toast.error('This payment requires manager approval');
      } else {
        toast.error(`Payment failed: ${errorMessage}`);
      }
    },
  });
}

// Re-export for backward compatibility
export { usePayment as useRecordPayment };
