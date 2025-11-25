import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * PAYMENT-FIX-V2 + AUDIT-TRAIL-V2: Real-time subscription for individual QR request
 * Ensures instant UI updates when billing_status, billed_amount, or activity log changes
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
          
          // AUDIT-TRAIL-V2: Invalidate activity log when request changes
          queryClient.invalidateQueries({ queryKey: ['request-activity-log', requestId] });
          
          // Optimistically update if we have the data
          if (payload.new) {
            queryClient.setQueryData(['qr-request-detail', requestId], payload.new);
          }
        }
      )
      // AUDIT-TRAIL-V2: Listen to activity log changes  
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'request_activity_log',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          console.log('[useRequestRealtime] AUDIT-TRAIL-V2: Activity log updated:', payload.new);
          
          // Invalidate activity log query for real-time updates
          queryClient.invalidateQueries({ queryKey: ['request-activity-log', requestId] });
        }
      )
      .subscribe((status) => {
        console.log('[useRequestRealtime] PAYMENT-FIX-V2 + AUDIT-TRAIL-V2: Subscription status:', status);
      });

    return () => {
      console.log('[useRequestRealtime] PAYMENT-FIX-V2: Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [requestId, tenantId, queryClient]);
}
