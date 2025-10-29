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

    const { action_id, tenant_id, guest_id, room_id, check_in, check_out, total_amount, organization_id, department, created_by } = await req.json();

    console.log('Creating booking with action_id:', action_id);

    // Fetch hotel financials for tax calculations
    const { data: financials } = await supabaseClient
      .from('hotel_financials')
      .select('vat_rate, vat_inclusive, service_charge, service_charge_inclusive, currency')
      .eq('tenant_id', tenant_id)
      .single();

    // Fetch room details for rate calculation
    const { data: room } = await supabaseClient
      .from('rooms')
      .select('*, category:room_categories(base_rate)')
      .eq('id', room_id)
      .single();

    // Calculate nights and tax breakdown
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    const baseRate = room?.category?.base_rate || room?.rate || 0;
    const baseAmount = baseRate * nights;

    let vatAmount = 0;
    let serviceChargeAmount = 0;
    let calculatedTotal = baseAmount;

    if (financials) {
      // Calculate VAT
      if (financials.vat_rate > 0) {
        if (financials.vat_inclusive) {
          vatAmount = baseAmount - (baseAmount / (1 + financials.vat_rate / 100));
        } else {
          vatAmount = baseAmount * (financials.vat_rate / 100);
          calculatedTotal += vatAmount;
        }
      }

      // Calculate Service Charge
      if (financials.service_charge > 0) {
        if (financials.service_charge_inclusive) {
          serviceChargeAmount = baseAmount - (baseAmount / (1 + financials.service_charge / 100));
        } else {
          serviceChargeAmount = baseAmount * (financials.service_charge / 100);
          calculatedTotal += serviceChargeAmount;
        }
      }
    }

    console.log('Tax breakdown:', { baseAmount, vatAmount, serviceChargeAmount, calculatedTotal });

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

    // Check room availability (dates already defined above)
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

    // Create booking with tax breakdown in metadata
    const { data: newBooking, error: createError } = await supabaseClient
      .from('bookings')
      .insert([{
        tenant_id,
        guest_id,
        room_id,
        check_in: checkInDate.toISOString(),
        check_out: checkOutDate.toISOString(),
        total_amount: calculatedTotal,
        organization_id: organization_id || null,
        status: 'reserved',
        action_id,
        metadata: {
          created_via: 'edge_function',
          created_at: new Date().toISOString(),
          nights,
          base_rate: baseRate,
          tax_breakdown: {
            base_amount: baseAmount,
            vat_amount: vatAmount,
            service_charge_amount: serviceChargeAmount,
            total_amount: calculatedTotal,
            vat_rate: financials?.vat_rate || 0,
            service_charge_rate: financials?.service_charge || 0,
            vat_inclusive: financials?.vat_inclusive || false,
            service_charge_inclusive: financials?.service_charge_inclusive || false,
          }
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
        // Create payment record with calculated total
        const { data: newPayment, error: paymentError } = await supabaseClient
          .from('payments')
          .insert({
            tenant_id,
            booking_id: newBooking.id,
            guest_id,
            organization_id,
            wallet_id: wallet.id,
            amount: calculatedTotal,
            expected_amount: calculatedTotal,
            payment_type: 'full',
            method: 'organization_wallet',
            status: 'completed',
            charged_to_organization: true,
            department: department || 'front_desk',
            transaction_ref: `ORG-${newBooking.id.substring(0, 8)}`,
            recorded_by: created_by,
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
          
          // Create wallet transaction (debit) with calculated total, department and metadata
          const { error: txnError } = await supabaseClient
            .from('wallet_transactions')
            .insert({
              tenant_id,
              wallet_id: wallet.id,
              type: 'debit',
              amount: calculatedTotal,
              payment_id: newPayment.id,
              description: `Booking charge - Room ${room_id} - Guest ${guest_id}`,
              created_by: created_by || guest_id,
              department: department || 'front_desk',
              metadata: {
                booking_id: newBooking.id,
                guest_id: guest_id,
                room_id: room_id,
                organization_id: organization_id,
              }
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
