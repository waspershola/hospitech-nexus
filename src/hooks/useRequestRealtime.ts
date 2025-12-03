import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isElectronContext } from '@/lib/offline/offlineTypes';

/**
 * Real-time subscription for individual QR request
 * Ensures instant UI updates when billing_status, billed_amount, or activity log changes
 */
export function useRequestRealtime(requestId: string | undefined, tenantId: string | undefined) {
  const queryClient = useQueryClient();
  const registeredChannelId = useRef<string | null>(null);

  const handleRequestUpdate = useCallback((payload: any) => {
    queryClient.invalidateQueries({ queryKey: ['qr-request', requestId] });
    queryClient.invalidateQueries({ queryKey: ['qr-request-detail', requestId] });
    queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
    queryClient.invalidateQueries({ queryKey: ['request-activity-log', requestId] });
    if (payload.new) {
      queryClient.setQueryData(['qr-request-detail', requestId], payload.new);
    }
  }, [queryClient, requestId]);

  const handleActivityInsert = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['request-activity-log', requestId] });
  }, [queryClient, requestId]);

  useEffect(() => {
    if (!requestId || !tenantId) return;

    const isElectron = isElectronContext();

    // For Electron: Use registry for lifecycle management
    if (isElectron) {
      import('@/lib/offline/offlineRuntimeController').then(({ offlineRuntimeController }) => {
        const channelId = offlineRuntimeController.registerRealtimeChannel({
          id: `request-${requestId}`,
          channelName: `request-${requestId}`,
          postgresChanges: [
            {
              event: 'UPDATE',
              table: 'requests',
              filter: `id=eq.${requestId}`,
              handler: handleRequestUpdate
            },
            {
              event: 'INSERT',
              table: 'request_activity_log',
              filter: `request_id=eq.${requestId}`,
              handler: handleActivityInsert
            }
          ]
        });
        registeredChannelId.current = channelId;
      });

      return () => {
        if (registeredChannelId.current) {
          import('@/lib/offline/offlineRuntimeController').then(({ offlineRuntimeController }) => {
            offlineRuntimeController.unregisterRealtimeChannel(registeredChannelId.current!);
            registeredChannelId.current = null;
          });
        }
      };
    }

    // For SPA: Direct subscription
    const channel = supabase
      .channel(`request-${requestId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'requests',
        filter: `id=eq.${requestId}`,
      }, handleRequestUpdate)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'request_activity_log',
        filter: `request_id=eq.${requestId}`,
      }, handleActivityInsert)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, tenantId, handleRequestUpdate, handleActivityInsert]);
}
