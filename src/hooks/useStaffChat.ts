import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  message: string;
  direction: 'inbound' | 'outbound';
  sent_by: string | null;
  sender_name: string;
  created_at: string;
}

export function useStaffChat(requestId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { user } = useAuth();

  const fetchMessages = useCallback(async () => {
    if (!requestId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('guest_communications')
        .select(`
          id,
          message,
          direction,
          sent_by,
          created_at,
          metadata
        `)
        .eq('metadata->>request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages = (data || []).map((msg: any) => ({
        id: msg.id,
        message: msg.message,
        direction: msg.direction,
        sent_by: msg.sent_by,
        sender_name: msg.direction === 'inbound' 
          ? (msg.metadata?.guest_name || 'Guest')
          : 'Staff',
        created_at: msg.created_at,
      }));

      setMessages(formattedMessages);
    } catch (err) {
      console.error('[useStaffChat] Error fetching messages:', err);
      toast.error('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [requestId]);

  const sendMessage = async (message: string): Promise<boolean> => {
    if (!requestId || !user) {
      toast.error('Invalid request or user');
      return false;
    }

    if (!message.trim()) {
      toast.error('Message cannot be empty');
      return false;
    }

    setIsSending(true);
    try {
      // Fetch request to get tenant_id
      const { data: requestData } = await supabase
        .from('requests')
        .select('tenant_id, guest_id')
        .eq('id', requestId)
        .single();

      if (!requestData) {
        throw new Error('Request not found');
      }

      const { data, error } = await supabase
        .from('guest_communications')
        .insert({
          tenant_id: requestData.tenant_id,
          guest_id: requestData.guest_id,
          type: 'qr_request',
          message: message.trim(),
          direction: 'outbound',
          sent_by: user.id,
          metadata: { request_id: requestId },
        })
        .select()
        .single();

      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        {
          id: data.id,
          message: data.message,
          direction: 'outbound',
          sent_by: user.id,
          sender_name: 'Staff',
          created_at: data.created_at,
        },
      ]);

      setIsSending(false);
      return true;
    } catch (err) {
      console.error('[useStaffChat] Error sending message:', err);
      toast.error('Failed to send message');
      setIsSending(false);
      return false;
    }
  };

  useEffect(() => {
    if (requestId) {
      fetchMessages();
    }
  }, [requestId, fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!requestId) return;

    const channel = supabase
      .channel(`staff-chat-${requestId}`)
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
          
          setMessages((prev) => {
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
                sender_name: newMessage.direction === 'inbound' 
                  ? (newMessage.metadata?.guest_name || 'Guest')
                  : 'Staff',
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
    sendMessage,
    refreshMessages: fetchMessages,
  };
}
