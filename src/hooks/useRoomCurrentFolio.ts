import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to fetch the current folio for a room by room number
 * Useful when stay_folio_id is not available but room number is known
 */
export function useRoomCurrentFolio(roomNumber: string | null) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['room-current-folio', roomNumber, tenantId],
    queryFn: async () => {
      if (!roomNumber || !tenantId) return null;

      console.log('[useRoomCurrentFolio] Fetching folio for room:', roomNumber);

      // Step 1: Find room by number with tenant filter
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, status')
        .eq('number', roomNumber)
        .eq('tenant_id', tenantId)
        .order('status', { ascending: true }) // Prefer occupied rooms
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (roomError || !room) {
        console.log('[useRoomCurrentFolio] Room not found:', roomError);
        return null;
      }

      // Step 2: Find current booking for this room (checked_in status)
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, guest_id')
        .eq('room_id', room.id)
        .eq('tenant_id', tenantId)
        .eq('status', 'checked_in')
        .order('check_in', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bookingError || !booking) {
        console.log('[useRoomCurrentFolio] No active booking found:', bookingError);
        return null;
      }

      // Step 3: Find stay_folio for this booking
      const { data: folio, error: folioError } = await supabase
        .from('stay_folios')
        .select('id, booking_id, guest_id, room_id, total_charges, total_payments, balance, status')
        .eq('booking_id', booking.id)
        .eq('tenant_id', tenantId)
        .single();

      if (folioError || !folio) {
        console.log('[useRoomCurrentFolio] No folio found for booking:', folioError);
        return null;
      }

      console.log('[useRoomCurrentFolio] Found folio:', folio);

      return {
        ...folio,
        booking_id: booking.id,
        guest_id: booking.guest_id,
      };
    },
    enabled: !!roomNumber && !!tenantId,
  });
}
