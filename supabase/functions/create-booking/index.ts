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

    const { action_id, tenant_id, guest_id, room_id, check_in, check_out, total_amount, organization_id, department } = await req.json();

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
        organization_id: organization_id || null,
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

    // If organization booking, create payment and debit wallet
    let payment = null;
    if (organization_id && total_amount > 0) {
      console.log('Creating organization payment for booking:', newBooking.id);
      
      // Get organization wallet
      const { data: wallet, error: walletError } = await supabaseClient
        .from('wallets')
        .select('id')
        .eq('owner_id', organization_id)
        .eq('wallet_type', 'organization')
        .single();

      if (walletError || !wallet) {
        console.error('Organization wallet not found:', walletError);
        // Don't fail the booking, just log the error
      } else {
        // Create payment record
        const { data: newPayment, error: paymentError } = await supabaseClient
          .from('payments')
          .insert({
            tenant_id,
            booking_id: newBooking.id,
            guest_id,
            organization_id,
            wallet_id: wallet.id,
            amount: total_amount,
            expected_amount: total_amount,
            payment_type: 'full',
            method: 'organization_wallet',
            status: 'completed',
            charged_to_organization: true,
            department: department || 'front_desk',
            transaction_ref: `ORG-${newBooking.id.substring(0, 8)}`,
            metadata: {
              booking_id: newBooking.id,
              auto_created: true,
              created_at: new Date().toISOString()
            }
          })
          .select()
          .single();

        if (paymentError) {
          console.error('Error creating organization payment:', paymentError);
        } else {
          payment = newPayment;
          
          // Create wallet transaction (debit)
          const { error: txnError } = await supabaseClient
            .from('wallet_transactions')
            .insert({
              tenant_id,
              wallet_id: wallet.id,
              type: 'debit',
              amount: total_amount,
              payment_id: newPayment.id,
              description: `Booking charge - Room ${room_id} - Guest ${guest_id}`,
              created_by: guest_id
            });

          if (txnError) {
            console.error('Error creating wallet transaction:', txnError);
          } else {
            console.log('Organization wallet debited successfully');
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking: newBooking,
        payment: payment
      }),
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
