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
  // AI fields
  original_text?: string;
  cleaned_text?: string;
  translated_text?: string;
  detected_language?: string;
  target_language?: string; // BIDIRECTIONAL-FIX-V1: Add target_language for translation display
  intent?: string;
  confidence?: number;
  ai_auto_response?: boolean;
  polite_suggestion?: string; // OPTION-C-V1: AI-generated polite reply (polite/hybrid modes)
  metadata?: any;
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
  const { data, error } = await supabase
    .from('guest_communications')
    .select('id, message, direction, sent_by, created_at, metadata, original_text, cleaned_text, translated_text, detected_language, target_language, intent, confidence, ai_auto_response, polite_suggestion')
    .eq('metadata->>request_id', requestId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[UNIFIED-CHAT-V1] Failed to load messages:', error.message);
    throw new Error(`Failed to load messages: ${error.message}`);
  }

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
      // AI fields
      original_text: msg.original_text,
      cleaned_text: msg.cleaned_text,
      translated_text: msg.translated_text,
      detected_language: msg.detected_language,
      target_language: msg.target_language, // BIDIRECTIONAL-FIX-V1
      intent: msg.intent,
      confidence: msg.confidence,
      ai_auto_response: msg.ai_auto_response,
      polite_suggestion: msg.polite_suggestion, // OPTION-C-V1
      metadata: msg.metadata,
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
  const { tenantId, requestId, userType, userId, guestName = 'Guest', qrToken } = options;
  const queryClient = useQueryClient();

  // PHASE-3: Enhanced AI welcome message asking about language preference
  const sendAIWelcomeMessage = useCallback(async () => {
    if (userType !== 'guest' || !qrToken || !tenantId) return;

    try {
      await supabase.from('guest_communications').insert({
        tenant_id: tenantId,
        type: 'qr_chat',
        message: 'Welcome! 🏨 Thank you for your request. We\'ve received it and our team will begin processing it shortly.\n\n**Would you like translation assistance?**\nIf you prefer, you can chat in your own language and we will translate it for our staff. Just reply in any language you\'re comfortable with (Chinese, Arabic, French, Spanish, etc.) and we\'ll automatically translate the conversation!\n\nOr reply in English if you prefer. 😊',
        direction: 'outbound',
        metadata: {
          request_id: requestId,
          qr_token: qrToken,
          ai_generated: true,
          welcome_message: true,
        },
      });
    } catch (error) {
      console.error('[AI-WELCOME] Failed:', error);
    }
  }, [tenantId, requestId, userType, qrToken]);

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

  // PHASE-3: Fixed AI welcome message trigger - only check for welcome_message flag
  useEffect(() => {
    // ONLY check if welcome message exists - ignore message count completely
    const hasWelcomeMessage = messages.some(m => m.metadata?.welcome_message === true);
    
    if (!hasWelcomeMessage && userType === 'guest' && !isLoading && messages !== undefined) {
      sendAIWelcomeMessage();
    }
  }, [messages, userType, isLoading, sendAIWelcomeMessage]);

  // Send message mutation
  const { mutateAsync: sendMessageMutation, isPending: isSending } = useMutation({
    mutationFn: async (message: string) => {
      console.log('[UNIFIED-CHAT-AI-V2] Sending message:', {
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

      // CRITICAL: Validate qr_token for guest messages (RLS requirement)
      if (userType === 'guest' && !qrToken) {
        throw new Error('QR token required for guest messages');
      }

      // Prepare message data
      const messageData: any = {
        tenant_id: requestData.tenant_id,
        guest_id: requestData.guest_id,
        type: 'qr_request',
        message: message.trim(),
        direction: userType === 'guest' ? 'inbound' : 'outbound',
        metadata: { 
          request_id: requestId,
          qr_token: qrToken || null, // CRITICAL: Always include qr_token for RLS
        },
      };

      // Process guest messages through AI
      if (userType === 'guest') {
        try {
          // Fetch tenant's preferred staff language
          const { data: tenant } = await supabase
            .from('tenants')
            .select('preferred_staff_language')
            .eq('id', requestData.tenant_id)
            .single();
          
          const staffLang = tenant?.preferred_staff_language || 'en';
          
          const aiResponse = await supabase.functions.invoke('ai-message', {
            body: {
              action: 'process_guest_message',
              message: message.trim(),
              tenant_id: requestData.tenant_id,
              context: 'guest_chat',
              request_id: requestId,
            }
          });

          if (aiResponse.data?.success) {
            const aiData = aiResponse.data.data;
            
            // PHASE-1: Handle language selection intent
            if (aiData.language_selection && aiData.selected_language) {
              // Guest is selecting their preferred language
              console.log('[LANGUAGE-SELECTION] Detected:', aiData.selected_language);
              
              // Store language preference
              try {
                const { data: existingRequest } = await supabase
                  .from('requests')
                  .select('metadata')
                  .eq('id', requestId)
                  .single();
                
                const currentMetadata = (existingRequest?.metadata as Record<string, any>) || {};
                
                await supabase
                  .from('requests')
                  .update({
                    metadata: {
                      ...currentMetadata,
                      ai_language_enabled: true,
                      guest_language_code: aiData.selected_language,
                    }
                  })
                  .eq('id', requestId);
                
                console.log('[LANGUAGE-SELECTION] Preference stored:', aiData.selected_language);
              } catch (err) {
                console.error('[LANGUAGE-SELECTION] Failed to store preference:', err);
              }
              
              // PHASE-6: Send acknowledgment message
              try {
                await supabase.from('guest_communications').insert({
                  tenant_id: requestData.tenant_id,
                  guest_id: requestData.guest_id,
                  type: 'qr_request',
                  message: aiData.acknowledgment_message || `Thank you! I will communicate with you in your language and translate everything for our staff.`,
                  direction: 'outbound',
                  sent_by: null,
                  ai_auto_response: true,
                  metadata: {
                    request_id: requestId,
                    qr_token: qrToken,
                    ai_generated: true,
                    language_acknowledgment: true,
                    selected_language: aiData.selected_language,
                  },
                });
                console.log('[LANGUAGE-SELECTION] Acknowledgment sent');
              } catch (ackErr) {
                console.error('[LANGUAGE-SELECTION] Failed to send acknowledgment:', ackErr);
              }
              
              // Don't insert the language selection message itself - just the acknowledgment
              return;
            }
            
            // OPTION-C-V1: Store all AI response fields including polite_suggestion
            messageData.original_text = message.trim(); // ALWAYS set - never changed
            messageData.cleaned_text = aiData.cleaned_text || message.trim();
            messageData.translated_text = aiData.literal_translation || aiData.translated_to_english || aiData.cleaned_text || message.trim(); // ALWAYS set
            messageData.detected_language = aiData.detected_language;
            messageData.target_language = staffLang;
            messageData.intent = aiData.intent;
            messageData.confidence = aiData.confidence;
            messageData.ai_auto_response = !!aiData.auto_response;
            // Store polite_suggestion if present (for polite/hybrid modes)
            if (aiData.polite_suggestion) {
              messageData.polite_suggestion = aiData.polite_suggestion;
            }
            // Store translation mode in metadata
            if (aiData.mode_used) {
              messageData.metadata = {
                ...messageData.metadata,
                translation_mode: aiData.mode_used,
              };
            }
            // Ensure message field always has a value
            messageData.message = aiData.literal_translation || aiData.translated_to_english || aiData.cleaned_text || message.trim();
            
            console.log('[UNIFIED-CHAT-AI-V3] Guest message AI processed:', {
              original: message.trim(),
              cleaned: aiData.cleaned_text,
              translated: aiData.translated_to_english,
              detected_language: aiData.detected_language,
              intent: aiData.intent,
            });
            
            // PHASE-6: Store language preference in request metadata after first message
            if (aiData.detected_language && aiData.detected_language !== staffLang) {
              try {
                const { data: existingRequest } = await supabase
                  .from('requests')
                  .select('metadata')
                  .eq('id', requestId)
                  .single();
                
                const currentMetadata = (existingRequest?.metadata as Record<string, any>) || {};
                
                await supabase
                  .from('requests')
                  .update({
                    metadata: {
                      ...currentMetadata,
                      ai_language_enabled: true,
                      guest_language_code: aiData.detected_language,
                    }
                  })
                  .eq('id', requestId);
                
                console.log('[UNIFIED-CHAT-AI-V2] Language preference stored:', {
                  requestId,
                  guestLanguage: aiData.detected_language,
                });
              } catch (langPrefError) {
                console.error('[UNIFIED-CHAT-AI-V2] Failed to store language preference:', langPrefError);
                // Non-blocking: continue even if preference storage fails
              }
            }
            
            // Phase 4: Trigger AI First Responder if guest language differs from staff language
            if (aiData.detected_language && aiData.detected_language !== staffLang) {
              try {
                console.log('[AI-FIRST-RESPONDER] Triggering for guest language:', aiData.detected_language);
                const firstResponderResult = await supabase.functions.invoke('ai-message', {
                  body: {
                    action: 'ai_first_responder',
                    message: message.trim(),
                    tenant_id: requestData.tenant_id,
                    guest_language: aiData.detected_language,
                  }
                });
                
                if (firstResponderResult.data?.success && firstResponderResult.data.data?.translated_to_guest) {
                  // BIDIRECTIONAL-FIX-V1: Set BOTH original_text (English) and translated_text (guest language)
                  await supabase.from('guest_communications').insert({
                    tenant_id: requestData.tenant_id,
                    guest_id: requestData.guest_id,
                    type: 'qr_request',
                    message: firstResponderResult.data.data.translated_to_guest, // Guest sees this
                    direction: 'outbound',
                    sent_by: null,
                    ai_auto_response: true,
                    // BIDIRECTIONAL FIX: Set BOTH versions
                    original_text: firstResponderResult.data.data.original_english || 'Thank you for your message. Our team will assist you shortly.',
                    translated_text: firstResponderResult.data.data.translated_to_guest,
                    detected_language: 'en', // AI generated in English
                    target_language: aiData.detected_language, // Translated to guest language
                    metadata: {
                      request_id: requestId,
                      qr_token: qrToken, // Add for RLS
                      ai_first_responder: true,
                      guest_language: aiData.detected_language,
                    },
                  });
                  console.log('[AI-FIRST-RESPONDER-BIDIRECTIONAL-V1] Both versions stored:', {
                    original_english: firstResponderResult.data.data.original_english,
                    translated_to_guest: firstResponderResult.data.data.translated_to_guest,
                  });
                }
              } catch (firstResponderError) {
                console.error('[AI-FIRST-RESPONDER] Failed:', firstResponderError);
                // Non-blocking: continue even if first responder fails
              }
            }
            
            // If auto-response, insert it after
            if (aiData.auto_response) {
              messageData.metadata.auto_response_category = aiData.auto_response_category;
            }
          } else {
            console.error('[UNIFIED-CHAT-AI-V2] AI response failed:', aiResponse);
            // Fallback: use original message
            messageData.message = message.trim();
          }
        } catch (aiError) {
          console.error('[UNIFIED-CHAT-AI-V2] AI processing failed:', aiError);
          // OPTION-C-V1: Fallback - always populate required fields
          messageData.message = message.trim();
          messageData.original_text = message.trim(); // ALWAYS set - never changed
          messageData.cleaned_text = message.trim();
          messageData.translated_text = message.trim(); // ALWAYS set (same as original when no translation)
          messageData.detected_language = 'unknown';
          messageData.polite_suggestion = null; // No AI suggestion on failure
        }
        
        messageData.metadata.guest_name = guestName;
        messageData.sent_by = null;
      } else {
      // Process staff replies through AI
        try {
          // Fetch tenant's preferred staff language
          const { data: tenant } = await supabase
            .from('tenants')
            .select('preferred_staff_language')
            .eq('id', requestData.tenant_id)
            .single();
          
          const staffLang = tenant?.preferred_staff_language || 'en';
          
          // PHASE-1: Get guest language - PRIORITY ORDER:
          // 1. Check request.metadata.guest_language_code (set during language selection)
          // 2. Check previous guest messages for detected_language
          // 3. Fallback to 'en'
          const { data: requestMeta } = await supabase
            .from('requests')
            .select('metadata')
            .eq('id', requestId)
            .single();
          
          let guestLang = (requestMeta?.metadata as any)?.guest_language_code;
          
          if (!guestLang) {
            const { data: guestMessages } = await supabase
              .from('guest_communications')
              .select('detected_language')
              .eq('metadata->>request_id', requestId)
              .eq('direction', 'inbound')
              .not('detected_language', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1);
            
            guestLang = guestMessages?.[0]?.detected_language || 'en';
          }
          
          const aiResponse = await supabase.functions.invoke('ai-message', {
            body: {
              action: 'process_staff_reply',
              message: message.trim(),
              tenant_id: requestData.tenant_id,
              guest_language: guestLang,
            }
          });

          if (aiResponse.data?.success) {
            const aiData = aiResponse.data.data;
            // OPTION-C-V1: Store all AI response fields including polite_suggestion
            messageData.original_text = aiData.original_text || message.trim(); // ALWAYS set - use AI-enhanced version
            messageData.cleaned_text = aiData.enhanced_text || message.trim();
            messageData.translated_text = aiData.literal_translation || aiData.translated_text || message.trim(); // ALWAYS set
            messageData.target_language = guestLang;
            // Store polite_suggestion if present (for polite/hybrid modes)
            if (aiData.polite_suggestion) {
              messageData.polite_suggestion = aiData.polite_suggestion;
            }
            // Store translation mode in metadata
            if (aiData.mode_used) {
              messageData.metadata = {
                ...messageData.metadata,
                translation_mode: aiData.mode_used,
                ai_suggestions: aiData.suggestions || [],
              };
            }
            // Ensure message field always has a value
            messageData.message = aiData.literal_translation || aiData.translated_text || aiData.enhanced_text || message.trim();
            
            console.log('[UNIFIED-CHAT-AI-V3] Staff reply AI processed:', {
              original: aiData.original_text || message.trim(),
              enhanced: aiData.enhanced_text,
              translated: aiData.translated_text,
              guest_language: guestLang,
            });
          } else {
            console.error('[UNIFIED-CHAT-AI-V3] AI staff reply failed:', aiResponse);
            // PHASE-2: Even on AI failure, always set both fields
            messageData.original_text = message.trim();
            messageData.translated_text = message.trim();
            messageData.message = message.trim();
          }
        } catch (aiError) {
          console.error('[UNIFIED-CHAT-AI-V3] AI enhancement failed:', aiError);
          // OPTION-C-V1: Even on error, always set both fields so UI displays correctly
          messageData.original_text = message.trim();
          messageData.translated_text = message.trim();
          messageData.message = message.trim();
          messageData.polite_suggestion = null; // No AI suggestion on failure
        }
        
        messageData.sent_by = userId;
      }

      // Insert message
      const { data, error } = await supabase
        .from('guest_communications')
        .insert(messageData)
        .select()
        .single();

      // If guest message had auto-response, insert it now
      if (userType === 'guest' && messageData.ai_auto_response && messageData.metadata.auto_response_category) {
        try {
          const aiResponse = await supabase.functions.invoke('ai-message', {
            body: {
              action: 'process_guest_message',
              message: message.trim(),
              tenant_id: requestData.tenant_id,
            }
          });
          
          if (aiResponse.data?.success && aiResponse.data.data.auto_response) {
            await supabase.from('guest_communications').insert({
              tenant_id: requestData.tenant_id,
              guest_id: requestData.guest_id,
              type: 'qr_request',
              message: aiResponse.data.data.auto_response,
              direction: 'outbound',
              sent_by: null,
              ai_auto_response: true,
              metadata: {
                request_id: requestId,
                qr_token: qrToken, // Add for RLS
                ai_generated: true,
                category: aiResponse.data.data.auto_response_category,
              },
            });
          }
        } catch (autoError) {
          console.error('[UNIFIED-CHAT-V1] Auto-response failed:', autoError);
        }
      }

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
        // Pass through AI fields
        original_text: messageData.original_text,
        cleaned_text: messageData.cleaned_text,
        translated_text: messageData.translated_text,
        detected_language: messageData.detected_language,
        target_language: messageData.target_language,
        intent: messageData.intent,
        confidence: messageData.confidence,
        ai_auto_response: messageData.ai_auto_response,
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
          // AI fields
          original_text: newMessage.original_text,
          cleaned_text: newMessage.cleaned_text,
          translated_text: newMessage.translated_text,
          detected_language: newMessage.detected_language,
          intent: newMessage.intent,
          confidence: newMessage.confidence,
          ai_auto_response: newMessage.ai_auto_response,
          metadata: newMessage.metadata,
        };
        
        return [...old, formattedMessage];
      });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to send message');
    },
  });

  // REALTIME-FIX-V2: Set up unified realtime subscription with stable dependencies
  useEffect(() => {
    if (!tenantId || !requestId) return;

    const channelName = `qr-request-chat-${tenantId}-${requestId}`;
    console.log('[REALTIME-FIX-V2] Subscribing:', channelName);

    const channel = supabase
      .channel(channelName)
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

          console.log('[REALTIME-FIX-V2] Message received:', {
            messageId: newMessage.id,
            direction: newMessage.direction,
          });

          // Validate tenant_id for security
          if (newMessage.tenant_id !== tenantId) {
            console.warn('[REALTIME-FIX-V2] SECURITY: Cross-tenant message blocked');
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
          queryClient.setQueryData<ChatMessage[]>(['qr-chat', tenantId, requestId], (old = []) => {
            // Prevent duplicates
            if (old.some((m) => m.id === newMessage.id)) {
              console.log('[REALTIME-FIX-V2] Duplicate ignored:', newMessage.id);
              return old;
            }

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
              // AI fields
              original_text: newMessage.original_text,
              cleaned_text: newMessage.cleaned_text,
              translated_text: newMessage.translated_text,
              detected_language: newMessage.detected_language,
              intent: newMessage.intent,
              confidence: newMessage.confidence,
              ai_auto_response: newMessage.ai_auto_response,
              metadata: newMessage.metadata,
            };

            return [...old, formattedMessage];
          });
        }
      )
      .subscribe((status) => {
        console.log('[REALTIME-FIX-V2] Subscription status:', status);
      });

    return () => {
      console.log('[REALTIME-FIX-V2] Cleanup subscription');
      supabase.removeChannel(channel);
    };
  }, [tenantId, requestId]); // ONLY these deps - no queryClient, no cacheKey

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
