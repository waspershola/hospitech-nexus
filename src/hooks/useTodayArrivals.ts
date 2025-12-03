import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays } from 'date-fns';
import { useNetworkStore } from '@/state/networkStore';
import { isNetworkOffline, getCachedBookings, getCachedRooms, getCachedGuests, updateCache } from '@/lib/offline/offlineDataService';
import { isElectronContext } from '@/lib/offline/offlineTypes';

export interface TodayArrival {
  id: string;
  booking_reference: string | null;
  check_in: string;
  check_out: string;
  room_id: string;
  guest_id: string;
  status: string | null;
  total_amount: number | null;
  guest?: {
    name: string;
    phone: string | null;
    email: string | null;
  };
  room?: {
    number: string;
    category?: {
      name: string;
    };
  };
  _offline?: boolean;
}

/**
 * ARRIVALS-SHARED-V1: Single source of truth for today's arrivals
 * ARRIVALS-FIX-V2: Uses explicit FK syntax to avoid PGRST201 error
 * Used by both useFrontDeskKPIs and BulkCheckInDrawer
 * Ensures consistent query logic and cache sharing
 */
export function useTodayArrivals() {
  const { tenantId } = useAuth();
  const { hardOffline } = useNetworkStore();

  return useQuery({
    queryKey: ['today-arrivals', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // TIMEZONE-FIX-V1: Calculate fresh local date at query time
      const todayISO = format(new Date(), 'yyyy-MM-dd');
      const tomorrowISO = format(addDays(new Date(), 1), 'yyyy-MM-dd');

      console.log('[ARRIVALS-SHARED-V2] Query params:', {
        tenantId,
        todayISO,
        tomorrowISO,
        offline: isElectronContext() && isNetworkOffline(),
        localNow: new Date().toString(),
      });

      // ELECTRON-ONLY-V1: Load from cache when offline (only in Electron)
      if (isElectronContext() && isNetworkOffline()) {
        console.log('[ARRIVALS-SHARED-V2] OFFLINE: Loading from IndexedDB cache (Electron)');
        
        const [cachedBookings, cachedRooms, cachedGuests] = await Promise.all([
          getCachedBookings(tenantId, todayISO, tomorrowISO),
          getCachedRooms(tenantId),
          getCachedGuests(tenantId),
        ]);
        
        // Filter arrivals: reserved status, check-in today
        const arrivals = cachedBookings
          .filter(b => {
            const checkInDate = b.check_in.split('T')[0];
            return b.status === 'reserved' && checkInDate >= todayISO && checkInDate < tomorrowISO;
          })
          .map(b => {
            const room = cachedRooms.find(r => r.id === b.room_id);
            const guest = cachedGuests.find(g => g.id === b.guest_id);
            return {
              id: b.id,
              booking_reference: b.booking_reference,
              check_in: b.check_in,
              check_out: b.check_out,
              room_id: b.room_id,
              guest_id: b.guest_id,
              status: b.status,
              total_amount: b.total_amount,
              guest: guest ? { name: guest.name, phone: guest.phone, email: guest.email } : undefined,
              room: room ? { number: room.number, category: room.category } : undefined,
              _offline: true,
            } as TodayArrival;
          });
        
        console.log('[ARRIVALS-SHARED-V2] OFFLINE results:', arrivals.length);
        return arrivals;
      }

      // ARRIVALS-FIX-V2: Use explicit FK syntax to avoid PGRST201 ambiguous relationship error
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_reference,
          check_in,
          check_out,
          room_id,
          guest_id,
          status,
          total_amount,
          guest:guests!bookings_guest_id_fkey(name, phone, email),
          room:rooms!bookings_room_id_fkey(
            number,
            category:room_categories(name)
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'reserved')
        .gte('check_in', todayISO)
        .lt('check_in', tomorrowISO)
        .order('check_in', { ascending: true });

      if (error) {
        console.error('[ARRIVALS-SHARED-V2] Query error:', error);
        throw error;
      }

      console.log('[ARRIVALS-SHARED-V2] Results:', {
        count: data?.length || 0,
        bookings: data?.map(b => ({
          ref: b.booking_reference,
          guest: b.guest?.name,
          room: b.room?.number,
          checkIn: b.check_in
        }))
      });

      // Update cache in background
      if (data?.length) {
        updateCache(tenantId, 'bookings', data.map(d => ({
          id: d.id,
          booking_reference: d.booking_reference,
          check_in: d.check_in,
          check_out: d.check_out,
          room_id: d.room_id,
          guest_id: d.guest_id,
          status: d.status,
          total_amount: d.total_amount,
          metadata: null,
        }))).catch(() => {});
      }

      return (data || []) as TodayArrival[];
    },
    enabled: !!tenantId,
    staleTime: 30000,
    refetchOnWindowFocus: !hardOffline,
    retry: hardOffline ? false : 2,
  });
}
