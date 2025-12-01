import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FrontDeskKPIs {
  available: number;
  occupied: number;
  arrivals: number;
  departures: number;
  inHouse: number;
  pendingPayments: number;
  outOfService: number;
  overstays: number;
  dieselLevel: number;
}

export function useFrontDeskKPIs() {
  const { tenantId } = useAuth();

  const query = useQuery({
    queryKey: ['frontdesk-kpis', tenantId],
    queryFn: async () => {
      if (!tenantId) {
        console.log('❌ useFrontDeskKPIs: No tenantId available');
        return null;
      }

      console.log('🔄 useFrontDeskKPIs: Fetching KPIs for tenant:', tenantId);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString().split('T')[0];
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowISO = tomorrow.toISOString().split('T')[0];

      try {
        // Get room counts by status
        const { data: rooms, error: roomsError } = await supabase
          .from('rooms')
          .select('status')
          .eq('tenant_id', tenantId);

        if (roomsError) {
          console.error('❌ Error fetching rooms:', roomsError);
          throw roomsError;
        }

        console.log('✅ Rooms fetched:', rooms?.length || 0);

        // Get today's arrivals (bookings checking in today)
        // KPI-ARRIVALS-FIX-V1: Use date range for timestamptz column
        const { data: arrivals, error: arrivalsError } = await supabase
          .from('bookings')
          .select('id')
          .eq('tenant_id', tenantId)
          .in('status', ['reserved', 'confirmed'])
          .gte('check_in', todayISO)
          .lt('check_in', tomorrowISO);

        if (arrivalsError) console.error('❌ Error fetching arrivals:', arrivalsError);
        console.log('✅ Arrivals today:', arrivals?.length || 0);

        // Get today's departures (bookings checking out today)
        const { data: departures, error: departuresError } = await supabase
          .from('bookings')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('status', 'checked_in')
          .eq('check_out', todayISO);

        if (departuresError) console.error('❌ Error fetching departures:', departuresError);
        console.log('✅ Departures today:', departures?.length || 0);

        // Get current guests (checked in and not overstaying)
        const { data: inHouse, error: inHouseError } = await supabase
          .from('bookings')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('status', 'checked_in')
          .gte('check_out', todayISO);

        if (inHouseError) console.error('❌ Error fetching in-house:', inHouseError);
        console.log('✅ In-house guests:', inHouse?.length || 0);

        // Get pending payments
        const { data: pendingPayments, error: paymentsError } = await supabase
          .from('payments')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('status', 'pending');

        if (paymentsError) console.error('❌ Error fetching pending payments:', paymentsError);
        console.log('✅ Pending payments:', pendingPayments?.length || 0);

        // Get overstays (checked-in bookings past check-out date)
        const { data: overstays, error: overstaysError } = await supabase
          .from('bookings')
          .select('id, room_id')
          .eq('tenant_id', tenantId)
          .eq('status', 'checked_in')
          .lt('check_out', todayISO);

        if (overstaysError) console.error('❌ Error fetching overstays:', overstaysError);
        console.log('✅ Overstays:', overstays?.length || 0);

        // Mark rooms as overstay
        if (overstays && overstays.length > 0) {
          const overstayRoomIds = overstays.map(b => b.room_id);
          await supabase
            .from('rooms')
            .update({ status: 'overstay' })
            .in('id', overstayRoomIds)
            .eq('status', 'occupied');
        }

        const available = rooms?.filter(r => r.status === 'available').length || 0;
        const occupied = rooms?.filter(r => r.status === 'occupied' || r.status === 'overstay').length || 0;
        const outOfService = rooms?.filter(r => r.status === 'maintenance').length || 0;

        const kpis = {
          available,
          occupied,
          arrivals: arrivals?.length || 0,
          departures: departures?.length || 0,
          inHouse: inHouse?.length || 0,
          pendingPayments: pendingPayments?.length || 0,
          outOfService,
          overstays: overstays?.length || 0,
          dieselLevel: 75,
        } as FrontDeskKPIs;

        console.log('📊 KPIs calculated:', kpis);
        return kpis;
      } catch (error) {
        console.error('❌ Fatal error in useFrontDeskKPIs:', error);
        throw error;
      }
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
    retry: 2,
  });

  return {
    kpis: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
