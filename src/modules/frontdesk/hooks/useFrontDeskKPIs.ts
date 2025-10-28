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
  dieselLevel: number;
}

export function useFrontDeskKPIs() {
  const { tenantId } = useAuth();

  const query = useQuery({
    queryKey: ['frontdesk-kpis', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get room counts by status
      const { data: rooms } = await supabase
        .from('rooms')
        .select('status')
        .eq('tenant_id', tenantId);

      // Get today's arrivals
      const { data: arrivals } = await supabase
        .from('bookings')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'reserved')
        .gte('check_in', today.toISOString())
        .lt('check_in', tomorrow.toISOString());

      // Get today's departures
      const { data: departures } = await supabase
        .from('bookings')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'checked_in')
        .gte('check_out', today.toISOString())
        .lt('check_out', tomorrow.toISOString());

      // Get current guests (checked in)
      const { data: inHouse } = await supabase
        .from('bookings')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'checked_in');

      // Get pending payments
      const { data: pendingPayments } = await supabase
        .from('payments')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending');

      const available = rooms?.filter(r => r.status === 'available').length || 0;
      const occupied = rooms?.filter(r => r.status === 'occupied').length || 0;
      const outOfService = rooms?.filter(r => r.status === 'maintenance').length || 0;

      return {
        available,
        occupied,
        arrivals: arrivals?.length || 0,
        departures: departures?.length || 0,
        inHouse: inHouse?.length || 0,
        pendingPayments: pendingPayments?.length || 0,
        outOfService,
        dieselLevel: 75, // This would come from a custom metric in production
      } as FrontDeskKPIs;
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return {
    kpis: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
