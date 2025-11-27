/**
 * PHASE-3: Global Guest Notification System
 * 
 * Provides real-time notifications for guests even when not in chat interface.
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
    if (!enabled || !tenantId || !qrToken) return;

    console.log('[GUEST-NOTIFICATIONS-V2] Setting up global listener for QR token:', qrToken);

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
          const message = payload.new as any;
          
          // Client-side filter for qr_token
          const messageQrToken = message.metadata?.qr_token;
          if (messageQrToken !== qrToken) {
            return; // Not for this guest
          }
          
          // Only notify for staff replies (outbound messages)
          if (message.direction === 'outbound' && message.tenant_id === tenantId) {
            console.log('[GUEST-NOTIFICATIONS-V2] New staff reply received');
            
            // Play notification sound
            playRingtone('/sounds/notification-default.mp3', { volume: 0.5 });
            
            // Show toast notification
            toast.info('New message from Hotel Staff', {
              description: message.message?.substring(0, 100) || 'Staff has replied to your request',
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[GUEST-NOTIFICATIONS-V2] Cleaning up global listener');
      supabase.removeChannel(channel);
    };
  }, [tenantId, qrToken, enabled, playRingtone]);
}
