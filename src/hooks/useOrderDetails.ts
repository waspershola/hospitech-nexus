import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useOrderDetails(requestId: string | undefined) {
  return useQuery({
    queryKey: ['order-details', requestId],
    queryFn: async () => {
      if (!requestId) return null;

      console.log('[useOrderDetails] Fetching order for request:', requestId);

      const { data, error } = await supabase
        .from('guest_orders')
        .select('*')
        .eq('request_id', requestId)
        .maybeSingle();

      if (error) {
        console.error('[useOrderDetails] Error fetching order:', error);
        throw error;
      }

      console.log('[useOrderDetails] Order data:', data);
      return data;
    },
    enabled: !!requestId,
  });
}
