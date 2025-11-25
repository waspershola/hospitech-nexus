/**
 * Offline-Aware Payment Hook - Phase 3
 * Wraps payment recording with offline queue support
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { offlineAwareEdgeFunction } from '@/lib/offline/offlineAwareClient';

interface RecordPaymentParams {
  bookingId: string;
  guestId: string;
  guestName: string;
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

export function useOfflineAwarePayment() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation({
    mutationFn: async (params: RecordPaymentParams) => {
      // Use offline-aware wrapper
      const { data, error, queued } = await offlineAwareEdgeFunction('create-payment', {
        tenantId,
        staffId: user?.id,
        ...params,
      });

      if (queued) {
        return { success: true, queued: true, message: 'Payment queued for sync' };
      }

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Payment failed');

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['booking-folio', variables.bookingId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['qr-request'] });
      queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
      
      if (data.queued) {
        toast.info('Payment queued for sync when online', {
          description: 'Payment will be processed automatically when connection is restored'
        });
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
