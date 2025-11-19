import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface RoomAvailabilityStatus {
  roomId: string;
  isAvailable: boolean;
  conflictingBookingId?: string;
  conflictingBookingRef?: string;
}

/**
 * Hook to check room availability for a date range
 * Supports both single and multiple room checks with real-time updates
 * Version: ROOM-AVAILABILITY-V1
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

      // Query overlapping bookings for the rooms and date range
      const { data: overlappingBookings, error } = await supabase
        .from('bookings')
        .select('id, room_id, booking_reference, check_in, check_out')
        .eq('tenant_id', tenantId)
        .in('room_id', roomIdArray)
        .in('status', ['reserved', 'checked_in', 'confirmed'])
        .lt('check_in', checkOut.toISOString())
        .gt('check_out', checkIn.toISOString());

      if (error) throw error;

      // Build availability map
      const availabilityMap = new Map<string, RoomAvailabilityStatus>();

      roomIdArray.forEach((roomId) => {
        const conflict = overlappingBookings?.find((booking) => booking.room_id === roomId);
        
        availabilityMap.set(roomId, {
          roomId,
          isAvailable: !conflict,
          conflictingBookingId: conflict?.id,
          conflictingBookingRef: conflict?.booking_reference || undefined,
        });
      });

      return availabilityMap;
    },
    enabled: !!tenantId && roomIdArray.length > 0 && !!checkIn && !!checkOut,
    staleTime: 30000, // 30 seconds - balance between freshness and performance
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
