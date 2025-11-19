import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChargeToRoomRequest {
  request_id: string;
  tenant_id: string;
  amount: number;
  description?: string;
  service_category: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { request_id, tenant_id, amount, description, service_category }: ChargeToRoomRequest = await req.json();

    console.log('[qr-auto-folio-post] QR-AUTO-FOLIO-V1 - Processing charge-to-room:', {
      request_id,
      tenant_id,
      amount,
      service_category,
    });

    // Validate inputs
    if (!request_id || !tenant_id || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing or invalid required fields',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get request details and verify folio exists
    const { data: request, error: requestError } = await supabaseClient
      .from('requests')
      .select('id, stay_folio_id, room_id, status, metadata')
      .eq('id', request_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (requestError || !request) {
      console.error('[qr-auto-folio-post] Request not found:', requestError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Request not found',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (!request.stay_folio_id) {
      console.error('[qr-auto-folio-post] No folio linked to request');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No active folio found. Guest must be checked in to charge to room.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verify folio is open
    const { data: folio, error: folioError } = await supabaseClient
      .from('stay_folios')
      .select('id, status, folio_number, balance')
      .eq('id', request.stay_folio_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (folioError || !folio || folio.status !== 'open') {
      console.error('[qr-auto-folio-post] Folio not found or closed:', folioError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Folio is closed or not available',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Post charge to folio using RPC
    const chargeDescription = description || `${service_category} - ${request_id.slice(0, 8)}`;
    
    const { data: postResult, error: postError } = await supabaseClient.rpc(
      'folio_post_charge',
      {
        p_folio_id: request.stay_folio_id,
        p_amount: amount,
        p_description: chargeDescription,
        p_reference_type: 'qr_request',
        p_reference_id: request_id,
        p_department: service_category,
      }
    );

    if (postError) {
      console.error('[qr-auto-folio-post] Failed to post charge:', postError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to post charge to folio',
          details: postError.message,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('[qr-auto-folio-post] Charge posted successfully:', postResult);

    // Update request status to 'charged_to_folio'
    const { error: updateError } = await supabaseClient
      .from('requests')
      .update({
        status: 'charged_to_folio',
        metadata: {
          ...request.metadata,
          payment_info: {
            ...request.metadata?.payment_info,
            status: 'charged_to_room',
            charged_at: new Date().toISOString(),
            folio_id: request.stay_folio_id,
            folio_number: folio.folio_number,
          },
        },
      })
      .eq('id', request_id)
      .eq('tenant_id', tenant_id);

    if (updateError) {
      console.error('[qr-auto-folio-post] Failed to update request status:', updateError);
      // Don't fail the whole operation as charge was successful
    }

    return new Response(
      JSON.stringify({
        success: true,
        folio_id: request.stay_folio_id,
        folio_number: folio.folio_number,
        amount_charged: amount,
        transaction_id: postResult?.transaction_id,
        message: `Charge of ₦${amount.toLocaleString()} posted to folio ${folio.folio_number}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[qr-auto-folio-post] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
