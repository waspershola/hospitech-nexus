import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { format } from 'date-fns';

export interface RoomAvailabilityStatus {
  roomId: string;
  isAvailable: boolean;
  conflictingBookingId?: string;
  conflictingBookingRef?: string;
}

/**
 * Hook to check room availability for a date range
 * Supports both single and multiple room checks with real-time updates
 * Version: SAFE-AVAILABILITY-CHECK-V1 - Uses date-only comparison for same-day turnover
 */
export function useRoomAvailability(
  roomIds: string[] | string | null,
  checkIn: Date | null,
  checkOut: Date | null
) {
  const { tenantId } = useAuth();

  const roomIdArray = Array.isArray(roomIds) ? roomIds : roomIds ? [roomIds] : [];

  const { data: availabilityMap, ...query } = useQuery({
    queryKey: ['room-availability', tenantId, roomIdArray, checkIn?.toISOString(), checkOut?.toISOString()],
    queryFn: async (): Promise<Map<string, RoomAvailabilityStatus>> => {
      if (!tenantId || roomIdArray.length === 0 || !checkIn || !checkOut) {
        return new Map();
      }

      // SAFE-AVAILABILITY-CHECK-V1: Use date-only RPC for same-day turnover support
      const checkInDate = format(checkIn, 'yyyy-MM-dd');
      const checkOutDate = format(checkOut, 'yyyy-MM-dd');

      const { data: rpcResult, error } = await supabase.rpc('check_rooms_availability_for_dates', {
        p_tenant_id: tenantId,
        p_room_ids: roomIdArray,
        p_check_in: checkInDate,
        p_check_out: checkOutDate,
      });

      if (error) {
        console.error('[SAFE-AVAILABILITY-CHECK-V1] RPC error:', error);
        throw error;
      }

      // Build availability map from RPC results
      const availabilityMap = new Map<string, RoomAvailabilityStatus>();
      const results = (rpcResult as any)?.results || [];

      results.forEach((result: any) => {
        availabilityMap.set(result.room_id, {
          roomId: result.room_id,
          isAvailable: result.available,
          conflictingBookingId: result.conflict_booking_id || undefined,
          conflictingBookingRef: result.conflict_booking_ref || undefined,
        });
      });

      // Ensure all requested rooms have an entry (default to available if not in results)
      roomIdArray.forEach((roomId) => {
        if (!availabilityMap.has(roomId)) {
          availabilityMap.set(roomId, {
            roomId,
            isAvailable: true,
          });
        }
      });

      return availabilityMap;
    },
    enabled: !!tenantId && roomIdArray.length > 0 && !!checkIn && !!checkOut,
    staleTime: 30000,
  });

  // Set up real-time subscription for booking changes
  useEffect(() => {
    if (!tenantId || roomIdArray.length === 0) return;

    const channel = supabase
      .channel('room-availability-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          // Invalidate cache when bookings change
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, roomIdArray, query]);

  return {
    availabilityMap: availabilityMap || new Map(),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Helper to check if all rooms are available
 */
export function areAllRoomsAvailable(
  availabilityMap: Map<string, RoomAvailabilityStatus>,
  roomIds: string[]
): boolean {
  return roomIds.every((roomId) => {
    const status = availabilityMap.get(roomId);
    return status?.isAvailable !== false;
  });
}

/**
 * Helper to get unavailable rooms
 */
export function getUnavailableRooms(
  availabilityMap: Map<string, RoomAvailabilityStatus>,
  roomIds: string[]
): RoomAvailabilityStatus[] {
  return roomIds
    .map((roomId) => availabilityMap.get(roomId))
    .filter((status): status is RoomAvailabilityStatus => 
      status !== undefined && !status.isAvailable
    );
}
