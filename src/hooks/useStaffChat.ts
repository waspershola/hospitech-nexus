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
  sender_role?: string; // PHASE-4B: Add staff role
  created_at: string;
}

interface RequestContext {
  type: string;
  status: string;
  room?: { number: string };
  priority: string;
}

export function useStaffChat(requestId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [requestContext, setRequestContext] = useState<RequestContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { user, tenantId } = useAuth();

  const fetchRequestContext = useCallback(async () => {
    if (!requestId) return;

    try {
      const { data, error } = await supabase
        .from('requests')
        .select('type, status, priority, room:rooms(number)')
        .eq('id', requestId)
        .single();

      if (error) throw error;
      setRequestContext(data);
    } catch (err) {
      console.error('[useStaffChat] Error fetching request context:', err);
    }
  }, [requestId]);

  const fetchMessages = useCallback(async () => {
    if (!requestId || !tenantId) return;

    setIsLoading(true);
    try {
      // PHASE-1A: Add tenant_id filter to prevent cross-tenant data leaks
      const { data, error } = await supabase
        .from('guest_communications')
        .select(`
          id, 
          message, 
          direction, 
          sent_by, 
          created_at, 
          metadata,
          staff:sent_by(full_name, role)
        `)
        .eq('metadata->>request_id', requestId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[useStaffChat] Failed to load messages:', error);
        toast.error('Failed to load messages');
        setMessages([]);
        return;
      }

      if (!data || data.length === 0) {
        // PHASE-1A: Defensive empty state handling
        console.log('[useStaffChat] No messages found for request:', requestId);
        setMessages([]);
        return;
      }

      const formattedMessages = (data || []).map((msg: any) => ({
        id: msg.id,
        message: msg.message,
        direction: msg.direction,
        sent_by: msg.sent_by,
        sender_name: msg.direction === 'inbound' 
          ? (msg.metadata?.guest_name || 'Guest')
          : (msg.staff?.full_name || 'Staff'),
        sender_role: msg.direction === 'outbound' && msg.staff?.role 
          ? msg.staff.role 
          : undefined,
        created_at: msg.created_at,
      }));

      setMessages(formattedMessages);
    } catch (err) {
      console.error('[useStaffChat] Error fetching messages:', err);
      toast.error('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [requestId, tenantId]);

  const sendMessage = async (message: string): Promise<boolean> => {
    if (!requestId || !user) {
      console.error('[useStaffChat] Missing requestId or user:', { requestId, user: !!user });
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
      const { data: requestData, error: fetchError } = await supabase
        .from('requests')
        .select('tenant_id, guest_id')
        .eq('id', requestId)
        .single();

      if (fetchError) {
        console.error('[useStaffChat] Error fetching request:', fetchError);
        throw new Error(`Failed to fetch request: ${fetchError.message}`);
      }

      if (!requestData) {
        console.error('[useStaffChat] Request not found:', requestId);
        throw new Error('Request not found');
      }

      console.log('[useStaffChat] Sending message with payload:', {
        tenant_id: requestData.tenant_id,
        guest_id: requestData.guest_id,
        type: 'qr_request',
        message: message.trim(),
        direction: 'outbound',
        sent_by: user.id,
        metadata: { request_id: requestId },
      });

      // PHASE-4B: Fetch staff details for sender name and role
      const { data: staffData } = await supabase
        .from('staff')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

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

      if (error) {
        console.error('[useStaffChat] INSERT error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          full: error,
        });
        throw error;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: data.id,
          message: data.message,
          direction: 'outbound',
          sent_by: user.id,
          sender_name: staffData?.full_name || 'Staff',
          sender_role: staffData?.role,
          created_at: data.created_at,
        },
      ]);

      console.log('[useStaffChat] Message sent successfully:', data);
      setIsSending(false);
      return true;
    } catch (err: any) {
      console.error('[useStaffChat] Error sending message:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        stack: err?.stack,
        full: err,
      });
      toast.error(err?.message || 'Failed to send message');
      setIsSending(false);
      return false;
    }
  };

  useEffect(() => {
    if (requestId) {
      fetchMessages();
      fetchRequestContext();
    }
  }, [requestId, fetchMessages, fetchRequestContext]);

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
          
          // PHASE-2: Validate tenant_id to prevent cross-tenant message leaks
          if (tenantId && newMessage.tenant_id !== tenantId) {
            console.warn('[useStaffChat] SECURITY: Cross-tenant message blocked', {
              expected: tenantId,
              received: newMessage.tenant_id,
            });
            return;
          }
          
          // PHASE-4B: Fetch staff details for outbound messages in realtime
          if (newMessage.direction === 'outbound' && newMessage.sent_by) {
            supabase
              .from('staff')
              .select('full_name, role')
              .eq('id', newMessage.sent_by)
              .single()
              .then(({ data: staffData }) => {
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
                      sender_name: staffData?.full_name || 'Staff',
                      sender_role: staffData?.role,
                      created_at: newMessage.created_at,
                    },
                  ];
                });
              });
          } else {
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, tenantId]);

  return {
    messages,
    requestContext,
    isLoading,
    isSending,
    sendMessage,
    refreshMessages: fetchMessages,
  };
}
