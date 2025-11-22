import { useEffect } from 'react';
import { useRingtone } from './useRingtone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const DEBUG_QR_NOTIFICATIONS = false;

export function useQRNotifications() {
  const { playRingtone, permissionGranted } = useRingtone();
  const { tenantId } = useAuth();

  useEffect(() => {
    if (!tenantId) return;

    if (DEBUG_QR_NOTIFICATIONS) {
      console.log('[useQRNotifications] Setting up notification listeners for tenant:', tenantId);
    }

    const channel = supabase
      .channel(`qr-notifications-${tenantId}`)
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
      .subscribe((status) => {
        // Only log errors and channel errors
        if (status === 'CHANNEL_ERROR') {
          console.error('[useQRNotifications] Channel error - connection failed');
        } else if (status === 'TIMED_OUT') {
          console.warn('[useQRNotifications] Connection timed out - will retry');
        } else if (DEBUG_QR_NOTIFICATIONS) {
          console.log('[useQRNotifications] Subscription status:', status);
        }
      });

    return () => {
      if (DEBUG_QR_NOTIFICATIONS) {
        console.log('[useQRNotifications] Cleaning up notification listeners');
      }
      supabase.removeChannel(channel);
    };
  }, [tenantId, permissionGranted, playRingtone]);
}
