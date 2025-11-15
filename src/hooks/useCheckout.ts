import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function useCheckout() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      autoChargeToWallet = false 
    }: { 
      bookingId: string; 
      autoChargeToWallet?: boolean;
    }) => {
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
    onMutate: async ({ bookingId }) => {
      // Get room ID from booking
      const { data: booking } = await supabase
        .from('bookings')
        .select('room_id')
        .eq('id', bookingId)
        .single();
      
      if (!booking) return;
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['rooms-grid'] });
      
      // Snapshot previous value
      const previousRooms = queryClient.getQueryData(['rooms-grid']);
      
      // Optimistically update to available status
      queryClient.setQueryData(['rooms-grid'], (old: any) => {
        if (!old) return old;
        return old.map((room: any) => 
          room.id === booking.room_id 
            ? { ...room, status: 'available', currentStatus: 'available' }
            : room
        );
      });
      
      return { previousRooms };
    },
    onSuccess: () => {
      // Invalidate all relevant queries to force refresh
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['room-detail'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['booking-folio'] });
      
      toast.success('Guest checked out successfully');
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousRooms) {
        queryClient.setQueryData(['rooms-grid'], context.previousRooms);
      }
      
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
