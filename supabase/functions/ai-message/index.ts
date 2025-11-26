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

    // Fetch tenant settings for staff language
    const { data: tenant } = await supabaseClient
      .from('tenants')
      .select('preferred_staff_language')
      .eq('id', tenant_id)
      .single();
    
    const staffLanguage = tenant?.preferred_staff_language || 'en';

    // Handle different actions
    if (action === 'process_guest_message') {
      systemPrompt = `You are a luxury hotel AI assistant processing guest messages. Your tasks:
1. Detect the language (return ISO code like 'en', 'zh', 'yo', 'fr', etc.)
2. Clean and normalize the message (fix typos, slang, broken English, pidgin)
3. CONDITIONAL TRANSLATION: ONLY translate to ${staffLanguage.toUpperCase()} if the detected language is DIFFERENT from ${staffLanguage.toUpperCase()}
   - If detected_language === "${staffLanguage}", set translated_to_english = cleaned_text (no translation needed)
   - If detected_language !== "${staffLanguage}", translate the cleaned_text to ${staffLanguage.toUpperCase()}
4. Detect intent: housekeeping, maintenance, room_service, spa, pool, wifi, breakfast, complaint, request, faq, other
5. FAQ AUTO-RESPONSE RULES - ONLY provide auto_response when ALL of these are true:
   - Question is purely informational (time, location, amenity info)
   - NO service request is implied
   - Confidence > 0.90
   - Question matches a known FAQ category (breakfast_hours, pool_hours, wifi_password, checkout_time, amenity_location)
6. If ANY operational action is requested (order food, room service, cleaning), set auto_response to null
7. NEVER suggest operational actions - only provide information

Available FAQs: ${JSON.stringify(faqs || [])}

Return structured JSON with: detected_language, cleaned_text, translated_to_english, intent, confidence (0-1), auto_response (null or the answer text), auto_response_category`;

      userPrompt = `Guest message: "${message}"`;
      generateStructuredOutput = true;

    } else if (action === 'process_staff_reply') {
      systemPrompt = `You are a luxury hotel AI assistant enhancing staff replies. Your tasks:
1. Enhance the tone to be professional, courteous, and luxury-appropriate
2. CONDITIONAL TRANSLATION: ONLY translate if needed:
   - If guest language "${guest_language}" is DIFFERENT from staff language "${staffLanguage}", translate to ${guest_language}
   - If guest language === staff language, set translated_text = enhanced_text (no translation needed)
3. Keep it concise and actionable
4. Generate 2-3 alternative suggestion replies that staff can use (in guest language)

Return JSON with: enhanced_text (in ${staffLanguage}), translated_text (in guest language if needed, otherwise same as enhanced_text), suggestions (array of 2-3 alternative replies)`;

      userPrompt = `Staff reply: "${message}"`;
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

    // Phase 1: Use v1beta API with gemini-1.5-flash model (GEMINI-FIX-V3)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
        model: 'gemini-1.5-flash'
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
