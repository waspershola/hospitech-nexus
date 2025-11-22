import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PHASE-5A-VALIDATION: Zod schema for charge-to-room requests
const chargeToRoomSchema = z.object({
  request_id: z.string().uuid('Invalid request ID format'),
  tenant_id: z.string().uuid('Invalid tenant ID format'),
  amount: z.number().positive('Amount must be greater than zero').max(10000000, 'Amount exceeds maximum allowed'),
  description: z.string().max(500, 'Description too long').optional(),
  service_category: z.string().min(1, 'Service category is required').max(100, 'Service category too long'),
});

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

    const rawBody = await req.json();

    // PHASE-5A-VALIDATION: Validate request body with Zod
    const validationResult = chargeToRoomSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      console.error('[qr-auto-folio-post] Validation failed:', errors);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request data',
          details: errors,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { request_id, tenant_id, amount, description, service_category } = validationResult.data;

    console.log('[qr-auto-folio-post] QR-AUTO-FOLIO-V2-VALIDATED - Processing charge-to-room:', {
      request_id,
      tenant_id,
      amount,
      service_category,
    });

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

    // Verify folio is open and get booking details
    const { data: folio, error: folioError } = await supabaseClient
      .from('stay_folios')
      .select('id, status, folio_number, balance, booking_id, guest_id')
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

    // Get booking to check organization limits
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('organization_id')
      .eq('id', folio.booking_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (bookingError) {
      console.error('[qr-auto-folio-post] Error fetching booking:', bookingError);
    }

    // Validate organization limits if applicable
    if (booking?.organization_id) {
      console.log('[qr-auto-folio-post] Validating org limits for:', booking.organization_id);
      
      const { data: validation, error: validationError } = await supabaseClient.rpc(
        'validate_org_limits',
        {
          _org_id: booking.organization_id,
          _guest_id: folio.guest_id,
          _department: service_category || 'general',
          _amount: amount,
        }
      );

      if (validationError) {
        console.error('[qr-auto-folio-post] Validation error:', validationError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to validate organization limits' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      if (validation && !validation.allowed) {
        console.log('[qr-auto-folio-post] Organization limit exceeded:', validation.detail);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Organization credit limit exceeded',
            code: validation.code,
            detail: validation.detail,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // Post charge to folio using RPC (validation happens inside RPC too)
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
