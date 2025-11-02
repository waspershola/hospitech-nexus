import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useSyncRoomBookings() {
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data, error } = await supabase.functions.invoke('sync-room-bookings', {
        body: { tenant_id: tenantId }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Sync failed');

      return data;
    },
    onSuccess: (data) => {
      toast.success('Room Sync Complete', {
        description: `Updated ${data.results.updated} rooms, cleared ${data.results.cleared} rooms`,
        duration: 5000,
      });
    },
    onError: (error: any) => {
      toast.error('Sync Failed', {
        description: error.message || 'Failed to sync rooms',
        duration: 6000,
      });
    },
  });
}