import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useOrderDetails(requestId: string | undefined) {
  return useQuery({
    queryKey: ['order-details', requestId],
    queryFn: async () => {
      if (!requestId) return null;

      console.log('[useOrderDetails] Fetching order for request:', requestId);

      // Try to fetch guest_order by request_id (for menu/room service)
      const { data: order, error } = await supabase
        .from('guest_orders')
        .select('*')
        .eq('request_id', requestId)
        .maybeSingle();

      if (error) {
        console.error('[useOrderDetails] Error fetching order:', error);
        throw error;
      }

      if (order) {
        console.log('[useOrderDetails] Order data:', order);
        return { type: 'order', data: order };
      }

      // Fallback: fetch request metadata (for spa/laundry/dining)
      console.log('[useOrderDetails] No order found, fetching request metadata');
      const { data: request, error: requestError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) {
        console.error('[useOrderDetails] Error fetching request:', requestError);
        throw requestError;
      }

      if (!request) return null;

      console.log('[useOrderDetails] Request metadata:', request.metadata);
      
      // Parse service-specific metadata
      return {
        type: 'request',
        data: {
          ...(request.metadata as Record<string, any>),
          type: request.type,
          status: request.status,
          note: request.note,
          created_at: request.created_at,
        }
      };
    },
    enabled: !!requestId,
  });
}
