import { useEffect } from 'react';
import { useRingtone } from './useRingtone';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { createRealtimeChannelWithRetry } from '@/lib/realtime/retryChannel';

const DEBUG_QR_NOTIFICATIONS = false;

export function useQRNotifications() {
  const { playRingtone, permissionGranted } = useRingtone();
  const { tenantId } = useAuth();

  useEffect(() => {
    if (!tenantId) return;

    if (DEBUG_QR_NOTIFICATIONS) {
      console.log('[useQRNotifications] Setting up notification listeners for tenant:', tenantId);
    }

    // PHASE-2: Use retry channel with exponential backoff
    const channel = createRealtimeChannelWithRetry(
      `qr-notifications-${tenantId}`,
      {
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 30000,
        onRetry: (attempt, delay) => {
          console.log(`[useQRNotifications] Retrying notification channel (${attempt}/5) in ${delay}ms`);
        },
        onFailure: () => {
          console.error('[useQRNotifications] Notification channel failed permanently');
        },
      }
    )
      // Phase 6: Listen to Realtime broadcast from edge function
      .on('broadcast', { event: 'new_qr_request' }, (payload) => {
        const data = payload.payload;
        if (DEBUG_QR_NOTIFICATIONS) {
          console.log('[useQRNotifications] Realtime broadcast received:', data);
        }
        
        if (data.request) {
          const request = data.request;
          
          // Play ringtone if permission granted
          if (permissionGranted) {
            playRingtone('/sounds/notification-default.mp3');
          }
          
          // Show toast notification
          toast.info('New QR Request', {
            description: `${request.service_category?.replace('_', ' ')} from ${request.metadata?.room_number || 'guest'}`,
          });
        }
      })
      // Fallback: Postgres changes subscription
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'requests',
        filter: `qr_token=not.is.null,tenant_id=eq.${tenantId}`,
      }, (payload) => {
        const request = payload.new as any;
        
        if (DEBUG_QR_NOTIFICATIONS) {
          console.log('[useQRNotifications] Postgres fallback: New QR request detected:', request.id);
        }
        
        // Play ringtone if permission granted
        if (permissionGranted) {
          playRingtone('/sounds/notification-default.mp3');
        }
        
        // Show toast notification
        toast.info('New QR Request', {
          description: `${request.service_category?.replace('_', ' ')} from ${request.metadata?.room_number || 'guest'}`,
        });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'guest_communications',
        filter: `direction=eq.inbound,tenant_id=eq.${tenantId}`, // PHASE-1B: Add tenant_id filter
      }, (payload) => {
        const message = payload.new as any;
        
        if (DEBUG_QR_NOTIFICATIONS) {
          console.log('[useQRNotifications] New inbound message detected:', message.id);
        }
        
        // Play ringtone if permission granted
        if (permissionGranted) {
          playRingtone('/sounds/notification-default.mp3');
        }
        
        // Show toast notification
        toast.info('New Message', {
          description: message.message?.substring(0, 50) + (message.message?.length > 50 ? '...' : ''),
        });
      })
      .subscribe();

    return () => {
      if (DEBUG_QR_NOTIFICATIONS) {
        console.log('[useQRNotifications] Cleaning up notification listeners');
      }
      
      // PHASE-2: Use custom cleanup if available
      if ((channel as any).cleanup) {
        (channel as any).cleanup();
      }
    };
  }, [tenantId, permissionGranted, playRingtone]);
}
