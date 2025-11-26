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

    console.log('[GUEST-NOTIFICATIONS] Setting up global listener for QR token:', qrToken);

    // Subscribe to guest_communications for this QR token
    const channel = supabase
      .channel(`guest-notifications-${qrToken}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'guest_communications',
          filter: `metadata->>qr_token=eq.${qrToken}`,
        },
        (payload) => {
          const message = payload.new as any;
          
          // Only notify for staff replies (outbound messages)
          if (message.direction === 'outbound') {
            console.log('[GUEST-NOTIFICATIONS] New staff reply received');
            
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
      console.log('[GUEST-NOTIFICATIONS] Cleaning up global listener');
      supabase.removeChannel(channel);
    };
  }, [tenantId, qrToken, enabled, playRingtone]);
}
