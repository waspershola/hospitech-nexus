import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, message, tenant_id, context, guest_language, request_id } = await req.json();
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Fetch tenant-specific FAQs and SOPs
    const { data: faqs } = await supabaseClient
      .from('hotel_faqs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('active', true);

    const { data: sops } = await supabaseClient
      .from('sop_knowledge_base')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('active', true);

    let systemPrompt = '';
    let userPrompt = '';
    let generateStructuredOutput = false;

    // Fetch tenant AI settings
    const { data: aiSettings } = await supabaseClient
      .from('tenant_ai_settings')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single();
    
    const staffLanguage = aiSettings?.staff_language_preference || 'en';
    const aiResponseStyle = aiSettings?.ai_response_style || 'luxury';
    const aiBehaviorPrompt = aiSettings?.ai_behavior_prompt || '';
    const welcomeTemplate = aiSettings?.welcome_message_template || 'Welcome to our hotel! How may I assist you today?';
    const enableAutoResponses = aiSettings?.enable_ai_auto_responses ?? false;
    const translationStyle = aiSettings?.translation_style || 'literal';
    
    console.log('[AI-MESSAGE-OPTION-C] Translation style:', translationStyle);

    // Handle different actions
    if (action === 'process_guest_message') {
      // PHASE-1: Enhanced language selection detection
      const languageSelectionPattern = /^(french|chinese|arabic|spanish|german|portuguese|italian|russian|japanese|korean|hindi|yoruba|hausa|igbo|pidgin|no translation|english|français|中文|العربية|español|deutsch|português|italiano|русский|日本語|한국어|हिन्दी)/i;
      const isLanguageSelection = languageSelectionPattern.test(message.trim().toLowerCase());
      
      if (isLanguageSelection) {
        // Language selection intent detected
        systemPrompt = `Detect the language the user is trying to select and return the appropriate language code and acknowledgment message.

User message: "${message}"

Map common language names/words to ISO codes:
- french/français → fr
- chinese/中文 → zh
- arabic/العربية → ar
- spanish/español → es
- german/deutsch → de
- portuguese/português → pt
- italian/italiano → it
- russian/русский → ru
- japanese/日本語 → ja
- korean/한국어 → ko
- hindi/हिन्दी → hi
- yoruba → yo
- hausa → ha
- igbo → ig
- pidgin → pidgin
- english → en

Return JSON with: language_selection (true), selected_language (ISO code), acknowledgment_message (in the selected language: "Thank you! I will communicate with you in [Language] and translate everything for our staff.")`;
        userPrompt = `Detect language from: "${message}"`;
      } else {
        // Regular message processing with tenant-specific AI behavior
        const behaviorContext = aiBehaviorPrompt ? `\n\nTENANT-SPECIFIC BEHAVIOR: ${aiBehaviorPrompt}` : '';
        const responseStyleGuide = aiResponseStyle === 'luxury' 
          ? 'Use warm, elegant, premium tone'
          : aiResponseStyle === 'formal' 
          ? 'Use professional, courteous tone'
          : 'Use friendly, approachable tone';
        
        systemPrompt = `You are a ${aiResponseStyle} hotel AI translation and concierge assistant. ${responseStyleGuide}.${behaviorContext}

CRITICAL RULES FOR TRANSLATION MODE: ${translationStyle.toUpperCase()}
1. NEVER change or rewrite the guest's original text - preserve it exactly as typed
2. Detect language and provide STRICT literal translation to ${staffLanguage.toUpperCase()}
3. Translation mode behavior:
   - literal: Return ONLY strict translation, polite_suggestion MUST be null
   - polite: Return literal translation + polite_suggestion (concierge-style reply)
   - hybrid: Return literal translation + polite_suggestion (separate AI reply)

Your tasks:
1. Detect the language (return ISO code like 'en', 'zh', 'yo', 'fr', etc.)
2. Clean and normalize the message (fix typos, slang, broken English, pidgin) - store as cleaned_text
3. CONDITIONAL TRANSLATION: ONLY translate to ${staffLanguage.toUpperCase()} if the detected language is DIFFERENT from ${staffLanguage.toUpperCase()}
   - If detected_language === "${staffLanguage}", set literal_translation = cleaned_text (no translation needed)
   - If detected_language !== "${staffLanguage}", translate the cleaned_text to ${staffLanguage.toUpperCase()}
4. Detect intent: housekeeping, maintenance, room_service, spa, pool, wifi, breakfast, complaint, request, faq, other
5. POLITE SUGGESTION RULE (based on mode):
   ${translationStyle === 'literal' 
     ? '- polite_suggestion MUST be null (literal mode)' 
     : `- Generate a polite concierge-style reply suggestion in ${staffLanguage.toUpperCase()}
   - Keep meaning aligned with guest intent
   - Use professional hotel tone
   - 20-40 words maximum`}
6. FAQ AUTO-RESPONSE RULES - ${enableAutoResponses ? 'ENABLED' : 'DISABLED'}:
   ${enableAutoResponses ? `- Question is purely informational (time, location, amenity info)
   - NO service request is implied
   - Confidence > 0.90
   - Question matches a known FAQ category (breakfast_hours, pool_hours, wifi_password, checkout_time, amenity_location)` : '- Auto-responses are DISABLED for this tenant, always return null for auto_response'}
7. If ANY operational action is requested (order food, room service, cleaning), set auto_response to null
8. NEVER suggest operational actions - only provide information

Available FAQs: ${JSON.stringify(faqs || [])}

Return structured JSON with: detected_language, cleaned_text, literal_translation, polite_suggestion (${translationStyle === 'literal' ? 'must be null' : 'concierge reply or null'}), intent, confidence (0-1), auto_response (null or the answer text), auto_response_category, mode_used ("${translationStyle}")`;
        userPrompt = `Guest message: "${message}"`;
      }
      
      generateStructuredOutput = true;

    } else if (action === 'process_staff_reply') {
      // OPTION-C-V1: Enhanced prompt with translation_style support
      systemPrompt = `You are a ${aiResponseStyle} hotel AI assistant. Process this staff message with these CRITICAL requirements:

TRANSLATION MODE: ${translationStyle.toUpperCase()}
STAFF LANGUAGE: ${staffLanguage}
GUEST LANGUAGE: ${guest_language}

CRITICAL RULES:
1. NEVER change or rewrite the staff's original text - preserve it exactly
2. Provide STRICT literal translation to guest language
3. Translation mode behavior:
   - literal: Return ONLY strict translation, polite_suggestion MUST be null
   - polite: Return literal translation + polite_suggestion (concierge-style reply)
   - hybrid: Return literal translation + polite_suggestion (separate AI reply)

REQUIRED RESPONSE STRUCTURE:
{
  "original_text": "Staff's exact message (unchanged) in ${staffLanguage}",
  "literal_translation": "Strict translation to ${guest_language}",
  "polite_suggestion": ${translationStyle === 'literal' ? 'null (literal mode)' : `"Polite concierge-style reply in ${guest_language}"`},
  "suggestions": ["Alternative reply 1", "Alternative reply 2"],
  "mode_used": "${translationStyle}"
}

${translationStyle !== 'literal' ? `Polite suggestion rules:
- Use professional hotel concierge tone
- Keep meaning aligned with staff's intent
- 20-40 words maximum
- In guest language ${guest_language}` : ''}

CRITICAL: Both original_text and literal_translation MUST be populated. Never return null.`;

      userPrompt = `Staff message to process: "${message}"

Guest language: ${guest_language}
Staff language: ${staffLanguage}`;
      generateStructuredOutput = true;

    } else if (action === 'ai_first_responder') {
      // AI First Responder: immediate acknowledgment in guest's language
      systemPrompt = `You are a luxury hotel AI assistant providing immediate acknowledgment to guests.
The guest wrote in ${guest_language || 'their language'}. Generate a brief, polite acknowledgment in their language:
- Thank them for reaching out
- Let them know staff will assist shortly
- Keep it under 30 words
- Be warm and professional

Return JSON with: acknowledgment_text (in guest language), language (guest language code)`;
      userPrompt = `Guest message: "${message}"`;
      generateStructuredOutput = true;

    } else if (action === 'staff_training_query') {
      systemPrompt = `You are a hotel operations training assistant. Answer staff questions about hotel procedures, SOPs, and workflows.

Available SOPs: ${JSON.stringify(sops || [])}

Provide clear, step-by-step guidance based on standard hotel operations. If the SOP exists in the knowledge base, cite it. Otherwise, provide general best practices for luxury hotels.`;

      userPrompt = message;
      generateStructuredOutput = false;

    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    // Call Gemini API directly
    const geminiPayload: any = {
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\n${userPrompt}`
        }]
      }]
    };

    // v1 API does not support responseMimeType - rely on prompt for JSON formatting

    // Phase 1: Use v1beta API with gemini-2.0-flash model (GEMINI-FIX-V4)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiPayload)
      }
    );

    // Phase 2: Enhanced error handling with detailed logging
    if (!geminiResponse.ok) {
      if (geminiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await geminiResponse.text();
      console.error('[AI-MESSAGE] Gemini API error:', {
        status: geminiResponse.status,
        statusText: geminiResponse.statusText,
          error: errorText,
          action,
          model: 'gemini-2.0-flash'
        });
      
      // Return partial success with original text if AI fails
      if (action === 'process_guest_message') {
        return new Response(JSON.stringify({ 
          success: true, 
          data: {
            original_text: message,
            cleaned_text: message,
            translated_text: message,
            detected_language: guest_language || 'en',
            target_language: staffLanguage,
            intent: 'other',
            confidence: 0.0,
            auto_response: null,
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (action === 'process_staff_reply') {
        return new Response(JSON.stringify({ 
          success: true, 
          data: {
            enhanced_text: message,
            translated_text: message,
            suggestions: [],
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    
    console.log('[AI-MESSAGE] Gemini response received:', {
      action,
      hasContent: !!geminiData.candidates?.[0]?.content?.parts?.[0]?.text,
      contentPreview: geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 200),
    });
    
    let result;
    const contentText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!contentText) {
      throw new Error('No response from Gemini');
    }

    if (generateStructuredOutput) {
      // Parse JSON response with robust cleanup
      try {
        let cleanedText = contentText.trim();
        // Remove markdown code blocks if present
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.slice(7);
        }
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.slice(3);
        }
        if (cleanedText.endsWith('```')) {
          cleanedText = cleanedText.slice(0, -3);
        }
        result = JSON.parse(cleanedText.trim());
      } catch (e) {
        console.error('Failed to parse Gemini JSON:', contentText);
        // Return fallback based on action type
        if (action === 'process_guest_message') {
          result = {
            detected_language: 'unknown',
            cleaned_text: message,
            translated_to_english: message,
            intent: 'other',
            confidence: 0.0,
            auto_response: null,
          };
        } else if (action === 'process_staff_reply') {
          result = {
            enhanced_text: message,
            translated_text: message,
            suggestions: [],
          };
        } else {
          throw new Error('Invalid JSON response from Gemini');
        }
      }
    } else {
      // Regular text response for staff training
      result = {
        response: contentText
      };
    }

    console.log('[AI-MESSAGE] Action:', action, 'Result:', result);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[AI-MESSAGE] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
