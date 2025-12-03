import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays } from 'date-fns';
import { useTodayArrivals } from '@/hooks/useTodayArrivals';
import { useNetworkStore } from '@/state/networkStore';
import { isNetworkOffline, getCachedRooms, getCachedBookings } from '@/lib/offline/offlineDataService';

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
  _offline?: boolean;
}

/**
 * Compute KPIs from cached IndexedDB data
 */
async function computeKPIsFromCache(tenantId: string): Promise<Omit<FrontDeskKPIs, 'arrivals'>> {
  const todayISO = format(new Date(), 'yyyy-MM-dd');
  
  const [rooms, bookings] = await Promise.all([
    getCachedRooms(tenantId),
    getCachedBookings(tenantId),
  ]);
  
  const available = rooms.filter(r => r.status === 'available').length;
  const occupied = rooms.filter(r => r.status === 'occupied').length;
  const outOfService = rooms.filter(r => r.status === 'maintenance').length;
  
  // Departures: checked_in bookings with check_out today
  const departures = bookings.filter(b => {
    const checkOutDate = b.check_out.split('T')[0];
    return b.status === 'checked_in' && checkOutDate === todayISO;
  }).length;
  
  // In-house: checked_in bookings with check_out >= today
  const inHouse = bookings.filter(b => {
    const checkOutDate = b.check_out.split('T')[0];
    return b.status === 'checked_in' && checkOutDate >= todayISO;
  }).length;
  
  // Overstays: checked_in bookings with check_out < today
  const overstays = bookings.filter(b => {
    const checkOutDate = b.check_out.split('T')[0];
    return b.status === 'checked_in' && checkOutDate < todayISO;
  }).length;
  
  return {
    available,
    occupied,
    departures,
    inHouse,
    pendingPayments: 0, // Can't compute offline without payments cache
    outOfService,
    overstays,
    dieselLevel: 75,
    _offline: true,
  };
}

export function useFrontDeskKPIs() {
  const { tenantId } = useAuth();
  const { hardOffline } = useNetworkStore();
  
  // ARRIVALS-FIX-V2: Use shared hook for consistent arrivals data
  const { data: todayArrivals = [], isLoading: arrivalsLoading } = useTodayArrivals();

  const query = useQuery({
    queryKey: ['frontdesk-kpis', tenantId],
    queryFn: async () => {
      if (!tenantId) {
        console.log('❌ useFrontDeskKPIs: No tenantId available');
        return null;
      }

      // OFFLINE-KPI-V1: Compute from cache when offline
      if (isNetworkOffline()) {
        console.log('[useFrontDeskKPIs] OFFLINE-V1: Computing from cache');
        return computeKPIsFromCache(tenantId);
      }

      console.log('🔄 useFrontDeskKPIs: Fetching KPIs for tenant:', tenantId);

      // TIMEZONE-FIX-V1: Use date-fns format for local timezone
      const todayISO = format(new Date(), 'yyyy-MM-dd');
      const tomorrowISO = format(addDays(new Date(), 1), 'yyyy-MM-dd');

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

        // ARRIVALS-FIX-V2: Return KPIs without arrivals (will be merged outside)
        const kpis = {
          available,
          occupied,
          departures: departures?.length || 0,
          inHouse: inHouse?.length || 0,
          pendingPayments: pendingPayments?.length || 0,
          outOfService,
          overstays: overstays?.length || 0,
          dieselLevel: 75,
        };

        console.log('📊 KPIs calculated (without arrivals):', kpis);
        return kpis;
      } catch (error) {
        console.error('❌ Fatal error in useFrontDeskKPIs:', error);
        throw error;
      }
    },
    enabled: !!tenantId,
    refetchInterval: hardOffline ? false : 30000,
    retry: hardOffline ? false : 2,
  });

  // ARRIVALS-FIX-V2: Merge arrivals count OUTSIDE queryFn to avoid stale closure
  const kpisWithArrivals = query.data ? {
    ...query.data,
    arrivals: todayArrivals.length,
  } as FrontDeskKPIs : null;

  console.log('[KPI-ARRIVALS-V2] Fresh arrivals count:', todayArrivals.length);

  return {
    kpis: kpisWithArrivals,
    isLoading: query.isLoading || arrivalsLoading,
    error: query.error,
  };
}
