import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { HotelFinancials } from '@/lib/finance/types';

export function useFinancials() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['hotel-financials', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('hotel_financials')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        // Return defaults if no settings exist
        return {
          vat_rate: 0,
          vat_inclusive: false,
          service_charge: 0,
          service_charge_inclusive: false,
          currency: 'NGN',
        } as HotelFinancials;
      }
      
      return data as HotelFinancials;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
