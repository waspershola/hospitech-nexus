import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessage {
  id: string;
  message: string;
  direction: 'inbound' | 'outbound';
  sent_by: string | null;
  sender_name: string;
  created_at: string;
}

interface UseQRChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  sendMessage: (message: string, guestName?: string) => Promise<boolean>;
  refreshMessages: () => Promise<void>;
}

export function useQRChat(requestId: string | null, qrToken: string | null): UseQRChatReturn {
  const { tenantId } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!requestId || !qrToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('qr-request', {
        body: {
          action: 'get_messages',
          request_id: requestId,
          qr_token: qrToken,
        },
      });

      if (functionError) {
        console.error('[useQRChat] Error fetching messages:', functionError);
        setError('Failed to load messages');
        setIsLoading(false);
        return;
      }

      if (!data?.success) {
        setError(data?.error || 'Failed to load messages');
        setIsLoading(false);
        return;
      }

      setMessages(data.data || []);
      setIsLoading(false);
    } catch (err) {
      console.error('[useQRChat] Unexpected error:', err);
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  }, [requestId, qrToken]);

  const sendMessage = async (message: string, guestName = 'Guest'): Promise<boolean> => {
    if (!requestId || !qrToken) {
      toast.error('Invalid request or token');
      return false;
    }

    if (!message.trim()) {
      toast.error('Message cannot be empty');
      return false;
    }

    setIsSending(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('qr-request', {
        body: {
          action: 'send_message',
          request_id: requestId,
          qr_token: qrToken,
          message: message.trim(),
          direction: 'inbound',
          guest_name: guestName,
        },
      });

      if (functionError) {
        console.error('[useQRChat] Error sending message:', functionError);
        toast.error('Failed to send message');
        setIsSending(false);
        return false;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Failed to send message');
        setIsSending(false);
        return false;
      }

      // Add message to local state immediately
      setMessages((prev) => [...prev, data.data]);
      setIsSending(false);
      return true;
    } catch (err) {
      console.error('[useQRChat] Unexpected error:', err);
      toast.error('An unexpected error occurred');
      setIsSending(false);
      return false;
    }
  };

  const refreshMessages = useCallback(async () => {
    await fetchMessages();
  }, [fetchMessages]);

  // Initial fetch
  useEffect(() => {
    if (requestId && qrToken) {
      fetchMessages();
    }
  }, [requestId, qrToken, fetchMessages]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!requestId) return;

    const channel = supabase
      .channel(`qr-chat-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'guest_communications',
          filter: `metadata->>request_id=eq.${requestId}`,
        },
        (payload) => {
          const newMessage = payload.new as any;
          
          // PHASE-1B: Validate tenant_id to prevent cross-tenant data leaks
          if (newMessage.tenant_id !== tenantId) {
            console.warn('[useQRChat] SECURITY: Ignoring message from different tenant', {
              message_tenant: newMessage.tenant_id,
              current_tenant: tenantId,
            });
            return;
          }
          
          // Add the new message to the state
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            
            return [
              ...prev,
              {
                id: newMessage.id,
                message: newMessage.message,
                direction: newMessage.direction,
                sent_by: newMessage.sent_by,
                sender_name: newMessage.metadata?.guest_name || 'Staff',
                created_at: newMessage.created_at,
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
    refreshMessages,
  };
}
