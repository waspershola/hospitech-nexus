/**
 * AI Module - Centralized Client
 * Phase 3: Client functions for calling AI edge function
 */

import { supabase } from '@/integrations/supabase/client';
import type { AIMessageRequest, AIMessageResponse } from './types';

/**
 * Call the ai-message edge function
 */
export async function callAIMessage(
  request: AIMessageRequest
): Promise<AIMessageResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-message', {
      body: request,
    });

    if (error) {
      console.error('[AI-CLIENT] Edge function error:', error);
      throw error;
    }

    return data as AIMessageResponse;
  } catch (error) {
    console.error('[AI-CLIENT] Request failed:', error);
    throw error;
  }
}

/**
 * Process guest message through AI
 */
export async function processGuestMessage(
  tenantId: string,
  message: string,
  requestId?: string
) {
  return callAIMessage({
    action: 'process_guest_message',
    message,
    tenant_id: tenantId,
    context: 'guest_to_staff',
    request_id: requestId,
  });
}

/**
 * Process staff reply through AI
 */
export async function processStaffReply(
  tenantId: string,
  message: string,
  guestLanguage: string = 'en'
) {
  return callAIMessage({
    action: 'process_staff_reply',
    message,
    tenant_id: tenantId,
    guest_language: guestLanguage,
  });
}

/**
 * Query staff training AI
 */
export async function queryStaffTraining(
  tenantId: string,
  question: string
) {
  return callAIMessage({
    action: 'staff_training_query',
    message: question,
    tenant_id: tenantId,
  });
}
