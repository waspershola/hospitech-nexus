import { useEffect } from 'react';
import { useRingtone } from './useRingtone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useQRNotifications() {
  const { playRingtone, permissionGranted } = useRingtone();
  const { tenantId } = useAuth();

  useEffect(() => {
    if (!tenantId) return;

    console.log('[useQRNotifications] Setting up notification listeners for tenant:', tenantId);

    const channel = supabase
      .channel('qr-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'requests',
        filter: `qr_token=not.is.null,tenant_id=eq.${tenantId}`,
      }, (payload) => {
        const request = payload.new as any;
        
        console.log('[useQRNotifications] New QR request detected:', request.id);
        
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
        filter: `direction=eq.inbound`,
      }, (payload) => {
        const message = payload.new as any;
        
        console.log('[useQRNotifications] New inbound message detected:', message.id);
        
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
        console.log('[useQRNotifications] Subscription status:', status);
      });

    return () => {
      console.log('[useQRNotifications] Cleaning up notification listeners');
      supabase.removeChannel(channel);
    };
  }, [tenantId, permissionGranted, playRingtone]);
}
