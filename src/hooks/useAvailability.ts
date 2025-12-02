import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

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

      // SAFE-AVAILABILITY-CHECK-V1: Use date-only RPC for same-day turnover support
      const checkInDate = format(checkIn, 'yyyy-MM-dd');
      const checkOutDate = format(checkOut, 'yyyy-MM-dd');

      const { data: rpcResult, error } = await supabase.rpc('check_room_availability_for_dates', {
        p_tenant_id: tenantId,
        p_room_id: roomId,
        p_check_in: checkInDate,
        p_check_out: checkOutDate,
      });

      if (error) {
        console.error('[SAFE-AVAILABILITY-CHECK-V1] RPC error:', error);
        throw error;
      }

      const result = rpcResult as any;
      const available = result?.available ?? true;

      return {
        available,
        conflictingBookings: result?.conflict_booking_id 
          ? [{
              id: result.conflict_booking_id,
              booking_reference: result.conflict_booking_ref,
              status: result.conflict_status,
              check_in: result.conflict_check_in,
              check_out: result.conflict_check_out,
            }]
          : [],
      };
    },
    enabled: !!tenantId && !!roomId && !!checkIn && !!checkOut,
  });
}

/**
 * SAFE-AVAILABILITY-CHECK-V1: Standalone function using date-only comparison
 */
export async function checkRoomAvailability(
  tenantId: string,
  roomId: string,
  checkIn: Date,
  checkOut: Date
): Promise<boolean> {
  const checkInDate = format(checkIn, 'yyyy-MM-dd');
  const checkOutDate = format(checkOut, 'yyyy-MM-dd');

  const { data: rpcResult, error } = await supabase.rpc('check_room_availability_for_dates', {
    p_tenant_id: tenantId,
    p_room_id: roomId,
    p_check_in: checkInDate,
    p_check_out: checkOutDate,
  });

  if (error) {
    console.error('[SAFE-AVAILABILITY-CHECK-V1] checkRoomAvailability error:', error);
    throw error;
  }

  return (rpcResult as any)?.available ?? true;
}
