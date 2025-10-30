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
    onSuccess: () => {
      // Invalidate all relevant queries to force refresh
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['room-detail'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['booking-folio'] });
      
      toast.success('Guest checked out successfully');
    },
    onError: (error: any) => {
      if (error.message?.includes('BALANCE_DUE')) {
        toast.error('Outstanding balance must be settled before checkout');
      } else {
        toast.error(`Checkout failed: ${error.message}`);
      }
    },
  });
}
