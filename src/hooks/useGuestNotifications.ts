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
  guestSessionToken?: string; // GUEST-SESSION-SECURITY: Per-device session isolation
  requestIds?: string[]; // Guest's request IDs for fallback matching
  enabled?: boolean;
}

export function useGuestNotifications({
  tenantId,
  qrToken,
  guestSessionToken,
  requestIds = [],
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
          
          // GUEST-SESSION-SECURITY: Enhanced client-side filter with session token validation
          const messageQrToken = message.metadata?.qr_token;
          const messageRequestId = message.metadata?.request_id;
          const messageSessionToken = message.guest_session_token;
          
          // Primary: Match by session token (most secure)
          // Fallback: Match by QR token for legacy messages without session token
          // Additional fallback: Match by request ID
          const matchBySessionToken = guestSessionToken && messageSessionToken === guestSessionToken;
          const matchByQrToken = messageQrToken === qrToken;
          const matchByRequestId = requestIds.includes(messageRequestId);
          
          // Allow message if ANY match succeeds (with session token being strongest)
          const isMatch = matchBySessionToken || (matchByQrToken && !messageSessionToken) || matchByRequestId;
          
          if (!isMatch) {
            console.log('[GUEST-NOTIFICATIONS-SESSION-SECURITY] Filtered out - no match', {
              messageSessionToken: messageSessionToken?.substring(0, 8) + '...',
              targetSessionToken: guestSessionToken?.substring(0, 8) + '...',
              messageQrToken,
              targetQrToken: qrToken,
              messageRequestId,
              knownRequestIds: requestIds,
            });
            return; // Not for this guest's session
          }
          
          console.log('[GUEST-NOTIFICATIONS-SESSION-SECURITY] Match found', {
            matchedBy: matchBySessionToken ? 'session_token' : matchByQrToken ? 'qr_token' : 'request_id',
            messageSessionToken: messageSessionToken?.substring(0, 8) + '...',
            messageQrToken,
            messageRequestId,
          });
          
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
  }, [tenantId, qrToken, guestSessionToken, requestIds, enabled, playRingtone]);
}
