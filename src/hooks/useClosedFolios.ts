import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useClosedFolios() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['closed-folios', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('stay_folios')
        .select(`
          *,
          booking:bookings(
            booking_reference,
            check_in,
            check_out,
            status
          ),
          guest:guests(
            name,
            email,
            phone
          ),
          room:rooms(
            number
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'closed')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });
}
