import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export function useRoomAvailabilityByDate(startDate: Date | null, endDate: Date | null) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['room-availability-by-date', tenantId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!tenantId || !startDate || !endDate) {
        return [];
      }

      // Fetch all rooms
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

      // Get actual today's date for comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const selectedDay = new Date(startDate);
      selectedDay.setHours(0, 0, 0, 0);
      
      // Check if the selected day is actually today
      const isSelectedDayToday = today.toDateString() === selectedDay.toDateString();

      // Create a map of room availability
      const roomAvailability: RoomAvailabilityData[] = (rooms || []).map((room) => {
        // Find if this room has a booking in the selected date range
        const booking = bookings?.find(b => b.room_id === room.id);

        if (!booking) {
          return {
            roomId: room.id,
            roomNumber: room.number,
            roomType: room.type,
            categoryName: room.category?.name,
            floor: room.floor,
            status: 'available' as const,
          };
        }

        const checkInDate = new Date(booking.check_in);
        checkInDate.setHours(0, 0, 0, 0);
        const checkOutDate = new Date(booking.check_out);
        checkOutDate.setHours(0, 0, 0, 0);
        
        const isCheckInDay = checkInDate.toDateString() === selectedDay.toDateString();
        const isCheckOutDay = checkOutDate.toDateString() === selectedDay.toDateString();

        let availabilityStatus: RoomAvailabilityData['status'];
        
        // If check-in is on the selected day
        if (isCheckInDay) {
          // Only show "checking_in" if:
          // 1. The selected date is actually today AND
          // 2. Booking is still in 'reserved' status
          if (isSelectedDayToday && booking.status === 'reserved') {
            availabilityStatus = 'checking_in';
          } else if (booking.status === 'checked_in') {
            availabilityStatus = 'occupied';
          } else {
            // Future check-in - show as reserved
            availabilityStatus = 'reserved';
          }
        } 
        // If check-out is on the selected day
        else if (isCheckOutDay) {
          // Only show "checking_out" if the selected date is today
          availabilityStatus = isSelectedDayToday ? 'checking_out' : 'occupied';
        } 
        // Mid-stay (guest is staying multiple days)
        else {
          // If guest has checked in, show as occupied
          // Otherwise show as reserved (future reservation)
          availabilityStatus = booking.status === 'checked_in' ? 'occupied' : 'reserved';
        }

        return {
          roomId: room.id,
          roomNumber: room.number,
          roomType: room.type,
          categoryName: room.category?.name,
          floor: room.floor,
          status: availabilityStatus,
          bookingId: booking.id,
          guestName: booking.guest?.name,
          checkIn: booking.check_in,
          checkOut: booking.check_out,
        };
      });

      return roomAvailability;
    },
    enabled: !!tenantId && !!startDate && !!endDate,
  });
}
