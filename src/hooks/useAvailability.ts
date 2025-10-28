import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useAvailability(
  roomId: string | null,
  checkIn: Date | null,
  checkOut: Date | null
) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['availability', tenantId, roomId, checkIn?.toISOString(), checkOut?.toISOString()],
    queryFn: async () => {
      if (!tenantId || !roomId || !checkIn || !checkOut) {
        return { available: true, conflictingBookings: [] };
      }

      // Check for overlapping bookings
      // A booking overlaps if: NOT (check_out <= requested_check_in OR check_in >= requested_check_out)
      const { data, error } = await supabase
        .from('bookings')
        .select('id, guest_id, check_in, check_out, status')
        .eq('tenant_id', tenantId)
        .eq('room_id', roomId)
        .in('status', ['reserved', 'checked_in'])
        .lt('check_in', checkOut.toISOString())
        .gt('check_out', checkIn.toISOString());

      if (error) throw error;

      // If any bookings overlap, room is not available
      const available = !data || data.length === 0;

      return {
        available,
        conflictingBookings: data || [],
      };
    },
    enabled: !!tenantId && !!roomId && !!checkIn && !!checkOut,
  });
}

export async function checkRoomAvailability(
  tenantId: string,
  roomId: string,
  checkIn: Date,
  checkOut: Date
): Promise<boolean> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('room_id', roomId)
    .in('status', ['reserved', 'checked_in'])
    .lt('check_in', checkOut.toISOString())
    .gt('check_out', checkIn.toISOString())
    .limit(1);

  if (error) throw error;
  return !data || data.length === 0;
}
