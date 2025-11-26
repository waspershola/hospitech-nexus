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
3. Translate to ${staffLanguage.toUpperCase()} (staff language) if needed
4. Detect intent: housekeeping, maintenance, room_service, spa, pool, wifi, breakfast, complaint, request, faq, other
5. Determine if this is a simple FAQ that can be auto-answered (confidence > 0.90)
6. NEVER suggest operational actions - only provide information

Available FAQs: ${JSON.stringify(faqs || [])}

Return structured JSON with: detected_language, cleaned_text, translated_to_english, intent, confidence (0-1), auto_response (null or the answer text), auto_response_category`;

      userPrompt = `Guest message: "${message}"`;
      generateStructuredOutput = true;

    } else if (action === 'process_staff_reply') {
      systemPrompt = `You are a luxury hotel AI assistant enhancing staff replies. Your tasks:
1. Enhance the tone to be professional, courteous, and luxury-appropriate
2. Translate from ${staffLanguage.toUpperCase()} to the guest's language: ${guest_language}
3. Keep it concise and actionable
4. Generate 2-3 alternative suggestion replies that staff can use

Return JSON with: enhanced_text (in ${staffLanguage}), translated_text (in guest language), suggestions (array of 2-3 alternative replies in guest language)`;

      userPrompt = `Staff reply: "${message}"`;
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

    // For structured output, add generation config
    if (generateStructuredOutput) {
      geminiPayload.generationConfig = {
        responseMimeType: "application/json"
      };
    }

    // Phase 1: Fixed API endpoint from v1beta to v1
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
      
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    
    let result;
    const contentText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!contentText) {
      throw new Error('No response from Gemini');
    }

    if (generateStructuredOutput) {
      // Parse JSON response
      try {
        result = JSON.parse(contentText);
      } catch (e) {
        console.error('Failed to parse Gemini JSON:', contentText);
        throw new Error('Invalid JSON response from Gemini');
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
