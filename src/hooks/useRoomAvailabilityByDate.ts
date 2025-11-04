import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getRoomStatusForDate } from '@/lib/roomAvailability';
import { format } from 'date-fns';

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

      // Fetch hotel check-out time configuration
      const { data: checkOutConfig } = await supabase
        .from('hotel_configurations')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('key', 'check_out_time')
        .single();

      const checkOutTime = checkOutConfig?.value 
        ? String(checkOutConfig.value).replace(/"/g, '') 
        : '12:00';

      // Create a map of room availability using centralized logic
      const roomAvailability: RoomAvailabilityData[] = (rooms || []).map((room) => {
        // Convert room bookings to array format expected by getRoomStatusForDate
        const roomBookings = bookings?.filter(b => b.room_id === room.id).map(b => ({
          id: b.id,
          room_id: b.room_id,
          check_in: b.check_in,
          check_out: b.check_out,
          status: b.status,
          guest_id: b.guest?.name || undefined,
        })) || [];

        // Use centralized status logic
        const status = getRoomStatusForDate(
          { ...room, status: room.status },
          startDate,
          roomBookings as any,
          checkOutTime
        );

        // Find active booking for additional details
        const booking = bookings?.find(b => b.room_id === room.id);

        // Map status names to match the expected format
        const mappedStatus: RoomAvailabilityData['status'] = 
          status === 'check-in' ? 'checking_in' :
          status === 'check-out' ? 'checking_out' :
          status as RoomAvailabilityData['status'];

        return {
          roomId: room.id,
          roomNumber: room.number,
          roomType: room.type,
          categoryName: room.category?.name,
          floor: room.floor,
          status: mappedStatus,
          bookingId: booking?.id,
          guestName: booking?.guest?.name,
          checkIn: booking?.check_in,
          checkOut: booking?.check_out,
        };
      });

      return roomAvailability;
    },
    enabled: !!tenantId && !!startDate && !!endDate,
  });
}
