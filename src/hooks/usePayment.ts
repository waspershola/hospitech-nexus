/**
 * Payment Hook - Online-only SPA version
 * Direct Supabase calls without offline wrapper
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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

export function usePayment() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation({
    mutationFn: async (params: RecordPaymentParams) => {
      // Direct Supabase call - no offline wrapper
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
      queryClient.invalidateQueries({ queryKey: ['qr-request'] });
      queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
      
      toast.success('Payment recorded successfully');
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
