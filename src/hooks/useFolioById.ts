import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to fetch a specific folio by ID with all related data
 * Used by Billing Center for detailed folio management
 */
export function useFolioById(folioId: string | null) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['folio-by-id', folioId, tenantId],
    queryFn: async () => {
      if (!folioId || !tenantId) return null;

      const { data, error } = await supabase
        .from('stay_folios')
        .select(`
          *,
          booking:bookings(
            booking_reference,
            check_in,
            check_out,
            total_amount,
            status,
            metadata
          ),
          guest:guests(
            name,
            email,
            phone
          ),
          room:rooms(
            number,
            room_type
          )
        `)
        .eq('id', folioId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!folioId && !!tenantId,
  });
}
