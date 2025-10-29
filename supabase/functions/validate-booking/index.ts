import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { 
      tenant_id, 
      room_id, 
      guest_id,
      organization_id,
      check_in, 
      check_out,
      category_id 
    } = await req.json();

    console.log('Validating booking:', { tenant_id, room_id, check_in, check_out });

    // Validation 1: Check required fields
    if (!tenant_id || !room_id || !guest_id || !check_in || !check_out) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: tenant_id, room_id, guest_id, check_in, check_out' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validation 2: Check dates
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Check-in date cannot be in the past' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (checkOutDate <= checkInDate) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Check-out date must be after check-in date' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (nights < 1) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Minimum stay is 1 night' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (nights > 365) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Maximum stay is 365 nights' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validation 3: Check room availability (no overlapping bookings)
    const { data: overlappingBookings, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('room_id', room_id)
      .eq('tenant_id', tenant_id)
      .in('status', ['reserved', 'checked_in'])
      .or(`and(check_in.lt.${check_out},check_out.gt.${check_in})`);

    if (bookingError) {
      console.error('Error checking overlapping bookings:', bookingError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to check room availability' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (overlappingBookings && overlappingBookings.length > 0) {
      console.log('Found overlapping bookings:', overlappingBookings);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Room is not available for the selected dates. Please choose different dates or another room.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    // Validation 4: Verify room exists and is active
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, status, category_id')
      .eq('id', room_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (roomError || !room) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Room not found' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Validation 5: Verify guest exists
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id')
      .eq('id', guest_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (guestError || !guest) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Guest not found' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Validation 6: If organization booking, check credit limit
    if (organization_id) {
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, credit_limit, allow_negative_balance')
        .eq('id', organization_id)
        .eq('tenant_id', tenant_id)
        .single();

      if (orgError || !org) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Organization not found' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // Check if organization has exceeded credit limit
      if (!org.allow_negative_balance && org.credit_limit) {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('owner_id', organization_id)
          .single();

        if (wallet && Math.abs(wallet.balance) > org.credit_limit) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Organization credit limit exceeded. Cannot create booking.' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
      }
    }

    // All validations passed
    console.log('Booking validation successful');
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Booking validation passed',
        nights
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Validation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
