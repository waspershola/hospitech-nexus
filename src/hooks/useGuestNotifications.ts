/**
 * Global Guest Notification System
 * 
 * Provides real-time notifications for guests on all QR portal pages.
 * Plays sound and shows toast when staff replies.
 */

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRingtone } from './useRingtone';

interface UseGuestNotificationsOptions {
  tenantId: string;
  qrToken: string;
  enabled?: boolean;
}

export function useGuestNotifications({
  tenantId,
  qrToken,
  enabled = true,
}: UseGuestNotificationsOptions) {
  const { playRingtone } = useRingtone();

  useEffect(() => {
    if (!enabled || !tenantId || !qrToken) {
      console.log('[GUEST-NOTIFICATIONS-DEBUG] Subscription disabled:', {
        enabled,
        tenantId: !!tenantId,
        qrToken: !!qrToken,
      });
      return;
    }

    console.log('[GUEST-NOTIFICATIONS-V5-DEBUG] Setting up global listener:', {
      qrToken,
      tenantId,
      enabled,
      timestamp: new Date().toISOString(),
    });

    // PHASE-4: Fix Supabase filter - use table-level subscription with client-side filtering
    // The metadata->>qr_token filter doesn't work reliably for JSONB columns
    const channel = supabase
      .channel(`guest-notifications-${qrToken}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'guest_communications',
          // Remove unreliable JSONB filter, do client-side filtering instead
        },
        (payload) => {
          console.log('[GUEST-NOTIFICATIONS-OPTION-C-DEBUG] Received INSERT event:', {
            messageId: payload.new?.id,
            direction: payload.new?.direction,
            messageQrToken: payload.new?.metadata?.qr_token,
            targetQrToken: qrToken,
            match: payload.new?.metadata?.qr_token === qrToken,
          });

          const message = payload.new as any;
          
          // Client-side filter for qr_token
          const messageQrToken = message.metadata?.qr_token;
          if (messageQrToken !== qrToken) {
            console.log('[GUEST-NOTIFICATIONS-OPTION-C-DEBUG] Filtered out - not for this guest');
            return; // Not for this guest
          }
          
          // Only notify for staff replies (outbound messages)
          if (message.direction === 'outbound' && message.tenant_id === tenantId) {
            console.log('[GUEST-NOTIFICATIONS-V5] ✅ New staff reply received, triggering notification', {
              messageId: message.id,
              timestamp: new Date().toISOString(),
            });
            
            // ALWAYS play sound for guest notifications (no suppression)
            console.log('[GUEST-NOTIFICATIONS-V5] 🔔 Attempting to play ringtone');
            try {
              playRingtone('/sounds/notification-default.mp3', { volume: 0.5 });
              console.log('[GUEST-NOTIFICATIONS-V5] ✅ Ringtone playback initiated');
            } catch (error) {
              console.error('[GUEST-NOTIFICATIONS-V5] ❌ Ringtone playback failed:', error);
            }
            
            // Always show toast notification
            toast.info('New message from Hotel Staff', {
              description: message.message?.substring(0, 100) || 'Staff has replied to your request',
              duration: 5000,
            });
            console.log('[GUEST-NOTIFICATIONS-V5] 💬 Toast notification displayed');
          } else {
            console.log('[GUEST-NOTIFICATIONS-V5] ⏭️ Message filtered out:', {
              direction: message.direction,
              isOutbound: message.direction === 'outbound',
              tenantMatch: message.tenant_id === tenantId,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[GUEST-NOTIFICATIONS-V5-DEBUG] Subscription status:', {
          status,
          channelName: `guest-notifications-${qrToken}`,
          timestamp: new Date().toISOString(),
        });
      });

    return () => {
      console.log('[GUEST-NOTIFICATIONS-V5] Cleaning up global listener');
      supabase.removeChannel(channel);
    };
  }, [tenantId, qrToken, enabled, playRingtone]);
}
