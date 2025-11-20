import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AMEND-BOOKING-V1: Properly amend bookings with folio adjustments
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[amend-booking] AMEND-BOOKING-V1: Processing booking amendment');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('[amend-booking] AMEND-BOOKING-V1: Authentication failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      booking_id, 
      check_in, 
      check_out, 
      room_id, 
      rate_override, 
      notes, 
      amendment_reason,
      staff_id 
    } = await req.json();

    console.log('[amend-booking] AMEND-BOOKING-V1: Request payload:', {
      booking_id,
      check_in,
      check_out,
      room_id,
      rate_override,
      amendment_reason
    });

    if (!booking_id || !amendment_reason) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: booking_id and amendment_reason are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch current booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('*, room:rooms(number, rate, type), guest:guests(name)')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('[amend-booking] AMEND-BOOKING-V1: Booking not found:', bookingError);
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[amend-booking] AMEND-BOOKING-V1: Current booking:', {
      id: booking.id,
      status: booking.status,
      check_in: booking.check_in,
      check_out: booking.check_out,
      room_id: booking.room_id,
      tenant_id: booking.tenant_id
    });

    const isCheckedIn = booking.status === 'checked_in';
    let folioId = null;
    let priceDifference = 0;

    // If checked-in, find open folio
    if (isCheckedIn) {
      const { data: folio, error: folioError } = await supabaseAdmin
        .from('stay_folios')
        .select('id, total_charges')
        .eq('booking_id', booking_id)
        .eq('tenant_id', booking.tenant_id)
        .eq('status', 'open')
        .maybeSingle();

      if (folioError) {
        console.error('[amend-booking] AMEND-BOOKING-V1: Error finding folio:', folioError);
        return new Response(
          JSON.stringify({ success: false, error: 'Error finding folio' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!folio) {
        console.error('[amend-booking] AMEND-BOOKING-V1: No open folio found');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No open folio found for checked-in booking' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      folioId = folio.id;
      console.log('[amend-booking] AMEND-BOOKING-V1: Found folio:', folioId);
    }

    // Calculate price difference if dates or rate changed
    const oldCheckIn = new Date(booking.check_in);
    const oldCheckOut = new Date(booking.check_out);
    const newCheckIn = check_in ? new Date(check_in) : oldCheckIn;
    const newCheckOut = check_out ? new Date(check_out) : oldCheckOut;

    const oldNights = Math.ceil((oldCheckOut.getTime() - oldCheckIn.getTime()) / (1000 * 60 * 60 * 24));
    const newNights = Math.ceil((newCheckOut.getTime() - newCheckIn.getTime()) / (1000 * 60 * 60 * 24));

    const oldRate = Number(booking.room?.rate || 0);
    const newRate = rate_override ? Number(rate_override) : oldRate;

    const oldTotal = oldNights * oldRate;
    const newTotal = newNights * newRate;
    priceDifference = newTotal - oldTotal;

    console.log('[amend-booking] AMEND-BOOKING-V1: Price calculation:', {
      oldNights,
      newNights,
      oldRate,
      newRate,
      oldTotal,
      newTotal,
      priceDifference
    });

    // If checked-in and price changed, post adjustment to folio
    if (isCheckedIn && folioId && priceDifference !== 0) {
      const adjustmentType = priceDifference > 0 ? 'charge' : 'credit';
      const adjustmentAmount = Math.abs(priceDifference);

      console.log('[amend-booking] AMEND-BOOKING-V1: Posting folio adjustment:', {
        type: adjustmentType,
        amount: adjustmentAmount
      });

      const { error: chargeError } = await supabaseAdmin.rpc(
        'folio_post_charge',
        {
          p_folio_id: folioId,
          p_amount: priceDifference > 0 ? adjustmentAmount : -adjustmentAmount,
          p_description: `Booking amendment: ${amendment_reason}`,
          p_reference_type: 'booking_amendment',
          p_reference_id: booking_id,
          p_department: 'front_desk'
        }
      );

      if (chargeError) {
        console.error('[amend-booking] AMEND-BOOKING-V1: Error posting adjustment:', chargeError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to post folio adjustment: ${chargeError.message}` 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[amend-booking] AMEND-BOOKING-V1: Folio adjustment posted successfully');
    }

    // Validate room availability if room changed
    if (room_id && room_id !== booking.room_id) {
      const { data: conflicts, error: conflictError } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('room_id', room_id)
        .eq('tenant_id', booking.tenant_id)
        .neq('id', booking_id)
        .in('status', ['reserved', 'checked_in'])
        .or(`and(check_in.lte.${newCheckOut.toISOString()},check_out.gte.${newCheckIn.toISOString()})`);

      if (conflictError) {
        console.error('[amend-booking] AMEND-BOOKING-V1: Error checking conflicts:', conflictError);
      } else if (conflicts && conflicts.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Selected room is not available for the chosen dates' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Prepare booking updates
    const metadata = booking.metadata as any || {};
    const updates: any = {};

    if (check_in) updates.check_in = check_in;
    if (check_out) updates.check_out = check_out;
    if (room_id) updates.room_id = room_id;

    updates.total_amount = newTotal;
    updates.metadata = {
      ...metadata,
      rate_override: rate_override || null,
      special_requests: notes || metadata.special_requests,
      amendments: [
        ...(metadata.amendments || []),
        {
          amended_at: new Date().toISOString(),
          amended_by: staff_id || user.id,
          reason: amendment_reason,
          changes: {
            check_in: check_in !== booking.check_in,
            check_out: check_out !== booking.check_out,
            room_id: room_id !== booking.room_id,
            rate_override: rate_override !== oldRate,
            price_difference: priceDifference
          }
        }
      ]
    };

    console.log('[amend-booking] AMEND-BOOKING-V1: Updating booking with:', updates);

    // Update booking
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update(updates)
      .eq('id', booking_id)
      .eq('tenant_id', booking.tenant_id);

    if (updateError) {
      console.error('[amend-booking] AMEND-BOOKING-V1: Error updating booking:', updateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to update booking: ${updateError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update room statuses if room changed
    if (room_id && room_id !== booking.room_id && isCheckedIn) {
      // Old room to cleaning
      await supabaseAdmin
        .from('rooms')
        .update({ status: 'cleaning' })
        .eq('id', booking.room_id)
        .eq('tenant_id', booking.tenant_id);

      // New room to occupied
      await supabaseAdmin
        .from('rooms')
        .update({ status: 'occupied' })
        .eq('id', room_id)
        .eq('tenant_id', booking.tenant_id);

      console.log('[amend-booking] AMEND-BOOKING-V1: Room statuses updated');
    }

    // Log audit event
    await supabaseAdmin.from('hotel_audit_logs').insert({
      tenant_id: booking.tenant_id,
      table_name: 'bookings',
      record_id: booking_id,
      action: 'amend',
      user_id: staff_id || user.id,
      before_data: {
        check_in: booking.check_in,
        check_out: booking.check_out,
        room_id: booking.room_id,
        total_amount: booking.total_amount
      },
      after_data: updates
    });

    console.log('[amend-booking] AMEND-BOOKING-V1: Amendment completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Booking amended successfully',
        data: {
          booking_id,
          price_difference: priceDifference,
          folio_adjusted: isCheckedIn && priceDifference !== 0,
          folio_id: folioId,
          new_total_amount: newTotal
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[amend-booking] AMEND-BOOKING-V1: Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        stack: errorStack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
