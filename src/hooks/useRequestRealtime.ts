import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * PAYMENT-FIX-V2: Real-time subscription for individual QR request
 * Ensures instant UI updates when billing_status or billed_amount changes
 */
export function useRequestRealtime(requestId: string | undefined, tenantId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!requestId || !tenantId) return;

    console.log('[useRequestRealtime] PAYMENT-FIX-V2: Setting up subscription for request:', requestId);

    const channel = supabase
      .channel(`request-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          console.log('[useRequestRealtime] PAYMENT-FIX-V2: Request updated:', payload.new);
          
          // Force immediate refetch of request data
          queryClient.invalidateQueries({ queryKey: ['qr-request', requestId] });
          queryClient.invalidateQueries({ queryKey: ['qr-request-detail', requestId] });
          queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
          
          // Optimistically update if we have the data
          if (payload.new) {
            queryClient.setQueryData(['qr-request-detail', requestId], payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('[useRequestRealtime] PAYMENT-FIX-V2: Subscription status:', status);
      });

    return () => {
      console.log('[useRequestRealtime] PAYMENT-FIX-V2: Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [requestId, tenantId, queryClient]);
}
