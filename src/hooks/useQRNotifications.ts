import { useEffect, useRef, useCallback } from 'react';
import { useRingtone } from './useRingtone';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStore } from '@/state/networkStore';
import { isElectronContext } from '@/lib/offline/offlineTypes';

const DEBUG_QR_NOTIFICATIONS = false;

/**
 * Check if currently offline
 */
function isNetworkOffline(): boolean {
  if (!isElectronContext()) return false;
  if (window.__HARD_OFFLINE__ === true) return true;
  const s = window.__NETWORK_STATE__;
  return s?.hardOffline === true || s?.online === false;
}

export function useQRNotifications() {
  const { playRingtone, permissionGranted } = useRingtone();
  const { tenantId } = useAuth();
  const { online, hardOffline } = useNetworkStore();
  const registeredChannelId = useRef<string | null>(null);

  // Stable handlers wrapped in refs to avoid effect re-runs
  const handlersRef = useRef({ playRingtone, permissionGranted });
  handlersRef.current = { playRingtone, permissionGranted };

  const handleBroadcast = useCallback((payload: any) => {
    const data = payload.payload;
    if (DEBUG_QR_NOTIFICATIONS) {
      console.log('[useQRNotifications] Broadcast received:', data);
    }
    
    if (data?.request) {
      const request = data.request;
      if (handlersRef.current.permissionGranted) {
        handlersRef.current.playRingtone('/sounds/notification-default.mp3');
      }
      toast.info('New QR Request', {
        description: `${request.type?.replace('_', ' ')} from ${request.metadata?.room_number || 'guest'}`,
      });
    }
  }, []);

  const handleRequestInsert = useCallback((payload: any) => {
    const request = payload.new as any;
    if (DEBUG_QR_NOTIFICATIONS) {
      console.log('[useQRNotifications] Request INSERT:', request.id);
    }
    if (handlersRef.current.permissionGranted) {
      handlersRef.current.playRingtone('/sounds/notification-default.mp3');
    }
    toast.info('New QR Request', {
      description: `${request.type?.replace('_', ' ')} from ${request.metadata?.room_number || 'guest'}`,
    });
  }, []);

  const handleMessageInsert = useCallback((payload: any, expectedTenantId: string) => {
    const message = payload.new as any;
    if (message.tenant_id !== expectedTenantId) {
      console.warn('[useQRNotifications] Cross-tenant blocked');
      return;
    }
    if (DEBUG_QR_NOTIFICATIONS) {
      console.log('[useQRNotifications] Message INSERT:', message.id);
    }
    if (handlersRef.current.permissionGranted) {
      handlersRef.current.playRingtone('/sounds/notification-default.mp3');
    }
    toast.info('New Message', {
      description: message.message?.substring(0, 50) + (message.message?.length > 50 ? '...' : ''),
    });
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    
    const isElectron = isElectronContext();

    // Skip if offline in Electron
    if (isElectron && (isNetworkOffline() || hardOffline || !online)) {
      console.log('[useQRNotifications] Offline, skipping');
      return;
    }

    // For Electron: Use registry for lifecycle management
    if (isElectron) {
      import('@/lib/offline/offlineRuntimeController').then(({ offlineRuntimeController }) => {
        const channelId = offlineRuntimeController.registerRealtimeChannel({
          id: `qr-notifications-${tenantId}`,
          channelName: `qr-notifications-${tenantId}`,
          broadcasts: [
            { event: 'new_qr_request', handler: handleBroadcast }
          ],
          postgresChanges: [
            {
              event: 'INSERT',
              table: 'requests',
              filter: `qr_token=not.is.null,tenant_id=eq.${tenantId}`,
              handler: handleRequestInsert
            },
            {
              event: 'INSERT',
              table: 'guest_communications',
              filter: `direction=eq.inbound,tenant_id=eq.${tenantId}`,
              handler: (payload) => handleMessageInsert(payload, tenantId)
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

    // For SPA: Direct subscription (simple, no offline management)
    if (DEBUG_QR_NOTIFICATIONS) {
      console.log('[useQRNotifications] SPA mode - direct subscription');
    }

    const channel = supabase
      .channel(`qr-notifications-${tenantId}`)
      .on('broadcast', { event: 'new_qr_request' }, handleBroadcast)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'requests',
        filter: `qr_token=not.is.null,tenant_id=eq.${tenantId}`,
      }, handleRequestInsert)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'guest_communications',
        filter: `direction=eq.inbound,tenant_id=eq.${tenantId}`,
      }, (payload) => handleMessageInsert(payload, tenantId))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, online, hardOffline, handleBroadcast, handleRequestInsert, handleMessageInsert]);
}
