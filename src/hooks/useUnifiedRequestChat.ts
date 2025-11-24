/**
 * UNIFIED QR REQUEST CHAT HOOK
 * 
 * This hook replaces useQRChat and useStaffChat to provide a single,
 * unified chat implementation across all three chat interfaces:
 * - Guest QR Portal Chat
 * - Staff Modal Chat (StaffChatDialog)
 * - Front Desk Drawer Chat
 * 
 * Key Features:
 * - React Query caching for persistence across remounts
 * - Single realtime channel for guest-staff sync
 * - Direct Supabase queries (no edge function)
 * - Proper tenant_id filtering for security
 * - Structured error logging
 * - Optimistic updates with duplicate prevention
 * 
 * Architecture: UNIFIED-CHAT-V1
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  message: string;
  direction: 'inbound' | 'outbound';
  sent_by: string | null;
  sender_name: string;
  sender_role?: string;
  created_at: string;
}

interface UseUnifiedRequestChatOptions {
  tenantId: string;
  requestId: string;
  userType: 'guest' | 'staff';
  userId?: string; // For staff messages
  guestName?: string; // For guest messages
  qrToken?: string; // For guest validation (optional)
}

interface UseUnifiedRequestChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<boolean>;
  refreshMessages: () => Promise<void>;
}

/**
 * Fetch messages from database with proper tenant isolation
 */
async function fetchMessages(
  tenantId: string,
  requestId: string
): Promise<ChatMessage[]> {
  console.log('[UNIFIED-CHAT-V1] Fetching messages:', { tenantId, requestId });

  const { data, error } = await supabase
    .from('guest_communications')
    .select('id, message, direction, sent_by, created_at, metadata')
    .eq('metadata->>request_id', requestId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[UNIFIED-CHAT-V1] FETCH-ERROR:', {
      requestId,
      tenantId,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
    });
    throw new Error(`Failed to load messages: ${error.message}`);
  }

  console.log('[UNIFIED-CHAT-V1] Fetched messages:', data?.length || 0);

  // Get unique staff IDs from outbound messages
  const staffIds = [...new Set(
    (data || [])
      .filter(msg => msg.direction === 'outbound' && msg.sent_by)
      .map(msg => msg.sent_by)
  )];

  // Fetch staff details in batch
  let staffMap: Record<string, { full_name: string; role: string }> = {};
  if (staffIds.length > 0) {
    const { data: staffData } = await supabase
      .from('staff')
      .select('id, full_name, role')
      .in('id', staffIds);
    
    if (staffData) {
      staffMap = Object.fromEntries(
        staffData.map(s => [s.id, { full_name: s.full_name, role: s.role }])
      );
    }
  }

  // Format messages consistently
  const formattedMessages = (data || []).map((msg: any) => {
    const staff = msg.sent_by ? staffMap[msg.sent_by] : null;
    
    return {
      id: msg.id,
      message: msg.message,
      direction: msg.direction,
      sent_by: msg.sent_by,
      sender_name:
        msg.direction === 'inbound'
          ? msg.metadata?.guest_name || 'Guest'
          : staff?.full_name || 'Staff',
      sender_role:
        msg.direction === 'outbound' && staff?.role
          ? staff.role
          : undefined,
      created_at: msg.created_at,
    };
  });

  return formattedMessages;
}

/**
 * Unified Request Chat Hook
 * 
 * @param options - Configuration options
 * @returns Chat state and actions
 */
