import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useManualCreateFolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase.functions.invoke('manual-create-folio', {
        body: { booking_id: bookingId }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to create folio');

      return data.folio;
    },
    onSuccess: (folio, bookingId) => {
      toast.success('Folio Created', {
        description: `Stay folio has been created successfully`,
      });

      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['booking-folio', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['room-current-folio'] });
      queryClient.invalidateQueries({ queryKey: ['stay-folios'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error: any) => {
      console.error('[useManualCreateFolio] Error:', error);
      toast.error('Failed to Create Folio', {
        description: error.message || 'Could not create stay folio',
      });
    },
  });
}
