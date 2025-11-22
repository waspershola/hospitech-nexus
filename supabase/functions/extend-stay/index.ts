import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// EXTEND-STAY-V2-ROOM-STATUS-FIX: Extend stays with proper validation
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[extend-stay] EXTEND-STAY-V2-ROOM-STATUS-FIX: Processing stay extension request');

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      console.error('[extend-stay] EXTEND-STAY-V1: Missing Authorization token');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Missing token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user using the JWT token directly (server-side safe)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error('[extend-stay] EXTEND-STAY-V1: Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { booking_id, new_checkout, staff_id, reason } = await req.json();

    console.log('[extend-stay] EXTEND-STAY-V1: Request payload:', {
      booking_id,
      new_checkout,
      staff_id,
      reason
    });

    // Validation
    if (!booking_id || !new_checkout) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: booking_id and new_checkout are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch booking with tenant_id
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('*, room:rooms!bookings_room_id_fkey(number, rate, type), guest:guests(name)')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('[extend-stay] EXTEND-STAY-V1: Booking not found:', bookingError);
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[extend-stay] EXTEND-STAY-V1: Booking found:', {
      booking_id: booking.id,
      status: booking.status,
      current_checkout: booking.check_out,
      tenant_id: booking.tenant_id
    });

    // Validate booking is checked-in
    if (booking.status !== 'checked_in') {
      console.error('[extend-stay] EXTEND-STAY-V1: Invalid booking status:', booking.status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Cannot extend stay: booking status is ${booking.status}. Only checked-in bookings can be extended.` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate new checkout date
    const currentCheckout = new Date(booking.check_out);
    const newCheckoutDate = new Date(new_checkout);

    if (newCheckoutDate <= currentCheckout) {
      console.error('[extend-stay] EXTEND-STAY-V1: Invalid new checkout date');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'New check-out date must be after current check-out date' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate additional nights
    const additionalNights = Math.ceil(
      (newCheckoutDate.getTime() - currentCheckout.getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log('[extend-stay] EXTEND-STAY-V1: Calculated additional nights:', additionalNights);

    // Get room rate
    const roomRate = Number(booking.room?.rate || 0);
    if (roomRate === 0) {
      console.error('[extend-stay] EXTEND-STAY-V1: Room rate not found');
      return new Response(
        JSON.stringify({ success: false, error: 'Room rate not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate additional charges
    const additionalCharges = additionalNights * roomRate;

    console.log('[extend-stay] EXTEND-STAY-V1: Additional charges:', {
      nights: additionalNights,
      rate: roomRate,
      total: additionalCharges
    });

    // Find open folio for booking
    const { data: folio, error: folioError } = await supabaseAdmin
      .from('stay_folios')
      .select('id')
      .eq('booking_id', booking_id)
      .eq('tenant_id', booking.tenant_id)
      .eq('status', 'open')
      .maybeSingle();

    if (folioError) {
      console.error('[extend-stay] EXTEND-STAY-V1: Error finding folio:', folioError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error finding folio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!folio) {
      console.error('[extend-stay] EXTEND-STAY-V1: No open folio found for booking');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No open folio found for this booking. Please ensure guest is checked in.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[extend-stay] EXTEND-STAY-V1: Found open folio:', folio.id);

    // Post additional charges to folio using RPC
    const { data: chargeResult, error: chargeError } = await supabaseAdmin.rpc(
      'folio_post_charge',
      {
        p_folio_id: folio.id,
        p_amount: additionalCharges,
        p_description: `Stay extension: ${additionalNights} additional night(s) @ ₦${roomRate.toLocaleString()}/night`,
        p_reference_type: 'stay_extension',
        p_reference_id: booking_id,
        p_department: 'front_desk'
      }
    );

    if (chargeError) {
      console.error('[extend-stay] EXTEND-STAY-V1: Error posting charge to folio:', chargeError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to post charges to folio: ${chargeError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[extend-stay] EXTEND-STAY-V1: Charge posted to folio:', chargeResult);

    // Update booking check_out date and total_amount
    const newTotalAmount = Number(booking.total_amount || 0) + additionalCharges;

    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        check_out: new_checkout,
        total_amount: newTotalAmount,
        metadata: {
          ...(typeof booking.metadata === 'object' ? booking.metadata : {}),
          extended: true,
          extension_history: [
            ...((booking.metadata as any)?.extension_history || []),
            {
              extended_at: new Date().toISOString(),
              extended_by: staff_id || user.id,
              reason: reason || 'Guest requested extension',
              original_checkout: booking.check_out,
              new_checkout: new_checkout,
              additional_nights: additionalNights,
              additional_charges: additionalCharges
            }
          ]
        }
      })
      .eq('id', booking_id)
      .eq('tenant_id', booking.tenant_id);

    if (updateError) {
      console.error('[extend-stay] EXTEND-STAY-V1: Error updating booking:', updateError);
      // Note: Charge was already posted - we should consider reversal here
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to update booking: ${updateError.message}. Charges were posted to folio.` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log audit event
    await supabaseAdmin.from('hotel_audit_logs').insert({
      tenant_id: booking.tenant_id,
      table_name: 'bookings',
      record_id: booking_id,
      action: 'extend_stay',
      user_id: staff_id || user.id,
      before_data: {
        check_out: booking.check_out,
        total_amount: booking.total_amount
      },
      after_data: {
        check_out: new_checkout,
        total_amount: newTotalAmount,
        additional_nights: additionalNights,
        additional_charges: additionalCharges
      }
    });

    // Log extension details (room status remains unchanged during extension)
    console.log('[extend-stay] EXTEND-STAY-V2-ROOM-STATUS-FIX: Stay extension completed', {
      booking_status: booking.status,
      room_status_note: booking.status === 'checked_in' ? 'Room remains occupied' : 'Room remains reserved',
      additional_nights: additionalNights,
      new_checkout: new_checkout
    });

    console.log('[extend-stay] EXTEND-STAY-V2-ROOM-STATUS-FIX: Stay extension completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Stay extended successfully',
        data: {
          booking_id,
          original_checkout: booking.check_out,
          new_checkout: new_checkout,
          additional_nights: additionalNights,
          additional_charges: additionalCharges,
          new_total_amount: newTotalAmount,
          folio_id: folio.id
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[extend-stay] EXTEND-STAY-V1: Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        stack: errorStack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
