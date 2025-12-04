import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays } from 'date-fns';
import { useTodayArrivals } from '@/hooks/useTodayArrivals';
import { useNetworkStore } from '@/state/networkStore';
import { 
  isNetworkOffline, 
  getCachedRooms, 
  getCachedBookings,
  getCachedFrontDeskKPIs,
  cacheFrontDeskKPIs,
  formatRelativeSyncTime 
} from '@/lib/offline/offlineDataService';
import { isElectronContext } from '@/lib/offline/offlineTypes';

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
  _lastSyncedAt?: number;
  _lastSyncedDisplay?: string;
}

/**
 * Compute KPIs from cached IndexedDB data
 * OFFLINE-EXTREME-V1
 */
async function computeKPIsFromCache(tenantId: string): Promise<FrontDeskKPIs> {
  const todayISO = format(new Date(), 'yyyy-MM-dd');
  
  const [rooms, bookings] = await Promise.all([
    getCachedRooms(tenantId),
    getCachedBookings(tenantId),
  ]);
  
  const available = rooms.filter(r => r.status === 'available').length;
  const occupied = rooms.filter(r => r.status === 'occupied').length;
  const outOfService = rooms.filter(r => r.status === 'maintenance').length;
  
  // Arrivals: reserved bookings with check_in today
  const arrivals = bookings.filter(b => {
    const checkInDate = b.check_in.split('T')[0];
    return b.status === 'reserved' && checkInDate === todayISO;
  }).length;
  
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
  
  // Get last sync time from first room's cache metadata
  const lastSyncedAt = rooms[0]?.last_synced_at || null;
  
  return {
    available,
    occupied,
    arrivals,
    departures,
    inHouse,
    pendingPayments: 0,
    outOfService,
    overstays,
    dieselLevel: 75,
    _offline: true,
    _lastSyncedAt: lastSyncedAt || undefined,
    _lastSyncedDisplay: formatRelativeSyncTime(lastSyncedAt),
  };
}

export function useFrontDeskKPIs() {
  const { tenantId } = useAuth();
  const { hardOffline } = useNetworkStore();
  
  const { data: todayArrivals = [], isLoading: arrivalsLoading } = useTodayArrivals();

  const query = useQuery({
    queryKey: ['frontdesk-kpis', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const todayISO = format(new Date(), 'yyyy-MM-dd');

      // OFFLINE-EXTREME-V1: Check for cached KPIs first when offline
      if (isElectronContext() && isNetworkOffline()) {
        console.log('[useFrontDeskKPIs] OFFLINE-EXTREME-V1: Loading from cache');
        
        // Try cached KPI snapshot first
        const cachedKPI = await getCachedFrontDeskKPIs(tenantId, todayISO);
        if (cachedKPI) {
          return {
            ...cachedKPI,
            _offline: true,
            _lastSyncedAt: cachedKPI.last_synced_at,
            _lastSyncedDisplay: formatRelativeSyncTime(cachedKPI.last_synced_at),
          };
        }
        
        // Fallback to computing from cached data
        return computeKPIsFromCache(tenantId);
      }

      // Online path
      try {
        const { data: rooms } = await supabase
          .from('rooms')
          .select('status')
          .eq('tenant_id', tenantId);

        const { data: arrivals } = await supabase
          .from('bookings')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('status', 'reserved')
          .eq('check_in', todayISO);

        const { data: departures } = await supabase
          .from('bookings')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('status', 'checked_in')
          .eq('check_out', todayISO);

        const { data: inHouse } = await supabase
          .from('bookings')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('status', 'checked_in')
          .gte('check_out', todayISO);

        const { data: pendingPayments } = await supabase
          .from('payments')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('status', 'pending');

        const { data: overstays } = await supabase
          .from('bookings')
          .select('id, room_id')
          .eq('tenant_id', tenantId)
          .eq('status', 'checked_in')
          .lt('check_out', todayISO);

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
        };

        // OFFLINE-EXTREME-V1: Cache KPIs after successful fetch
        if (isElectronContext()) {
          cacheFrontDeskKPIs(tenantId, todayISO, kpis).catch(() => {});
        }

        return kpis;
      } catch (error) {
        console.error('[useFrontDeskKPIs] Error:', error);
        throw error;
      }
    },
    enabled: !!tenantId,
    refetchInterval: hardOffline ? false : 30000,
    retry: hardOffline ? false : 2,
    staleTime: 30000, // OFFLINE-EXTREME-V1: 30s stale time for better UX
  });

  const kpisWithArrivals = query.data ? {
    ...query.data,
    arrivals: todayArrivals.length,
  } as FrontDeskKPIs : null;

  return {
    kpis: kpisWithArrivals,
    isLoading: query.isLoading || arrivalsLoading,
    error: query.error,
  };
}
