import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef, useCallback } from 'react';
import { useRingtone } from './useRingtone';
import { isElectronContext } from '@/lib/offline/offlineTypes';

/**
 * QR Billing Tasks Hook
 * Fetches pending billing tasks and sets up realtime notifications
 */
export function useQRBillingTasks() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const { playRingtone } = useRingtone();
  const registeredChannelId = useRef<string | null>(null);

  // Fetch pending billing tasks count
  const { data: count = 0 } = useQuery({
    queryKey: ['qr-billing-tasks-count', tenantId],
    queryFn: async () => {
      if (!tenantId) return 0;

      const { count, error } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('billing_status', 'pending_frontdesk')
        .eq('billing_routed_to', 'frontdesk');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  // Stable handler ref
  const handlersRef = useRef({ playRingtone, queryClient, tenantId });
  handlersRef.current = { playRingtone, queryClient, tenantId };

  const handleBillingUpdate = useCallback((payload: any) => {
    const newRow = payload.new as any;
    if (
      newRow.billing_status === 'pending_frontdesk' &&
      newRow.billing_routed_to === 'frontdesk' &&
      newRow.billing_reference_code
    ) {
      handlersRef.current.playRingtone('/sounds/notification-default.mp3', { volume: 0.7 });
      handlersRef.current.queryClient.invalidateQueries({ 
        queryKey: ['qr-billing-tasks-count', handlersRef.current.tenantId] 
      });
      handlersRef.current.queryClient.invalidateQueries({ 
        queryKey: ['qr-billing-tasks', handlersRef.current.tenantId] 
      });
    }
  }, []);

  useEffect(() => {
    if (!tenantId) return;

    const isElectron = isElectronContext();

    // For Electron: Use registry
    if (isElectron) {
      import('@/lib/offline/offlineRuntimeController').then(({ offlineRuntimeController }) => {
        const channelId = offlineRuntimeController.registerRealtimeChannel({
          id: `qr-billing-${tenantId}`,
          channelName: `qr-billing-${tenantId}`,
          postgresChanges: [
            {
              event: 'UPDATE',
              table: 'requests',
              filter: `tenant_id=eq.${tenantId}`,
              handler: handleBillingUpdate
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
      .channel(`qr-billing-${tenantId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'requests',
        filter: `tenant_id=eq.${tenantId}`,
      }, handleBillingUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, handleBillingUpdate]);

  return {
    count,
  };
}
