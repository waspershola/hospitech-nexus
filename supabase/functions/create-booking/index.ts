import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AVAILABLE_ADDONS = [
  { id: 'breakfast', label: 'Breakfast', price: 2500, type: 'per_night' },
  { id: 'late_checkout', label: 'Late Checkout (2 PM)', price: 5000, type: 'one_time' },
  { id: 'early_checkin', label: 'Early Check-In (10 AM)', price: 3000, type: 'one_time' },
  { id: 'airport_pickup', label: 'Airport Pickup', price: 15000, type: 'one_time' },
  { id: 'parking', label: 'Parking', price: 1500, type: 'per_night' },
  { id: 'wifi_premium', label: 'Premium WiFi', price: 1000, type: 'per_night' },
];

async function applyPlatformFee(
  supabase: any,
  tenant_id: string,
  booking_id: string,
  total_amount_from_frontend: number
): Promise<{applied: boolean; fee_amount: number; base_amount: number}> {
  try {
    console.log('[platform-fee] Extracting fee from total:', total_amount_from_frontend);
    
    const { data: feeConfig, error: configError } = await supabase
      .from('platform_fee_configurations')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('active', true)
      .single();
    
    if (configError || !feeConfig) {
      console.log('[platform-fee] No active booking fee config');
      return { applied: false, fee_amount: 0, base_amount: total_amount_from_frontend };
    }
    
    if (!feeConfig.applies_to.includes('bookings')) {
      console.log('[platform-fee] Bookings not in applies_to array');
      return { applied: false, fee_amount: 0, base_amount: total_amount_from_frontend };
    }
    
    if (feeConfig.trial_exemption_enabled) {
      const { data: tenant } = await supabase
        .from('platform_tenants')
        .select('trial_end_date, created_at')
        .eq('id', tenant_id)
        .single();
      
      if (tenant) {
        const trialEndDate = tenant.trial_end_date 
          ? new Date(tenant.trial_end_date)
          : new Date(new Date(tenant.created_at).getTime() + feeConfig.trial_days * 86400000);
        
        if (trialEndDate > new Date()) {
          console.log('[platform-fee] Tenant in trial, skipping fee');
          return { applied: false, fee_amount: 0, base_amount: total_amount_from_frontend };
        }
      }
    }
    
    let baseAmount: number;
    let feeAmount: number;
    
    if (feeConfig.payer === 'guest' && feeConfig.mode === 'inclusive') {
      if (feeConfig.fee_type === 'percentage') {
        baseAmount = total_amount_from_frontend / (1 + feeConfig.booking_fee / 100);
        feeAmount = total_amount_from_frontend - baseAmount;
      } else {
        feeAmount = feeConfig.booking_fee;
        baseAmount = total_amount_from_frontend - feeAmount;
      }
    } else if (feeConfig.payer === 'property' && feeConfig.mode === 'exclusive') {
      baseAmount = total_amount_from_frontend;
      if (feeConfig.fee_type === 'percentage') {
        feeAmount = (baseAmount * feeConfig.booking_fee) / 100;
      } else {
        feeAmount = feeConfig.booking_fee;
      }
    } else {
      return { applied: false, fee_amount: 0, base_amount: total_amount_from_frontend };
    }
    
    const { error: ledgerError } = await supabase
      .from('platform_fee_ledger')
      .insert({
        tenant_id,
        reference_type: 'booking',
        reference_id: booking_id,
        base_amount: baseAmount,
        fee_amount: feeAmount,
        rate: feeConfig.fee_type === 'percentage' ? feeConfig.booking_fee : null,
        billing_cycle: feeConfig.billing_cycle,
        payer: feeConfig.payer,
        status: feeConfig.billing_cycle === 'realtime' ? 'billed' : 'pending'
      });
    
    if (ledgerError) {
      console.error('[platform-fee] Ledger insert failed:', ledgerError);
      return { applied: false, fee_amount: 0, base_amount: total_amount_from_frontend };
    }
    
    console.log('[platform-fee] Fee recorded:', { baseAmount, feeAmount });
    return { applied: true, fee_amount: feeAmount, base_amount: baseAmount };
    
  } catch (error) {
    console.error('[platform-fee] Error:', error);
    return { applied: false, fee_amount: 0, base_amount: total_amount_from_frontend };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CREATE-BOOKING-V3] Request received');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const {
      guest_id,
      room_id,
      check_in,
      check_out,
      total_amount,
      booking_reference,
      status = 'reserved',
      source = 'front_desk',
      notes,
      metadata = {},
      tenant_id,
      organization_id,
      addons = [],
      requiresApproval = false,
      approvalStatus,
      overriddenRate,
      // Group booking fields
      group_booking,
      group_id,
      group_name,
      group_size,
      group_leader,
      is_part_of_group,
      total_rooms_in_group,
    } = body;

    if (!guest_id || !room_id || !check_in || !check_out || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const enrichedMetadata = {
      ...metadata,
      addons: addons || [],
      requiresApproval: requiresApproval || false,
      approvalStatus: approvalStatus || (requiresApproval ? 'pending' : 'approved'),
      overriddenRate: overriddenRate || null,
      // Group booking metadata
      group_booking,
      group_id,
      group_name,
      group_size,
      group_leader,
      isGroupBooking: group_booking,
      is_part_of_group,
      total_rooms_in_group,
      createdAt: new Date().toISOString(),
      version: 'CREATE-BOOKING-V3.1-UUID-CAST'
    };

    const isGroupBooking = enrichedMetadata.group_id && enrichedMetadata.isGroupBooking;
    
    if (isGroupBooking) {
      console.log('[GROUP-MASTER-V1] Group booking detected:', enrichedMetadata.group_id);
    }

    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        guest_id,
        room_id,
        check_in,
        check_out,
        total_amount,
        booking_reference,
        status,
        source,
        notes,
        metadata: enrichedMetadata,
        tenant_id,
        organization_id,
      })
      .select()
      .single();

    if (bookingError) {
      console.error('[CREATE-BOOKING-V3] Booking failed:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Failed to create booking', details: bookingError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-BOOKING-V3.1-UUID-CAST] Booking created:', newBooking.id);

    // ORG-PAYMENT-FIX-V1: Auto-create payment and wallet deduction for organization bookings
    if (organization_id && newBooking) {
      try {
        console.log('[ORG-PAYMENT-FIX-V1] Creating organization payment for booking:', newBooking.id);
        
        // Get organization wallet
        const { data: org } = await supabase
          .from('organizations')
          .select('wallet_id, name')
          .eq('id', organization_id)
          .single();
        
        if (org?.wallet_id) {
          // Get room number for description
          const { data: room } = await supabase
            .from('rooms')
            .select('number')
            .eq('id', room_id)
            .single();
          
          // Create payment record
          const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
              tenant_id,
              booking_id: newBooking.id,
              guest_id,
              organization_id,
              wallet_id: org.wallet_id,
              amount: total_amount,
              expected_amount: total_amount,
              payment_type: 'full',
              method: 'organization_wallet',
              status: 'completed',
              department: 'front_desk',
              transaction_ref: `ORG-${Date.now()}-${newBooking.id.substring(0, 8)}`,
              metadata: {
                booking_id: newBooking.id,
                organization_name: org.name,
                auto_created: true,
                version: 'ORG-PAYMENT-FIX-V1'
              }
            })
            .select()
            .single();
          
          if (paymentError) {
            console.error('[ORG-PAYMENT-FIX-V1] Payment creation failed:', paymentError);
          } else {
            console.log('[ORG-PAYMENT-FIX-V1] Payment created:', payment.id);
            
            // Create wallet transaction to debit organization
            const { error: walletError } = await supabase
              .from('wallet_transactions')
              .insert({
                tenant_id,
                wallet_id: org.wallet_id,
                payment_id: payment.id,
                amount: total_amount,
                type: 'debit',
                description: `Booking charge - Room ${room?.number || 'N/A'} - ${newBooking.booking_reference}`,
                department: 'front_desk',
                metadata: {
                  booking_id: newBooking.id,
                  organization_name: org.name,
                  room_number: room?.number,
                  version: 'ORG-PAYMENT-FIX-V1'
                }
              });
            
            if (walletError) {
              console.error('[ORG-PAYMENT-FIX-V1] Wallet transaction failed:', walletError);
            } else {
              console.log('[ORG-PAYMENT-FIX-V1] Organization wallet debited successfully:', total_amount);
            }
          }
        } else {
          console.warn('[ORG-PAYMENT-FIX-V1] Organization has no wallet:', organization_id);
        }
      } catch (orgPaymentError) {
        console.error('[ORG-PAYMENT-FIX-V1] Organization payment error (non-blocking):', orgPaymentError);
      }
    }

    let platformFeeResult = { applied: false, fee_amount: 0, base_amount: total_amount };
    try {
      platformFeeResult = await applyPlatformFee(supabase, tenant_id, newBooking.id, total_amount);
    } catch (feeError) {
      console.error('[CREATE-BOOKING-V3.1-UUID-CAST] Platform fee failed (non-blocking):', feeError);
    }

    // NOTIFICATION-FIX-V1: Send booking confirmation if enabled
    try {
      const { data: smsSettings } = await supabase
        .from('tenant_sms_settings')
        .select('enabled, auto_send_booking_confirmation')
        .eq('tenant_id', tenant_id)
        .maybeSingle();

      if (smsSettings?.enabled && smsSettings?.auto_send_booking_confirmation) {
        // Fetch guest and room details for notification
        const { data: guestData } = await supabase
          .from('guests')
          .select('name, phone, email')
          .eq('id', guest_id)
          .single();

        const { data: roomData } = await supabase
          .from('rooms')
          .select('category:room_categories!room_category_id(name)')
          .eq('id', room_id)
          .single();

        const { data: tenantData } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', tenant_id)
          .single();

        const hotelName = tenantData?.name || 'Hotel';
        const category = Array.isArray(roomData?.category) ? roomData?.category[0] : roomData?.category;
        const roomCategory = category?.name || 'room';

        // Send SMS if phone available
        if (guestData?.phone) {
          const checkInDate = new Date(check_in).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });

          const message = `Hi ${guestData.name}, your booking at ${hotelName} is confirmed! ${roomCategory}, Check-in: ${checkInDate}. Ref: ${booking_reference}`;

          await supabase.functions.invoke('send-sms', {
            body: {
              tenant_id,
              to: guestData.phone,
              message,
              event_key: 'booking_confirmed',
              booking_id: newBooking.id,
              guest_id: guest_id,
            },
          });

          console.log('[NOTIFICATION-FIX-V1] Booking confirmation SMS sent');
        }

        // NOTIFICATION-EMAIL-V1: Send booking confirmation email if enabled
        if (guestData?.email) {
          const { data: emailProvider } = await supabase
            .from('platform_email_providers')
            .select('enabled')
            .eq('enabled', true)
            .or(`tenant_id.eq.${tenant_id},tenant_id.is.null`)
            .limit(1)
            .maybeSingle();

          if (emailProvider) {
            // Fetch hotel contact details for email template
            const { data: hotelMeta } = await supabase
              .from('hotel_meta')
              .select('contact_phone, contact_email')
              .eq('tenant_id', tenant_id)
              .maybeSingle();

            const checkInFormatted = new Date(check_in).toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
            });
            const checkOutFormatted = new Date(check_out).toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
            });

            // EMAIL-VARS-V1: Pass enhanced variables for rich template
            const nights = Math.ceil((new Date(check_out).getTime() - new Date(check_in).getTime()) / (1000 * 60 * 60 * 24));
            const ratePerNight = nights > 0 ? Math.round(total_amount / nights) : total_amount;

            await supabase.functions.invoke('send-email-notification', {
              body: {
                tenant_id,
                to: guestData.email,
                event_key: 'booking_confirmed',
                variables: {
                  guest_name: guestData.name,
                  room_type: roomCategory,
                  check_in_date: checkInFormatted,
                  check_out_date: checkOutFormatted,
                  booking_reference: booking_reference,
                  total_amount: total_amount.toLocaleString(),
                  nights: nights.toString(),
                  rate_per_night: ratePerNight.toLocaleString(),
                  hotel_name: hotelName,
                  frontdesk_phone: hotelMeta?.contact_phone || 'Contact Front Desk',
                  contact_email: hotelMeta?.contact_email || 'info@hotel.com',
                },
                booking_id: newBooking.id,
                guest_id: guest_id
              }
            });
            console.log('[NOTIFICATION-EMAIL-V1] Booking confirmation email sent');
          }
        }
      }
    } catch (notificationError) {
      console.error('[NOTIFICATION-FIX-V1] Notification failed (non-blocking):', notificationError);
    }

    let masterFolioResult = null;
    let groupId = null;
    
    if (isGroupBooking) {
      try {
        // GROUP-BILLING-FIX-V1-PHASE-1: Create master folio WITHOUT charge posting
        // Charges will be posted ONCE per room at check-in time
        const group_id_text = String(enrichedMetadata.group_id);
        groupId = group_id_text;
        
        console.log('[GROUP-BILLING-FIX-V1] Creating master folio (no charges):', {
          group_id: group_id_text,
          tenant_id,
          guest_id
        });
        
        const { data: masterFolio, error: masterFolioError } = await supabase
          .rpc('create_group_master_folio', {
            p_tenant_id: tenant_id,
            p_group_id: group_id_text,
            p_guest_id: guest_id,
            p_group_name: enrichedMetadata.group_name || 'Group Booking'
          });

        if (masterFolioError) {
          console.error('[GROUP-BILLING-FIX-V1] Master folio creation FAILED:', {
            message: masterFolioError.message,
            code: masterFolioError.code,
            details: masterFolioError.details,
            hint: masterFolioError.hint
          });
          throw new Error(`Master folio creation failed: ${masterFolioError.message}`);
        }

        console.log('[GROUP-BILLING-FIX-V1] Master folio created (charges=0):', {
          success: masterFolio?.success,
          folio_id: masterFolio?.folio_id,
          folio_number: masterFolio?.folio_number,
          existing: masterFolio?.existing
        });
        
        masterFolioResult = masterFolio;
        
      } catch (groupError: any) {
        console.error('[GROUP-BILLING-FIX-V1] Group booking error:', {
          message: groupError?.message,
          stack: groupError?.stack
        });
        throw groupError;
      }
    }

    // GROUP-BILLING-FIX-V1: Return booking with master folio info and group_id
    const response = {
      success: true,
      booking: newBooking,
      platform_fee: platformFeeResult,
      master_folio: masterFolioResult,
      group_id: groupId,
      message: 'Booking created successfully',
      version: 'GROUP-BILLING-FIX-V1-PHASE-1'
    };

    return new Response(
      JSON.stringify(response),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[CREATE-BOOKING-V5] FATAL ERROR:', error);
    console.error('[CREATE-BOOKING-V5] Stack:', error?.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error?.message || String(error),
        stack: error?.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
