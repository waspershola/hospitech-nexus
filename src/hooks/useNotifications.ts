import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useRingtone } from '@/hooks/useRingtone';

export interface Notification {
  id: string;
  type: 'new_request' | 'new_message' | 'request_updated';
  title: string;
  message: string;
  request_id: string;
  read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { tenantId, user } = useAuth();
  const { playRingtone } = useRingtone();

  useEffect(() => {
    if (!tenantId || !user) return;

    // Subscribe to new requests
    const requestsChannel = supabase
      .channel('requests-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'requests',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newRequest = payload.new as any;
          const requestMetadata = typeof newRequest.metadata === 'object' ? newRequest.metadata : {};
          const guestName = requestMetadata?.guest_name || 'Guest';
          
          // Create notification
          const notification: Notification = {
            id: `req-${newRequest.id}-${Date.now()}`,
            type: 'new_request',
            title: 'New Guest Request',
            message: `${newRequest.type.replace('_', ' ')} request from ${guestName}`,
            request_id: newRequest.id,
            read: false,
            created_at: newRequest.created_at,
            metadata: requestMetadata,
          };

          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Play notification sound for QR requests
          if (newRequest.qr_token) {
            playRingtone('/sounds/notification-default.mp3');
          }

          // Show toast notification
          toast.info(notification.title, {
            description: notification.message,
            action: {
              label: 'View',
              onClick: () => {
                window.location.href = `/dashboard/guest-requests`;
              },
            },
          });
        }
      )
      .subscribe();

    // Subscribe to new messages in guest_communications
    const messagesChannel = supabase
      .channel('messages-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'guest_communications',
          filter: `tenant_id=eq.${tenantId}`,
        },
        async (payload) => {
          const newMessage = payload.new as any;
          const messageMetadata = typeof newMessage.metadata === 'object' ? newMessage.metadata : {};
          
          // Only notify if it's an inbound message from guest
          if (newMessage.direction === 'inbound' && messageMetadata?.request_id) {
            const requestId = messageMetadata.request_id;

            // Fetch request details
            const { data: request } = await supabase
              .from('requests')
              .select('type, metadata')
              .eq('id', requestId)
              .single();

            if (request) {
              const requestMeta = typeof request.metadata === 'object' && 
                                  request.metadata !== null && 
                                  !Array.isArray(request.metadata) 
                                    ? request.metadata as Record<string, any>
                                    : {};
              const guestName = requestMeta.guest_name || 'Guest';
              
              const notification: Notification = {
                id: `msg-${newMessage.id}-${Date.now()}`,
                type: 'new_message',
                title: 'New Message',
                message: `Message from ${guestName}: ${newMessage.message.substring(0, 50)}...`,
                request_id: requestId,
                read: false,
                created_at: newMessage.created_at,
                metadata: { message_id: newMessage.id },
              };

              setNotifications(prev => [notification, ...prev]);
              setUnreadCount(prev => prev + 1);

              // Play notification sound
              playRingtone('/sounds/notification-default.mp3');

              // Show toast notification
              toast.info(notification.title, {
                description: notification.message,
                action: {
                  label: 'View',
                  onClick: () => {
                    window.location.href = `/dashboard/guest-requests`;
                  },
                },
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to request status updates
    const updatesChannel = supabase
      .channel('request-updates-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const oldRequest = payload.old as any;
          const newRequest = payload.new as any;

          // Only notify on status change
          if (oldRequest.status !== newRequest.status) {
            const notification: Notification = {
              id: `upd-${newRequest.id}-${Date.now()}`,
              type: 'request_updated',
              title: 'Request Updated',
              message: `Request status changed to ${newRequest.status}`,
              request_id: newRequest.id,
              read: false,
              created_at: new Date().toISOString(),
              metadata: {
                old_status: oldRequest.status,
                new_status: newRequest.status,
              },
            };

            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      requestsChannel.unsubscribe();
      messagesChannel.unsubscribe();
      updatesChannel.unsubscribe();
    };
  }, [tenantId, user]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);
  };

  const clearNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  };
}
