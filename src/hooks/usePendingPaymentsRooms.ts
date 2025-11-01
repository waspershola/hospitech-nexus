import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function usePendingPaymentsRooms() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['pending-payments-rooms', tenantId],
    queryFn: async () => {
      if (!tenantId) return { count: 0, rooms: [] };

      // Fetch all bookings with balance calculation
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          room_id,
          status,
          total_amount,
          rooms!inner(id, number, tenant_id)
        `)
        .eq('rooms.tenant_id', tenantId)
        .in('status', ['reserved', 'checked_in', 'occupied']);

      if (bookingsError) throw bookingsError;

      // For each booking, get payments total
      const bookingsWithBalance = await Promise.all(
        (bookings || []).map(async (booking) => {
          const { data: payments } = await supabase
            .from('payments')
            .select('amount')
            .eq('booking_id', booking.id)
            .in('status', ['paid', 'success', 'completed']);

          const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
          const balance = Number(booking.total_amount) - totalPaid;

          if (balance > 0) {
            return {
              id: booking.rooms.id,
              number: booking.rooms.number,
              balance,
            };
          }

          return null;
        })
      );

      const filteredRooms = bookingsWithBalance.filter(r => r !== null);

      return {
        count: filteredRooms.length,
        rooms: filteredRooms,
      };
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
