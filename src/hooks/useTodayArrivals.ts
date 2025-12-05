import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isOfflineMode } from '@/lib/offline/requestInterceptor';
import { format, addDays } from 'date-fns';

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
}

/**
 * ARRIVALS-SHARED-V1: Single source of truth for today's arrivals
 * Used by both useFrontDeskKPIs and BulkCheckInDrawer
 * Ensures consistent query logic and cache sharing
 */
export function useTodayArrivals() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['today-arrivals', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Phase 14B: Return empty when offline in Electron
      if (isOfflineMode()) {
        console.log('[useTodayArrivals] Offline: Returning empty array');
        return [];
      }

      // TIMEZONE-FIX-V1: Calculate fresh local date at query time
      const todayISO = format(new Date(), 'yyyy-MM-dd');
      const tomorrowISO = format(addDays(new Date(), 1), 'yyyy-MM-dd');

      console.log('[ARRIVALS-SHARED-V1] Query params:', {
        tenantId,
        todayISO,
        tomorrowISO,
        localNow: new Date().toString(),
        serverOffset: new Date().getTimezoneOffset()
      });

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
          guest:guests!inner(name, phone, email),
          room:rooms!inner(
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
        console.error('[ARRIVALS-SHARED-V1] Query error:', error);
        throw error;
      }

      console.log('[ARRIVALS-SHARED-V1] Results:', {
        count: data?.length || 0,
        bookings: data?.map(b => ({
          ref: b.booking_reference,
          guest: b.guest?.name,
          room: b.room?.number,
          checkIn: b.check_in
        }))
      });

      return (data || []) as TodayArrival[];
    },
    enabled: !!tenantId,
    staleTime: 30000, // 30 seconds - balance between freshness and performance
    refetchOnWindowFocus: true,
  });
}
