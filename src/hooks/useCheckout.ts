import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { offlineAwareEdgeFunction } from '@/lib/offline/offlineAwareClient';

export function useCheckout() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { tenantId } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      autoChargeToWallet = false 
    }: { 
      bookingId: string; 
      autoChargeToWallet?: boolean;
    }) => {
      // Use offline-aware wrapper
      const { data, error, queued } = await offlineAwareEdgeFunction('complete-checkout', {
        bookingId,
        staffId: user?.id,
        autoChargeToWallet
      });

      if (queued) {
        return { success: true, queued: true, message: 'Checkout queued for sync' };
      }

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Checkout failed');

      return data;
    },
    onSuccess: (data, variables) => {
      // QUERY-KEY-FIX-V1: Specific cache invalidation with IDs
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['room-detail'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['booking-folio', variables.bookingId, tenantId] });
      
      if (data.queued) {
        toast.info('Checkout queued for sync when online', {
          description: 'Changes will be synchronized automatically'
        });
      } else {
        toast.success('Guest checked out successfully');
      }
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Unknown error';
      
      if (errorMessage.includes('BALANCE_DUE')) {
        toast.error('Outstanding Balance', {
          description: 'Please settle the outstanding balance before checkout. For organization bookings, ensure the payment was recorded correctly.',
        });
      } else if (errorMessage.includes('WALLET_NOT_FOUND')) {
        toast.error('Organization wallet not configured. Contact administrator.');
      } else {
        toast.error(`Checkout failed: ${errorMessage}`);
      }
    },
  });
}
