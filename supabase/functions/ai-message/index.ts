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
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
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
    let responseFormat: any = null;

    // Handle different actions
    if (action === 'process_guest_message') {
      systemPrompt = `You are a luxury hotel AI assistant processing guest messages. Your tasks:
1. Detect the language (return ISO code like 'en', 'zh', 'yo', 'fr', etc.)
2. Clean and normalize the message (fix typos, slang, broken English)
3. Translate to English if needed
4. Detect intent: housekeeping, maintenance, room_service, spa, pool, wifi, breakfast, complaint, request, faq, other
5. Determine if this is a simple FAQ that can be auto-answered (confidence > 0.90)

Available FAQs: ${JSON.stringify(faqs || [])}

Return structured JSON with: detected_language, cleaned_text, translated_to_english, intent, confidence (0-1), auto_response (null or the answer text), auto_response_category`;

      userPrompt = `Guest message: "${message}"`;

      responseFormat = {
        type: "function",
        function: {
          name: "process_guest_message",
          description: "Process and analyze guest message",
          parameters: {
            type: "object",
            properties: {
              detected_language: { type: "string" },
              cleaned_text: { type: "string" },
              translated_to_english: { type: "string" },
              intent: { type: "string" },
              confidence: { type: "number" },
              auto_response: { type: ["string", "null"] },
              auto_response_category: { type: ["string", "null"] }
            },
            required: ["detected_language", "cleaned_text", "translated_to_english", "intent", "confidence"],
            additionalProperties: false
          }
        }
      };

    } else if (action === 'process_staff_reply') {
      systemPrompt = `You are a luxury hotel AI assistant enhancing staff replies. Your tasks:
1. Enhance the tone to be professional, courteous, and luxury-appropriate
2. Translate to the guest's language: ${guest_language}
3. Keep it concise and actionable

Return JSON with: enhanced_text (in English), translated_text (in guest language)`;

      userPrompt = `Staff reply: "${message}"`;

      responseFormat = {
        type: "function",
        function: {
          name: "process_staff_reply",
          description: "Enhance and translate staff reply",
          parameters: {
            type: "object",
            properties: {
              enhanced_text: { type: "string" },
              translated_text: { type: "string" }
            },
            required: ["enhanced_text", "translated_text"],
            additionalProperties: false
          }
        }
      };

    } else if (action === 'staff_training_query') {
      systemPrompt = `You are a hotel operations training assistant. Answer staff questions about hotel procedures, SOPs, and workflows.

Available SOPs: ${JSON.stringify(sops || [])}

Provide clear, step-by-step guidance based on standard hotel operations. If the SOP exists in the knowledge base, cite it. Otherwise, provide general best practices for luxury hotels.`;

      userPrompt = message;

    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    // Call Lovable AI Gateway with Gemini 1.5 Flash
    const aiPayload: any = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    };

    if (responseFormat) {
      aiPayload.tools = [responseFormat];
      aiPayload.tool_choice = { type: "function", function: { name: responseFormat.function.name } };
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(aiPayload)
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    
    let result;
    if (responseFormat) {
      // Extract tool call result
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        result = JSON.parse(toolCall.function.arguments);
      } else {
        throw new Error('No tool call result');
      }
    } else {
      // Regular text response for staff training
      result = {
        response: aiData.choices?.[0]?.message?.content || ''
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