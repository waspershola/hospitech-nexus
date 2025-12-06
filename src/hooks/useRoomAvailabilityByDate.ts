import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getRoomStatusForDate } from '@/lib/roomAvailability';
import { format } from 'date-fns';
import { isOfflineMode } from '@/lib/offline/requestInterceptor';
import { getOfflineRooms, getOfflineBookings } from '@/lib/offline/electronOfflineBridge';

interface RoomAvailabilityData {
  roomId: string;
  roomNumber: string;
  roomType: string;
  categoryName?: string;
  floor?: number;
  status: 'available' | 'reserved' | 'occupied' | 'checking_out' | 'checking_in';
  bookingId?: string;
  guestName?: string;
  checkIn?: string;
  checkOut?: string;
}

/**
 * Shared helper to compute availability from rooms + bookings arrays
 * Used by both online and offline paths to avoid logic duplication
 */
function computeRoomAvailability(
  rooms: any[],
  bookings: any[],
  startDate: Date,
  checkOutTime: string
): RoomAvailabilityData[] {
  const dateStr = format(startDate, 'yyyy-MM-dd');

  return rooms.map((room) => {
    // Filter bookings for this room
    const roomBookings = bookings?.filter(b => b.room_id === room.id).map(b => ({
      id: b.id,
      room_id: b.room_id,
      check_in: b.check_in,
      check_out: b.check_out,
      status: b.status,
      guest_id: b.guest_id || b.guest?.id,
    })) || [];

    // Use centralized status logic
    const status = getRoomStatusForDate(
      { ...room, status: room.status },
      startDate,
      roomBookings as any,
      checkOutTime
    );

    // Find the booking that's actually active on the selected date
    const booking = bookings?.find(b => {
      if (b.room_id !== room.id) return false;
      const checkInDate = format(new Date(b.check_in), 'yyyy-MM-dd');
      const checkOutDate = format(new Date(b.check_out), 'yyyy-MM-dd');
      // Booking is active if: check-in <= selected date < check-out
      return checkInDate <= dateStr && checkOutDate > dateStr;
    });

    // Map status names to match the expected format
    const mappedStatus: RoomAvailabilityData['status'] = 
      status === 'check-in' ? 'checking_in' :
      status === 'check-out' ? 'checking_out' :
      status as RoomAvailabilityData['status'];

    // Extract guest name from booking (handle both nested and flat structures)
    const guestName = booking?.guest?.name || booking?.guestName;

    return {
      roomId: room.id,
      roomNumber: room.number,
      roomType: room.type,
      categoryName: room.category?.name || room.categoryName,
      floor: room.floor,
      status: mappedStatus,
      bookingId: booking?.id,
      guestName,
      checkIn: booking?.check_in,
      checkOut: booking?.check_out,
    };
  });
}

export function useRoomAvailabilityByDate(startDate: Date | null, endDate: Date | null) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['room-availability-by-date', tenantId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!tenantId || !startDate || !endDate) {
        return [];
      }

      // Phase 17: Offline mode - compute from IndexedDB data
      if (isOfflineMode()) {
        console.log('[useRoomAvailabilityByDate] Offline: Loading from IndexedDB');
        
        const [offlineRooms, offlineBookings] = await Promise.all([
          getOfflineRooms(tenantId),
          getOfflineBookings(tenantId),
        ]);

        // Filter bookings that overlap with the date range
        const filteredBookings = offlineBookings.filter(b => {
          if (!['reserved', 'checked_in', 'confirmed'].includes(b.status)) return false;
          const checkIn = new Date(b.check_in);
          const checkOut = new Date(b.check_out);
          return checkIn <= endDate && checkOut > startDate;
        });

        // Use default checkout time for offline (can't fetch config)
        const checkOutTime = '12:00';

        return computeRoomAvailability(offlineRooms, filteredBookings, startDate, checkOutTime);
      }

      // Online path: fetch from Supabase
      const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select(`
          id,
          number,
          type,
          floor,
          status,
          category:room_categories(name)
        `)
        .eq('tenant_id', tenantId)
        .order('number', { ascending: true });

      if (roomsError) throw roomsError;

      // Fetch all bookings that overlap with the date range
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          room_id,
          check_in,
          check_out,
          status,
          guest:guests(name)
        `)
        .eq('tenant_id', tenantId)
        .in('status', ['reserved', 'checked_in', 'confirmed'])
        .lte('check_in', endDate.toISOString())
        .gt('check_out', startDate.toISOString());

      if (bookingsError) throw bookingsError;

      // Fetch hotel check-out time configuration
      const { data: checkOutConfig } = await supabase
        .from('hotel_configurations')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('key', 'check_out_time')
        .maybeSingle();

      const checkOutTime = checkOutConfig?.value 
        ? String(checkOutConfig.value).replace(/"/g, '') 
        : '12:00';

      return computeRoomAvailability(rooms || [], bookings || [], startDate, checkOutTime);
    },
    enabled: !!tenantId && !!startDate && !!endDate,
  });
}
