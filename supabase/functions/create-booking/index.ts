import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Add-on definitions - must match src/lib/finance/groupBookingCalculator.ts
 */
const AVAILABLE_ADDONS = [
  { id: 'breakfast', label: 'Breakfast', price: 2500, type: 'per_night' },
  { id: 'late_checkout', label: 'Late Checkout (2 PM)', price: 5000, type: 'one_time' },
  { id: 'early_checkin', label: 'Early Check-In (10 AM)', price: 3000, type: 'one_time' },
  { id: 'airport_pickup', label: 'Airport Pickup', price: 15000, type: 'one_time' },
  { id: 'parking', label: 'Parking', price: 1500, type: 'per_night' },
  { id: 'wifi_premium', label: 'Premium WiFi', price: 1000, type: 'per_night' },
];

/**
 * Phase C: Platform Fee Extraction for Ledger Recording
 * The frontend has already calculated and included the fee in total_amount.
 * This function extracts the fee from the total for accurate ledger recording.
 */
async function applyPlatformFee(
  supabase: any,
  tenant_id: string,
  booking_id: string,
  total_amount_from_frontend: number
): Promise<{applied: boolean; fee_amount: number; base_amount: number}> {
  try {
    console.log('[platform-fee] Extracting fee from total:', total_amount_from_frontend);
    
    // Get fee configuration
    const { data: feeConfig, error: configError } = await supabase
      .from('platform_fee_configurations')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('active', true)
      .single();
    
    if (configError || !feeConfig) {
      console.log('[platform-fee] No active booking fee config for tenant:', tenant_id);
      return { applied: false, fee_amount: 0, base_amount: total_amount_from_frontend };
    }
    
    if (!feeConfig.applies_to.includes('bookings')) {
      console.log('[platform-fee] Bookings not in applies_to array');
      return { applied: false, fee_amount: 0, base_amount: total_amount_from_frontend };
    }
    
    // Check trial exemption
    if (feeConfig.trial_exemption_enabled) {
      const { data: tenant, error: tenantError } = await supabase
        .from('platform_tenants')
        .select('trial_end_date, created_at')
        .eq('id', tenant_id)
        .single();
      
      if (!tenantError && tenant) {
        const trialEndDate = tenant.trial_end_date 
          ? new Date(tenant.trial_end_date)
          : new Date(new Date(tenant.created_at).getTime() + feeConfig.trial_days * 86400000);
        
        if (trialEndDate > new Date()) {
          console.log('[platform-fee] Tenant in trial period, skipping fee. Trial ends:', trialEndDate);
          return { applied: false, fee_amount: 0, base_amount: total_amount_from_frontend };
        }
      }
    }
    
    // Calculate fee based on payer mode
    let baseAmount: number;
    let feeAmount: number;
    
    if (feeConfig.payer === 'guest' && feeConfig.mode === 'inclusive') {
      // Guest pays, fee was added to total by frontend - extract it
      console.log('[platform-fee] Guest-pays inclusive mode - extracting fee from total');
      if (feeConfig.fee_type === 'percentage') {
        // total = base * (1 + rate/100)
        // base = total / (1 + rate/100)
        baseAmount = total_amount_from_frontend / (1 + feeConfig.booking_fee / 100);
        feeAmount = total_amount_from_frontend - baseAmount;
      } else {
        // Flat fee
        feeAmount = feeConfig.booking_fee;
        baseAmount = total_amount_from_frontend - feeAmount;
      }
    } else if (feeConfig.payer === 'property' && feeConfig.mode === 'exclusive') {
      // Property pays, fee deducted from their revenue
      // Guest pays original amount (no fee added by frontend)
      console.log('[platform-fee] Property-pays exclusive mode - calculating fee from base');
      baseAmount = total_amount_from_frontend;
      if (feeConfig.fee_type === 'percentage') {
        feeAmount = total_amount_from_frontend * (feeConfig.booking_fee / 100);
      } else {
        feeAmount = feeConfig.booking_fee;
      }
    } else {
      // No valid payer configuration
      console.log('[platform-fee] Invalid payer/mode configuration');
      return { applied: false, fee_amount: 0, base_amount: total_amount_from_frontend };
    }
    
    // Record in ledger with extracted amounts
    const ledgerStatus = feeConfig.billing_cycle === 'realtime' ? 'billed' : 'pending';
    
    const { error: ledgerError } = await supabase
      .from('platform_fee_ledger')
      .insert({
        tenant_id,
        reference_type: 'booking',
        reference_id: booking_id,
        base_amount: baseAmount,
        fee_amount: feeAmount,
        rate: feeConfig.booking_fee,
        fee_type: feeConfig.fee_type,
        billing_cycle: feeConfig.billing_cycle,
        payer: feeConfig.payer,
        status: ledgerStatus,
        billed_at: feeConfig.billing_cycle === 'realtime' ? new Date().toISOString() : null,
        metadata: {
          total_from_frontend: total_amount_from_frontend,
          extracted_base: baseAmount,
          extracted_fee: feeAmount,
          fee_config_id: feeConfig.id,
          mode: feeConfig.mode
        }
      });
    
    if (ledgerError) {
      console.error('[platform-fee] Error recording in ledger:', ledgerError);
      throw ledgerError;
    }
    
    console.log('[platform-fee] Extracted and recorded fee:', {
      tenant_id,
      booking_id,
      total_from_frontend: total_amount_from_frontend,
      base_amount: baseAmount,
      fee_amount: feeAmount,
      payer: feeConfig.payer,
      mode: feeConfig.mode,
      billing_cycle: feeConfig.billing_cycle
    });
    
    return { applied: true, fee_amount: feeAmount, base_amount: baseAmount };
    
  } catch (error) {
    console.error('[platform-fee] Error extracting fee:', error);
    // Don't block booking creation if fee extraction fails
    return { applied: false, fee_amount: 0, base_amount: total_amount_from_frontend };
  }
}

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

    const { action_id, tenant_id, guest_id, room_id, check_in, check_out, total_amount, status, organization_id, department, created_by, group_booking, group_id, group_name, group_size, group_leader, rate_override, addons, special_requests, is_part_of_group, approval_status, total_rooms_in_group } = await req.json();

    console.log('Creating booking with action_id:', action_id);

    // Fetch hotel financials for tax calculations
    const { data: financials } = await supabaseClient
      .from('hotel_financials')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single();

    // Fetch configured checkout time from hotel_configurations
    const { data: checkoutConfig } = await supabaseClient
      .from('hotel_configurations')
      .select('value')
      .eq('tenant_id', tenant_id)
      .eq('key', 'check_out_time')
      .single();

    const configuredCheckoutTime = checkoutConfig?.value 
      ? String(checkoutConfig.value).replace(/"/g, '') 
      : '12:00';

    // Fetch room details for rate calculation
    const { data: room } = await supabaseClient
      .from('rooms')
      .select('*, category:room_categories(base_rate)')
      .eq('id', room_id)
      .single();

    // Validate check-in date is not in the past
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Set check-in to 00:00:00 of check-in date
    checkInDate.setHours(0, 0, 0, 0);
    
    // Set check-out to configured checkout time of check-out date
    const [checkoutHour, checkoutMinute] = configuredCheckoutTime.split(':');
    checkOutDate.setHours(parseInt(checkoutHour), parseInt(checkoutMinute), 0, 0);

    if (checkInDate < today) {
      console.error('Cannot create booking with past check-in date:', checkInDate);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'INVALID_CHECKIN_DATE',
          message: 'Cannot create bookings with check-in dates in the past'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Calculate nights and base amount
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    const effectiveRate = rate_override || room?.category?.base_rate || room?.rate || 0;
    const baseAmount = effectiveRate * nights;

    // Calculate add-ons total (matching frontend logic)
    // For group bookings, distribute add-on costs evenly across all rooms
    const roomsInGroup = is_part_of_group && total_rooms_in_group ? total_rooms_in_group : 1;
    let addonsTotal = 0;
    
    if (addons && addons.length > 0) {
      addons.forEach((addonId: string) => {
        const addon = AVAILABLE_ADDONS.find(a => a.id === addonId);
        if (addon) {
          if (addon.type === 'per_night') {
            // Total cost for all rooms, then divide by number of rooms
            const totalForAllRooms = addon.price * nights * roomsInGroup;
            addonsTotal += totalForAllRooms / roomsInGroup;
          } else {
            // One-time cost shared across all rooms
            const totalForAllRooms = addon.price * roomsInGroup;
            addonsTotal += totalForAllRooms / roomsInGroup;
          }
        }
      });
    }

    // Subtotal before tax
    const subtotal = baseAmount + addonsTotal;

    // Use comprehensive tax calculation on subtotal
    const taxBreakdown = calculateBookingTotal(subtotal, financials || {});
    
    // Final total (no deposit in this version)
    const finalTotalAmount = taxBreakdown.totalAmount;

    console.log('Booking calculation:', {
      baseAmount,
      addonsTotal,
      subtotal,
      taxBreakdown,
      finalTotalAmount,
      nights,
      effectiveRate,
      roomsInGroup,
      is_part_of_group,
      receivedTotalAmount: total_amount,
      calculatedMatch: Math.abs(finalTotalAmount - (total_amount || 0)) < 1,
    });

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

    // Phase 5: Strict overlap validation to prevent double bookings
    // Check room availability with comprehensive date range check
    const { data: overlappingBookings, error: availabilityError } = await supabaseClient
      .from('bookings')
      .select('id, guest_id, check_in, check_out, status, booking_reference')
      .eq('tenant_id', tenant_id)
      .eq('room_id', room_id)
      .in('status', ['reserved', 'checked_in', 'confirmed'])
      .or(`and(check_in.lt.${checkOutDate.toISOString()},check_out.gt.${checkInDate.toISOString()})`);
    
    console.log('Overlap check:', {
      checkIn: checkInDate.toISOString(),
      checkOut: checkOutDate.toISOString(),
      overlapping: overlappingBookings,
    });

    if (availabilityError) {
      console.error('Error checking availability:', availabilityError);
      throw availabilityError;
    }

    if (overlappingBookings && overlappingBookings.length > 0) {
      console.error('Room not available - overlapping bookings detected:', overlappingBookings);
      
      const conflictDetails = overlappingBookings.map(b => 
        `${b.booking_reference || b.id.substring(0, 8)} (${b.check_in.split('T')[0]} to ${b.check_out.split('T')[0]})`
      ).join(', ');
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'ROOM_NOT_AVAILABLE',
          message: `Room ${room?.number || room_id} is already booked for the selected dates. Conflicting bookings: ${conflictDetails}`,
          conflicting_bookings: overlappingBookings,
          requested_dates: {
            check_in: checkInDate.toISOString().split('T')[0],
            check_out: checkOutDate.toISOString().split('T')[0]
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    // Phase C: Use total_amount from frontend (already includes platform fee)
    // The frontend has calculated the fee and included it in total_amount
    // We'll use this value directly for the booking, and extract the fee for ledger later
    const bookingTotalWithFee = total_amount || finalTotalAmount;
    
    console.log('[platform-fee] Using total from frontend:', {
      received_total: total_amount,
      calculated_total: finalTotalAmount,
      using: bookingTotalWithFee
    });

    // Create booking with tax breakdown in metadata
    const { data: newBooking, error: createError } = await supabaseClient
      .from('bookings')
      .insert([{
        tenant_id,
        guest_id,
        room_id,
        check_in: checkInDate.toISOString(),
        check_out: checkOutDate.toISOString(),
        total_amount: bookingTotalWithFee,
        organization_id: organization_id || null,
        status: status || 'reserved',
        action_id,
      metadata: {
        created_via: 'edge_function',
        created_at: new Date().toISOString(),
        nights,
        base_rate: effectiveRate,
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
        ...(addons && addons.length > 0 ? { addons, addons_total: addonsTotal } : {}),
        ...(special_requests ? { special_requests } : {}),
        ...(approval_status ? { approval_status } : {}),
      }
      }])
      .select()
      .single();

    if (createError) {
      console.error('Error creating booking:', createError);
      throw createError;
    }

    // Phase C: Extract platform fee from the booking total for ledger recording
    // This happens AFTER booking creation so we have the real booking_id
    try {
      const platformFeeResult = await applyPlatformFee(
        supabaseClient, 
        tenant_id, 
        newBooking.id, 
        bookingTotalWithFee
      );
      console.log('[platform-fee] Fee extraction result:', platformFeeResult);
    } catch (feeError) {
      console.error('[platform-fee] Error extracting fee (non-blocking):', feeError);
    }

    // Update room status based on booking status
    const roomStatus = (status === 'checked_in') ? 'occupied' : 'reserved';
    await supabaseClient
      .from('rooms')
      .update({ status: roomStatus })
      .eq('id', room_id);

    console.log('Booking created successfully:', newBooking.id);

    // If organization booking, create payment and debit wallet
    let payment = null;
    if (organization_id && bookingTotalWithFee > 0) {
      console.log('Creating organization payment for booking:', newBooking.id);
      
      // Get organization wallet - NOW REQUIRED
      const { data: wallet, error: walletError } = await supabaseClient
        .from('wallets')
        .select('id, balance, owner_id')
        .eq('owner_id', organization_id)
        .eq('wallet_type', 'organization')
        .single();

      // CRITICAL CHANGE: Fail booking if wallet doesn't exist
      if (walletError || !wallet) {
        console.error('Organization wallet not found:', walletError);
        
        // Delete the booking we just created
        await supabaseClient
          .from('bookings')
          .delete()
          .eq('id', newBooking.id);
        
        // Return error response
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'WALLET_NOT_FOUND',
            message: 'Organization does not have a wallet configured. Please contact administrator.',
            organization_id: organization_id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      // Validate organization has sufficient credit/balance
      const { data: org } = await supabaseClient
        .from('organizations')
        .select('credit_limit, allow_negative_balance')
        .eq('id', organization_id)
        .single();
      
      const availableCredit = Number(org?.credit_limit || 0);
      const currentBalance = Number(wallet.balance);
      const effectiveLimit = org?.allow_negative_balance 
        ? availableCredit - currentBalance  // Can go negative
        : Math.max(0, availableCredit - Math.abs(currentBalance)); // Cannot go negative
      
      if (bookingTotalWithFee > effectiveLimit) {
        // Delete the booking
        await supabaseClient
          .from('bookings')
          .delete()
          .eq('id', newBooking.id);
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'INSUFFICIENT_CREDIT',
            message: `Organization has insufficient credit. Available: ₦${effectiveLimit.toLocaleString()}, Required: ₦${bookingTotalWithFee.toLocaleString()}`,
            available_credit: effectiveLimit,
            required_amount: bookingTotalWithFee
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      // Create payment record with calculated total
      const { data: newPayment, error: paymentError } = await supabaseClient
        .from('payments')
        .insert({
          tenant_id,
          booking_id: newBooking.id,
          guest_id,
          organization_id,
          wallet_id: wallet.id,
          amount: bookingTotalWithFee,
          expected_amount: bookingTotalWithFee,
          payment_type: 'full',
          method: 'organization_wallet',
          status: 'completed',
          charged_to_organization: true,
          department: department || 'front_desk',
          transaction_ref: `ORG-${Date.now()}-${newBooking.id.substring(0, 8)}`,
          recorded_by: created_by,
          metadata: {
            booking_id: newBooking.id,
            auto_created: true,
            tax_breakdown: {
              base_amount: taxBreakdown.baseAmount,
              vat_amount: taxBreakdown.vatAmount,
              service_charge_amount: taxBreakdown.serviceAmount,
              total_amount: taxBreakdown.totalAmount,
            },
            created_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Error creating organization payment:', paymentError);
        
        // Delete the booking
        await supabaseClient
          .from('bookings')
          .delete()
          .eq('id', newBooking.id);
        
        throw new Error(`Failed to create payment: ${paymentError.message}`);
      }
      
      payment = newPayment;
      
      // Create wallet transaction (debit)
      const { error: txnError } = await supabaseClient
        .from('wallet_transactions')
        .insert({
          tenant_id,
          wallet_id: wallet.id,
          type: 'debit',
          amount: bookingTotalWithFee,
          payment_id: newPayment.id,
          description: `Booking charge - Room ${room?.number || room_id}`,
          created_by: created_by || guest_id,
          department: department || 'front_desk',
          metadata: {
            booking_id: newBooking.id,
            guest_id: guest_id,
            room_id: room_id,
            organization_id: organization_id,
            tax_breakdown: {
              base_amount: taxBreakdown.baseAmount,
              vat_amount: taxBreakdown.vatAmount,
              service_charge_amount: taxBreakdown.serviceAmount,
            }
          }
        });

      if (txnError) {
        console.error('Error creating wallet transaction:', txnError);
        
        // Delete payment and booking
        await supabaseClient.from('payments').delete().eq('id', newPayment.id);
        await supabaseClient.from('bookings').delete().eq('id', newBooking.id);
        
        throw new Error(`Failed to create wallet transaction: ${txnError.message}`);
      }
      
      console.log('Organization wallet debited successfully:', {
        wallet_id: wallet.id,
        amount: bookingTotalWithFee,
        payment_id: newPayment.id
      });
    }

    // Send booking confirmation notifications
    try {
      const { data: smsSettings } = await supabaseClient
        .from('tenant_sms_settings')
        .select('auto_send_booking_confirmation, enabled')
        .eq('tenant_id', tenant_id)
        .maybeSingle();

      if (smsSettings?.enabled && smsSettings.auto_send_booking_confirmation) {
        const { data: guest } = await supabaseClient
          .from('guests')
          .select('name, phone, email')
          .eq('id', guest_id)
          .maybeSingle();

        const { data: hotelMeta } = await supabaseClient
          .from('hotel_meta')
          .select('hotel_name, contact_phone')
          .eq('tenant_id', tenant_id)
          .maybeSingle();

        if (guest && hotelMeta?.hotel_name) {
          const checkInDate = new Date(check_in).toLocaleDateString();
          const hotelPhone = hotelMeta.contact_phone || 'our frontdesk';
          
          // Send SMS if phone available
          if (guest.phone) {
            const message = `Hi ${guest.name}, your booking at ${hotelMeta.hotel_name} is confirmed! Room: ${room?.number || 'TBD'}, Check-in: ${checkInDate}. Ref: ${newBooking.booking_reference || newBooking.id.substring(0, 8)}. Questions? Call ${hotelPhone}`;

            supabaseClient.functions.invoke('send-sms', {
              headers: {
                Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: {
                tenant_id,
                to: guest.phone,
                message,
                event_key: 'booking_confirmed',
                booking_id: newBooking.id,
                guest_id,
              },
            }).then((result) => {
              if (result.error) {
                console.error('SMS send failed:', result.error);
              } else {
                console.log('SMS booking confirmation sent:', result.data);
              }
            }).catch((error) => {
              console.error('SMS send exception:', error);
            });
          }

          // Send email if email available
          if (guest.email) {
            console.log('Sending booking confirmation email...');
            
            supabaseClient.functions.invoke('send-email-notification', {
              body: {
                tenant_id,
                to: guest.email,
                event_key: 'booking_confirmed',
                variables: {
                  guest_name: guest.name,
                  booking_reference: newBooking.booking_reference || newBooking.id.substring(0, 8),
                  room_number: room?.number || 'TBD',
                  check_in_date: checkInDate,
                  check_out_date: new Date(check_out).toLocaleDateString(),
                },
                booking_id: newBooking.id,
                guest_id,
              },
            }).catch((error) => {
              console.error('Email send exception:', error);
            });
          }
        }
      }
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
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