export function useUnifiedRequestChat(
  options: UseUnifiedRequestChatOptions
): UseUnifiedRequestChatReturn {
  const { tenantId, requestId, userType, userId, guestName = 'Guest' } = options;
  const queryClient = useQueryClient();

  // Unified cache key for all chat UIs
  const cacheKey = ['qr-chat', tenantId, requestId];

  // Fetch messages with React Query
  const {
    data: messages = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: cacheKey,
    queryFn: () => fetchMessages(tenantId, requestId),
    staleTime: 0, // Always refetch on mount
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: !!tenantId && !!requestId,
  });

  // Send message mutation
  const { mutateAsync: sendMessageMutation, isPending: isSending } = useMutation({
    mutationFn: async (message: string) => {
      console.log('[UNIFIED-CHAT-V1] Sending message:', {
        requestId,
        userType,
        messageLength: message.length,
      });

      // Fetch request to get tenant_id and guest_id
      const { data: requestData, error: fetchError } = await supabase
        .from('requests')
        .select('tenant_id, guest_id')
        .eq('id', requestId)
        .single();

      if (fetchError || !requestData) {
        throw new Error('Failed to fetch request context');
      }

      // Prepare message data
      const messageData: any = {
        tenant_id: requestData.tenant_id,
        guest_id: requestData.guest_id,
        type: 'qr_request',
        message: message.trim(),
        direction: userType === 'guest' ? 'inbound' : 'outbound',
        metadata: { request_id: requestId },
      };

      if (userType === 'guest') {
        messageData.metadata.guest_name = guestName;
        messageData.sent_by = null;
      } else {
        messageData.sent_by = userId;
      }

      // Insert message
      const { data, error } = await supabase
        .from('guest_communications')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('[UNIFIED-CHAT-V1] SEND-ERROR:', {
          requestId,
          tenantId,
          userType,
          error: error.message,
          code: error.code,
        });
        throw error;
      }

      console.log('[UNIFIED-CHAT-V1] Message sent successfully:', data.id);

      // Fetch staff details if outbound message
      let staffData = null;
      if (userType === 'staff' && userId) {
        const { data: staff } = await supabase
          .from('staff')
          .select('full_name, role')
          .eq('id', userId)
          .single();
        staffData = staff;
      }

      return {
        ...data,
        sender_name: userType === 'guest' ? guestName : staffData?.full_name || 'Staff',
        sender_role: staffData?.role,
      };
    },
    onSuccess: (newMessage) => {
      // Optimistic update - add message to cache immediately
      queryClient.setQueryData<ChatMessage[]>(cacheKey, (old = []) => {
        // Prevent duplicates
        if (old.some((m) => m.id === newMessage.id)) {
          return old;
        }
        
        const formattedMessage: ChatMessage = {
          id: newMessage.id,
          message: newMessage.message,
          direction: newMessage.direction as 'inbound' | 'outbound',
          sent_by: newMessage.sent_by,
          sender_name: newMessage.sender_name,
          sender_role: newMessage.sender_role,
          created_at: newMessage.created_at,
        };
        
        return [...old, formattedMessage];
      });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to send message');
    },
  });

  // Set up unified realtime subscription
  useEffect(() => {
    if (!tenantId || !requestId) return;

    console.log('[UNIFIED-CHAT-V1] Setting up realtime channel:', {
      tenantId,
      requestId,
      channelName: `qr-request-chat-${tenantId}-${requestId}`,
    });

    const channel = supabase
      .channel(`qr-request-chat-${tenantId}-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'guest_communications',
          filter: `metadata->>request_id=eq.${requestId}`,
        },
        async (payload) => {
          const newMessage = payload.new as any;

          console.log('[UNIFIED-CHAT-V1] Realtime message received:', {
            messageId: newMessage.id,
            direction: newMessage.direction,
            messageTenant: newMessage.tenant_id,
            currentTenant: tenantId,
          });

          // Validate tenant_id for security
          if (newMessage.tenant_id !== tenantId) {
            console.warn('[UNIFIED-CHAT-V1] SECURITY: Cross-tenant message blocked', {
              expected: tenantId,
              received: newMessage.tenant_id,
            });
            return;
          }

          // Fetch staff details if outbound message
          let staffData = null;
          if (newMessage.direction === 'outbound' && newMessage.sent_by) {
            const { data: staff } = await supabase
              .from('staff')
              .select('full_name, role')
              .eq('id', newMessage.sent_by)
              .single();
            staffData = staff;
          }

          // Add to React Query cache
          queryClient.setQueryData<ChatMessage[]>(cacheKey, (old = []) => {
            // Prevent duplicates
            if (old.some((m) => m.id === newMessage.id)) {
              console.log('[UNIFIED-CHAT-V1] Duplicate message ignored:', newMessage.id);
              return old;
            }

            console.log('[UNIFIED-CHAT-V1] Adding realtime message to cache');

            const formattedMessage: ChatMessage = {
              id: newMessage.id,
              message: newMessage.message,
              direction: newMessage.direction as 'inbound' | 'outbound',
              sent_by: newMessage.sent_by,
              sender_name:
                newMessage.direction === 'inbound'
                  ? newMessage.metadata?.guest_name || 'Guest'
                  : staffData?.full_name || 'Staff',
              sender_role: staffData?.role,
              created_at: newMessage.created_at,
            };

            return [...old, formattedMessage];
          });
        }
      )
      .subscribe((status) => {
        console.log('[UNIFIED-CHAT-V1] Realtime subscription status:', status);
      });

    return () => {
      console.log('[UNIFIED-CHAT-V1] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [tenantId, requestId, queryClient, cacheKey]);

  // Send message wrapper
  const sendMessage = useCallback(
    async (message: string): Promise<boolean> => {
      if (!message.trim()) {
        toast.error('Message cannot be empty');
        return false;
      }

      try {
        await sendMessageMutation(message);
        return true;
      } catch (error) {
        return false;
      }
    },
    [sendMessageMutation]
  );

  // Refresh messages
  const refreshMessages = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    messages,
    isLoading,
    isSending,
    error: error ? (error as Error).message : null,
    sendMessage,
    refreshMessages,
  };
}
