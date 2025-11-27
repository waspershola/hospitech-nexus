/**
 * AI Module - Centralized Types
 * Phase 3: Type definitions for Gemini 1.5 Flash AI integration
 */

export type AIContext = 'guest_to_staff' | 'staff_to_guest' | 'staff_training';

export interface AIMessageRequest {
  action: 'process_guest_message' | 'process_staff_reply' | 'staff_training_query';
  message: string;
  tenant_id: string;
  context?: AIContext;
  guest_language?: string;
  request_id?: string;
}

export interface ProcessGuestMessageResult {
  detected_language: string;
  cleaned_text: string;
  translated_to_english: string;
  intent: string;
  confidence: number;
  auto_response: string | null;
  auto_response_category?: string;
}

export interface ProcessStaffReplyResult {
  original_text: string;
  literal_translation: string;
  polite_suggestion: string | null;
  suggestions?: string[];
  mode_used?: string;
}

export interface StaffTrainingResult {
  response: string;
}

export type AIMessageResult = 
  | ProcessGuestMessageResult 
  | ProcessStaffReplyResult 
  | StaffTrainingResult;

export interface AIMessageResponse {
  success: boolean;
  data?: AIMessageResult;
  error?: string;
}

// Intent types
export const AI_INTENTS = [
  'housekeeping',
  'maintenance',
  'room_service',
  'spa',
  'pool',
  'wifi',
  'breakfast',
  'complaint',
  'request',
  'faq',
  'other'
] as const;

export type AIIntent = typeof AI_INTENTS[number];
