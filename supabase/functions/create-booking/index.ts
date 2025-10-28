import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action_id, tenant_id, guest_id, room_id, check_in, check_out, total_amount } = await req.json();

    console.log('Creating booking with action_id:', action_id);

    // Check for existing booking with same action_id (idempotency)
    const { data: existingBooking, error: existingError } = await supabaseClient
      .from('bookings')
      .select('*')
      .eq('action_id', action_id)
      .single();

    if (existingBooking) {
      console.log('Booking already exists, returning existing:', existingBooking.id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          booking: existingBooking,
          message: 'Booking already exists (idempotent)' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check room availability
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);

    const { data: overlappingBookings, error: availabilityError } = await supabaseClient
      .from('bookings')
      .select('id, guest_id')
      .eq('tenant_id', tenant_id)
      .eq('room_id', room_id)
      .in('status', ['reserved', 'checked_in'])
      .lt('check_in', checkOutDate.toISOString())
      .gt('check_out', checkInDate.toISOString());

    if (availabilityError) {
      console.error('Error checking availability:', availabilityError);
      throw availabilityError;
    }

    if (overlappingBookings && overlappingBookings.length > 0) {
      console.log('Room not available, overlapping bookings:', overlappingBookings);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Room not available for selected dates',
          conflicting_bookings: overlappingBookings 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    // Create booking
    const { data: newBooking, error: createError } = await supabaseClient
      .from('bookings')
      .insert([{
        tenant_id,
        guest_id,
        room_id,
        check_in: checkInDate.toISOString(),
        check_out: checkOutDate.toISOString(),
        total_amount,
        status: 'reserved',
        action_id,
        metadata: {
          created_via: 'edge_function',
          created_at: new Date().toISOString(),
        }
      }])
      .select()
      .single();

    if (createError) {
      console.error('Error creating booking:', createError);
      throw createError;
    }

    // Update room status to reserved
    await supabaseClient
      .from('rooms')
      .update({ status: 'reserved' })
      .eq('id', room_id);

    console.log('Booking created successfully:', newBooking.id);

    return new Response(
      JSON.stringify({ success: true, booking: newBooking }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
    );

  } catch (error) {
    console.error('Error in create-booking function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
