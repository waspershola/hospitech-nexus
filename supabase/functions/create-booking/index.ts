import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Tax Calculation - Duplicated from src/lib/finance/tax.ts
 * Edge functions cannot import from src, so this logic is duplicated here
 */
function toDecimal(ratePercent: number): number {
  return ratePercent / 100;
}

function roundMoney(value: number, rounding: 'round' | 'floor' | 'ceil' = 'round'): number {
  const cents = value * 100;
  if (rounding === 'round') return Math.round(cents) / 100;
  if (rounding === 'floor') return Math.floor(cents) / 100;
  return Math.ceil(cents) / 100;
}

function calculateBookingTotal(
  baseAmount: number,
  settings: any
): { baseAmount: number; serviceAmount: number; vatAmount: number; totalAmount: number } {
  const vat = toDecimal(settings.vat_rate || 0);
  const service = toDecimal(settings.service_charge || 0);
  const applyOn = settings.vat_applied_on || 'subtotal';
  const rounding = settings.rounding || 'round';

  if ((!vat || vat === 0) && (!service || service === 0)) {
    return {
      baseAmount: roundMoney(baseAmount, rounding),
      serviceAmount: 0,
      vatAmount: 0,
      totalAmount: roundMoney(baseAmount, rounding),
    };
  }

  // Both exclusive
  if (!settings.service_charge_inclusive && !settings.vat_inclusive) {
    const serviceAmount = roundMoney(baseAmount * service, rounding);
    const subtotal = roundMoney(baseAmount + serviceAmount, rounding);
    const vatBase = applyOn === 'base' ? baseAmount : subtotal;
    const vatAmount = roundMoney(vatBase * vat, rounding);
    const totalAmount = roundMoney(subtotal + vatAmount, rounding);
    return { baseAmount: roundMoney(baseAmount, rounding), serviceAmount, vatAmount, totalAmount };
  }

  // Both inclusive
  if (settings.service_charge_inclusive && settings.vat_inclusive) {
    if (applyOn === 'subtotal') {
      const denom = (1 + service) * (1 + vat);
      const base = roundMoney(baseAmount / denom, rounding);
      const serviceAmount = roundMoney(base * service, rounding);
      const vatAmount = roundMoney((base + serviceAmount) * vat, rounding);
      const totalAmount = roundMoney(base + serviceAmount + vatAmount, rounding);
      return { baseAmount: base, serviceAmount, vatAmount, totalAmount };
    } else {
      const denom = (1 + vat) + service;
      const base = roundMoney(baseAmount / denom, rounding);
      const serviceAmount = roundMoney(base * service, rounding);
      const vatAmount = roundMoney(base * vat, rounding);
      const totalAmount = roundMoney(base + serviceAmount + vatAmount, rounding);
      return { baseAmount: base, serviceAmount, vatAmount, totalAmount };
    }
  }

  // Service inclusive, VAT exclusive
  if (settings.service_charge_inclusive && !settings.vat_inclusive) {
    const base = roundMoney(baseAmount / (1 + service), rounding);
    const serviceAmount = roundMoney(base * service, rounding);
    const vatBase = applyOn === 'base' ? base : roundMoney(base + serviceAmount, rounding);
    const vatAmount = roundMoney(vatBase * vat, rounding);
    const totalAmount = roundMoney(base + serviceAmount + vatAmount, rounding);
    return { baseAmount: base, serviceAmount, vatAmount, totalAmount };
  }

  // Service exclusive, VAT inclusive
  if (!settings.service_charge_inclusive && settings.vat_inclusive) {
    const denom = (1 + vat);
    const subtotal = roundMoney(baseAmount / denom, rounding);
    const serviceAmount = roundMoney(subtotal * service, rounding);
    const baseApprox = roundMoney(subtotal - serviceAmount, rounding);
    const vatAmount = roundMoney(subtotal * vat, rounding);
    const totalAmount = roundMoney(subtotal + vatAmount, rounding);
    return { baseAmount: baseApprox, serviceAmount, vatAmount, totalAmount };
  }

  // Fallback
  const serviceAmount = roundMoney(baseAmount * service, rounding);
  const subtotal = roundMoney(baseAmount + serviceAmount, rounding);
  const vatBase = applyOn === 'base' ? baseAmount : subtotal;
  const vatAmount = roundMoney(vatBase * vat, rounding);
  const totalAmount = roundMoney(subtotal + vatAmount, rounding);
  return { baseAmount: roundMoney(baseAmount, rounding), serviceAmount, vatAmount, totalAmount };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action_id, tenant_id, guest_id, room_id, check_in, check_out, total_amount, organization_id, department, created_by, group_booking, group_id, group_name, group_size, group_leader, rate_override, addons, addons_total, deposit_amount, special_requests } = await req.json();

    console.log('Creating booking with action_id:', action_id);

    // Fetch hotel financials for tax calculations
    const { data: financials } = await supabaseClient
      .from('hotel_financials')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single();

    // Fetch room details for rate calculation
    const { data: room } = await supabaseClient
      .from('rooms')
      .select('*, category:room_categories(base_rate)')
      .eq('id', room_id)
      .single();

    // Calculate nights and base amount
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    const baseRate = room?.category?.base_rate || room?.rate || 0;
    const baseAmount = baseRate * nights;

    // Use comprehensive tax calculation
    const taxBreakdown = calculateBookingTotal(baseAmount, financials || {});

    console.log('Tax breakdown:', taxBreakdown);

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
        total_amount: taxBreakdown.totalAmount,
        organization_id: organization_id || null,
        status: 'reserved',
        action_id,
        metadata: {
          created_via: 'edge_function',
          created_at: new Date().toISOString(),
          nights,
          base_rate: baseRate,
          tax_breakdown: {
            base_amount: taxBreakdown.baseAmount,
            vat_amount: taxBreakdown.vatAmount,
            service_charge_amount: taxBreakdown.serviceAmount,
            total_amount: taxBreakdown.totalAmount,
            vat_rate: financials?.vat_rate || 0,
            service_charge_rate: financials?.service_charge || 0,
            vat_inclusive: financials?.vat_inclusive || false,
            service_charge_inclusive: financials?.service_charge_inclusive || false,
            vat_applied_on: financials?.vat_applied_on || 'subtotal',
            rounding: financials?.rounding || 'round',
          },
          ...(group_booking ? {
            group_booking: true,
            group_id,
            group_name,
            group_size,
            group_leader,
          } : {}),
          ...(rate_override ? { rate_override } : {}),
          ...(addons && addons.length > 0 ? { addons, addons_total } : {}),
          ...(deposit_amount ? { deposit_amount } : {}),
          ...(special_requests ? { special_requests } : {}),
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
            amount: taxBreakdown.totalAmount,
            expected_amount: taxBreakdown.totalAmount,
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
              amount: taxBreakdown.totalAmount,
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
