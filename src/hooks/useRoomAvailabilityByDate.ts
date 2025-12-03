import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getRoomStatusForDate } from '@/lib/roomAvailability';
import { format } from 'date-fns';
import { useNetworkStore } from '@/state/networkStore';
import { isNetworkOffline, getCachedRooms, getCachedBookings, updateCache } from '@/lib/offline/offlineDataService';
import { isElectronContext } from '@/lib/offline/offlineTypes';

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
  _offline?: boolean;
}

export function useRoomAvailabilityByDate(startDate: Date | null, endDate: Date | null) {
  const { tenantId } = useAuth();
  const { hardOffline } = useNetworkStore();

  return useQuery({
    queryKey: ['room-availability-by-date', tenantId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!tenantId || !startDate || !endDate) {
        return [];
      }

      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // ELECTRON-ONLY-V1: Load from IndexedDB when offline (only in Electron)
      if (isElectronContext() && isNetworkOffline()) {
        console.log('[useRoomAvailabilityByDate] OFFLINE-V1: Loading from cache (Electron)');
        
        const [cachedRooms, cachedBookings] = await Promise.all([
          getCachedRooms(tenantId),
          getCachedBookings(tenantId, startDateStr, endDateStr),
        ]);

        // Compute availability client-side
        const roomAvailability: RoomAvailabilityData[] = cachedRooms.map((room) => {
          const roomBookings = cachedBookings.filter(b => b.room_id === room.id);
          
          // Find booking overlapping with start date
          const booking = roomBookings.find(b => {
            const checkInDate = b.check_in.split('T')[0];
            const checkOutDate = b.check_out.split('T')[0];
            return checkInDate <= startDateStr && checkOutDate > startDateStr;
          });

          let status: RoomAvailabilityData['status'] = 'available';
          if (booking) {
            if (booking.status === 'checked_in') {
              status = 'occupied';
            } else if (booking.status === 'reserved') {
              const checkInDate = booking.check_in.split('T')[0];
              status = checkInDate === startDateStr ? 'checking_in' : 'reserved';
            }
          }

          return {
            roomId: room.id,
            roomNumber: room.number,
            roomType: room.category?.name || 'Standard',
            categoryName: room.category?.name,
            floor: room.floor ? parseInt(room.floor) : undefined,
            status,
            bookingId: booking?.id,
            guestName: undefined, // Not available in cached booking
            checkIn: booking?.check_in,
            checkOut: booking?.check_out,
            _offline: true,
          };
        });

        return roomAvailability;
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

      // Cache rooms in background
      if (rooms?.length) {
        updateCache(tenantId, 'rooms', rooms.map(r => ({
          id: r.id,
          number: r.number,
          floor: r.floor?.toString() || null,
          status: r.status as any,
          category: r.category,
        }))).catch(() => {});
      }

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

        // Find the booking that's actually active on the selected date
        const dateStr = format(startDate, 'yyyy-MM-dd');
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
    retry: hardOffline ? false : 2,
    refetchOnWindowFocus: !hardOffline,
  });
}
