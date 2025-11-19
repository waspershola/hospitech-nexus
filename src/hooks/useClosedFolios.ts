import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ClosedFolio {
  id: string;
  folio_number: string;
  folio_type: string;
  balance: number;
  total_charges: number;
  total_payments: number;
  status: string;
  created_at: string;
  updated_at: string;
  booking: {
    booking_reference: string;
    check_in: string;
    check_out: string;
    status: string;
  };
  guest: {
    name: string;
    email?: string;
    phone?: string;
  };
  room: {
    number: string;
  };
}

/**
 * Hook for fetching closed folios with filtering
 * Version: MULTI-FOLIO-V1
 */
export function useClosedFolios(filters?: {
  startDate?: string;
  endDate?: string;
  folioType?: string;
  guestName?: string;
}) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['closed-folios', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
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

      if (filters?.startDate) {
        query = query.gte('updated_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('updated_at', filters.endDate);
      }
      if (filters?.folioType) {
        query = query.eq('folio_type', filters.folioType);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];
      if (filters?.guestName) {
        const searchTerm = filters.guestName.toLowerCase();
        filteredData = filteredData.filter((folio: any) =>
          folio.guest?.name?.toLowerCase().includes(searchTerm)
        );
      }

      return filteredData as ClosedFolio[];
    },
    enabled: !!tenantId,
  });
}
