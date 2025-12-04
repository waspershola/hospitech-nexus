import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { isElectronContext } from '@/lib/environment/isElectron';
import { 
  offlineCheckout, 
  saveBookingEvent, 
  updateBookingCache,
  updateRoomCache 
} from '@/lib/offline/electronCheckinCheckoutBridge';

export function useCheckout() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      autoChargeToWallet = false,
      roomId,
      folioId
    }: { 
      bookingId: string; 
      autoChargeToWallet?: boolean;
      roomId?: string;
      folioId?: string;
    }) => {
      // PHASE-8: Try Electron offline checkout first
      if (isElectronContext() && tenantId) {
        console.log('[useCheckout] PHASE-8 Attempting offline checkout:', { bookingId });
        
        const offlineResult = await offlineCheckout(tenantId, bookingId, {
          autoChargeToWallet,
          roomId,
          folioId
        });

        if (offlineResult.source === 'offline' && offlineResult.data?.success) {
          console.log('[useCheckout] PHASE-8 Offline checkout succeeded');
          
          // Save checkout event to journal
          await saveBookingEvent(tenantId, {
            type: 'checkout_performed',
            bookingId,
            roomId: roomId || '',
            timestamp: new Date().toISOString(),
            payload: { autoChargeToWallet, staffId: user?.id }
          });

          // Update booking cache with completed status
          await updateBookingCache(tenantId, {
            id: bookingId,
            status: 'completed',
            metadata: { actual_checkout: new Date().toISOString() }
          });

          // Update room cache to cleaning status
          if (roomId) {
            await updateRoomCache(tenantId, {
              id: roomId,
              status: 'cleaning'
            });
          }

          return { success: true, offline: true };
        }
        
        // Fall through to online path if offline fails or not available
        console.log('[useCheckout] PHASE-8 Falling through to online path:', offlineResult.source);
      }

      // ONLINE PATH (unchanged) - Direct Supabase call
      const { data, error } = await supabase.functions.invoke('complete-checkout', {
        body: {
          bookingId,
          staffId: user?.id,
          autoChargeToWallet
        }
      });

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
      
      toast.success('Guest checked out successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Unknown error';
      
      if (errorMessage.includes('BALANCE_DUE')) {
        toast.error('Outstanding Balance', {
          description: 'Please settle the outstanding balance before checkout. For organization bookings, ensure the payment was recorded correctly.',
        });
      } else if (errorMessage.includes('GROUP_BALANCE_DUE')) {
        toast.error('Group Outstanding Balance', {
          description: 'The group has an outstanding balance. Collect payment from any room in the group before checkout.',
        });
      } else if (errorMessage.includes('WALLET_NOT_FOUND')) {
        toast.error('Organization wallet not configured. Contact administrator.');
      } else {
        toast.error(`Checkout failed: ${errorMessage}`);
      }
    },
  });
}
