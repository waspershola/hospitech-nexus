import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useTodayPayments() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['today-payments', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          guest:guests(name),
          organization:organizations(name),
          recorded_by_profile:profiles!payments_recorded_by_fkey(full_name)
        `)
        .eq('tenant_id', tenantId)
        .gte('created_at', today) // Today's date
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}
