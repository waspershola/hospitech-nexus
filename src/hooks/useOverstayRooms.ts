import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OverstayRoom {
  id: string;
  number: string;
  guest_name: string;
  check_out: string;
  balance: number;
}

export function useOverstayRooms() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['overstay-rooms', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Get checkout time configuration
      const { data: configData } = await supabase
        .from('hotel_configurations')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('key', 'check_out_time')
        .single();

      const checkoutTime = configData?.value ? String(configData.value).replace(/"/g, '') : '12:00';
      const [hours, minutes] = checkoutTime.split(':').map(Number);
      const now = new Date();

      // Get all checked-in bookings that might be overdue
      const { data: potentialOverstay } = await supabase
        .from('bookings')
        .select(`
          id,
          check_out,
          room_id,
          guest:guests(name),
          room:rooms(id, number)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'checked_in')
        .lt('check_out', now.toISOString());

      if (!potentialOverstay || potentialOverstay.length === 0) return [];

      // Filter for bookings actually past checkout time
      const overstayBookings = potentialOverstay.filter((booking: any) => {
        const checkoutDateTime = new Date(booking.check_out);
        checkoutDateTime.setHours(hours, minutes, 0, 0);
        return now > checkoutDateTime;
      });

      if (overstayBookings.length === 0) return [];

      // Get folio balances for these bookings
      const bookingIds = overstayBookings.map((b: any) => b.id);
      const { data: payments } = await supabase
        .from('payments')
        .select('booking_id, amount')
        .in('booking_id', bookingIds);

      // Calculate balance for each booking
      const overstayRooms: OverstayRoom[] = overstayBookings.map((booking: any) => {
        const bookingPayments = payments?.filter(p => p.booking_id === booking.id) || [];
        const totalPaid = bookingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        
        return {
          id: booking.room?.id || '',
          number: booking.room?.number || '',
          guest_name: booking.guest?.name || 'Unknown Guest',
          check_out: booking.check_out,
          balance: 0 - totalPaid,
        };
      });

      return overstayRooms;
    },
    enabled: !!tenantId,
    refetchInterval: 60000, // Check every minute
  });
}
