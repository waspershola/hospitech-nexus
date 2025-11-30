import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { booking_id } = await req.json()

    if (!booking_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'booking_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseServiceClient
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      console.error('[checkin] Booking not found:', bookingError)
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if folio already exists
    const { data: existingFolio } = await supabaseServiceClient
      .from('stay_folios')
      .select('id')
      .eq('booking_id', booking_id)
      .eq('status', 'open')
      .maybeSingle()

    if (existingFolio) {
      console.log('[checkin] Folio already exists:', existingFolio.id)
      
      // Ensure booking status is updated even if folio exists (idempotency fix)
      if (booking.status !== 'checked_in') {
        console.log('[checkin] Updating booking status for existing folio')
        const { error: bookingUpdateError } = await supabaseServiceClient
          .from('bookings')
          .update({
            status: 'checked_in',
            metadata: {
              ...(booking.metadata || {}),
              actual_checkin: new Date().toISOString(),
              folio_id: existingFolio.id
            }
          })
          .eq('id', booking_id)
        
        if (bookingUpdateError) {
          console.error('[checkin] Failed to update booking status:', bookingUpdateError)
        } else {
          console.log('[checkin] Booking status updated to checked_in')
        }
      }
      
      return new Response(
        JSON.stringify({ success: true, folio: existingFolio, already_exists: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create new folio with multi-folio support
    console.log('[checkin] CHECKIN-V4-MULTI-FOLIO: Generating folio number');
    const { data: folioNumber, error: numberError } = await supabaseServiceClient.rpc(
      'generate_folio_number',
      {
        p_tenant_id: booking.tenant_id,
        p_booking_id: booking.id,
        p_folio_type: 'room'
      }
    );

    if (numberError) {
      console.error('[checkin] CHECKIN-V4: Failed to generate folio number:', numberError);
    }

    console.log('[checkin] CHECKIN-V4-MULTI-FOLIO: Folio number generated:', folioNumber);

    // PHASE-1-FIX: Start folio with 0 charges - folio_post_charge will update correctly
    const { data: folio, error: folioError } = await supabaseServiceClient
      .from('stay_folios')
      .insert({
        tenant_id: booking.tenant_id,
        booking_id: booking.id,
        room_id: booking.room_id,
        guest_id: booking.guest_id,
        folio_type: 'room',
        folio_number: folioNumber,
        is_primary: true,
        total_charges: 0,  // Start at 0, folio_post_charge will update
        balance: 0,        // Start at 0, folio_post_charge will update
        metadata: {
          created_on_checkin: true,
          booking_reference: booking.booking_reference,
          version: 'PHASE-1-DOUBLE-CHARGE-FIX'
        }
      })
      .select()
      .single()

    if (folioError) {
      console.error('[checkin] Failed to create folio:', folioError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create folio', details: folioError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[checkin] Folio created successfully:', folio.id)

    // LEDGER-REPAIR-V3: Post room charge to accounting ledger with correct parameters
    try {
      const { error: ledgerError } = await supabaseServiceClient.rpc('insert_ledger_entry', {
        p_tenant_id: booking.tenant_id,
        p_transaction_type: 'debit',
        p_amount: booking.total_amount || 0,
        p_description: `Room charge - ${booking.booking_reference}`,
        p_category: 'room_charge',
        p_department: 'ROOMS',
        p_source_type: 'checkin-guest',
        p_folio_id: folio.id,
        p_booking_id: booking.id,
        p_guest_id: booking.guest_id,
        p_room_id: booking.room_id,
        p_payment_method: null,
        p_payment_method_id: null,
        p_payment_provider_id: null,
        p_payment_location_id: null,
        p_organization_id: booking.organization_id,
        p_shift: null,
        p_staff_id: null,
        p_metadata: {
          folio_number: folio.folio_number,
          booking_reference: booking.booking_reference,
          source: 'checkin-guest',
          version: 'LEDGER-REPAIR-V3'
        }
      });

      if (ledgerError) {
        console.error('[ledger-integration] LEDGER-REPAIR-V3: Failed to post room charge to ledger (non-blocking):', ledgerError);
      } else {
        console.log('[ledger-integration] LEDGER-REPAIR-V3: Room charge posted to ledger successfully');
      }
    } catch (ledgerErr) {
      console.error('[ledger-integration] LEDGER-REPAIR-V3: Ledger posting exception (non-blocking):', ledgerErr);
    }

    // PHASE-1-FIX: Check for existing charges before posting to prevent duplicates
    const { data: existingCharge } = await supabaseServiceClient
      .from('folio_transactions')
      .select('id, amount')
      .eq('folio_id', folio.id)
      .eq('reference_type', 'booking')
      .eq('reference_id', booking.id)
      .eq('transaction_type', 'charge')
      .maybeSingle();
    
    const groupId = booking.metadata?.group_id;
    
    if (existingCharge) {
      console.log('[PHASE-1-FIX] Room charge already exists for this folio:', existingCharge.id, '- skipping duplicate');
    } else {
      // Post room charges via folio_post_charge RPC
      console.log('[PHASE-1-FIX] Posting room charges:', booking.total_amount);
      try {
        const { data: chargeResult, error: chargeError } = await supabaseServiceClient
          .rpc('folio_post_charge', {
            p_folio_id: folio.id,
            p_amount: booking.total_amount || 0,
            p_description: `Room charge - ${booking.booking_reference}`,
            p_reference_type: 'booking',
            p_reference_id: booking.id,
            p_department: 'rooms'
          });
        
        if (chargeError) {
          console.error('[PHASE-1-FIX] Charge posting failed:', chargeError);
          // CRITICAL: Rollback folio creation if charge posting fails
          await supabaseServiceClient
            .from('stay_folios')
            .delete()
            .eq('id', folio.id);
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Failed to post room charges', 
              details: chargeError.message 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.log('[PHASE-1-FIX] ✅ Room charge posted successfully:', chargeResult);
        }
      } catch (chargeErr) {
        console.error('[PHASE-1-FIX] Charge posting exception:', chargeErr);
        // CRITICAL: Rollback folio creation
        await supabaseServiceClient
          .from('stay_folios')
          .delete()
          .eq('id', folio.id);
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to post room charges', 
            details: chargeErr instanceof Error ? chargeErr.message : 'Unknown error'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    if (groupId) {
      console.log('[GROUP-BILLING-FIX-V1-PHASE-3] Booking is part of group:', groupId, '- linking to master folio');
      
      try {
        // Get group master folio
        const { data: groupData, error: groupError } = await supabaseServiceClient
          .rpc('get_group_master_folio', {
            p_tenant_id: booking.tenant_id,
            p_group_id: groupId
          });
        
        if (groupError) {
          console.error('[GROUP-BILLING-FIX-V1-PHASE-3] Error fetching group master folio (non-blocking):', groupError);
        } else if (groupData?.master_folio?.id) {
          const masterFolioId = groupData.master_folio.id;
          console.log('[GROUP-BILLING-FIX-V1-PHASE-3] Found master folio:', masterFolioId, '- linking room folio');
          
          // Update room folio to link to master
          const { error: linkError } = await supabaseServiceClient
            .from('stay_folios')
            .update({ parent_folio_id: masterFolioId })
            .eq('id', folio.id);
          
          if (linkError) {
            console.error('[GROUP-BILLING-FIX-V1-PHASE-3] Failed to link folio to master (non-blocking):', linkError);
          } else {
            console.log('[GROUP-BILLING-FIX-V1-PHASE-3] ✅ Room folio linked to master folio');
            
            // PHASE-3: Sync master folio totals from all children (BLOCKING)
            console.log('[PHASE-3-BLOCKING-SYNC] Syncing master folio totals and group_size');
            const { data: syncResult, error: syncError } = await supabaseServiceClient
              .rpc('sync_master_folio_totals', {
                p_master_folio_id: masterFolioId
              });
            
            if (syncError) {
              console.error('[PHASE-3-BLOCKING-SYNC] ❌ Master folio sync FAILED:', syncError);
              // CRITICAL: This is now a blocking error - folio sync is essential
              throw new Error(`Master folio sync failed: ${syncError.message}`);
            }
            
            if (!syncResult?.success) {
              console.error('[PHASE-3-BLOCKING-SYNC] ❌ Sync returned failure:', syncResult);
              throw new Error(`Master folio sync failed: ${syncResult?.error || 'Unknown error'}`);
            }
            
            console.log('[PHASE-3-BLOCKING-SYNC] ✅ Master folio synced:', {
              total_charges: syncResult.total_charges,
              total_payments: syncResult.total_payments,
              balance: syncResult.balance,
              child_count: syncResult.child_count,
              group_size_updated: syncResult.group_size_updated
            });
          }
        } else {
          console.warn('[GROUP-BILLING-FIX-V1-PHASE-3] Master folio not found for group:', groupId);
        }
      } catch (groupLinkError) {
        console.error('[GROUP-BILLING-FIX-V1-PHASE-3] Group folio linking exception (non-blocking):', groupLinkError);
      }
    }

    // CHECKIN-V3-PAYMENT-ATTACH: Auto-attach reservation payments to new folio
    console.log('[checkin-v3] Attaching reservation payments to folio:', folio.id)
    try {
      const { data: attachResult, error: attachError } = await supabaseServiceClient
        .rpc('attach_booking_payments_to_folio', {
          p_tenant_id: booking.tenant_id,
          p_booking_id: booking.id,
          p_folio_id: folio.id
        })
      
      if (attachError) {
        console.error('[checkin-v3] Payment attachment failed (non-blocking):', attachError)
      } else {
        console.log('[checkin-v3] Payment attachment result:', attachResult)
      }
    } catch (attachErr) {
      console.error('[checkin-v3] Payment attachment exception (non-blocking):', attachErr)
    }

    // Update booking status to checked_in with actual check-in timestamp
    const { error: bookingUpdateError } = await supabaseServiceClient
      .from('bookings')
      .update({ 
        status: 'checked_in',
        metadata: {
          ...(booking.metadata || {}),
          actual_checkin: new Date().toISOString(),
          folio_id: folio.id
        }
      })
      .eq('id', booking_id)

    if (bookingUpdateError) {
      console.error('[checkin] Failed to update booking status:', bookingUpdateError)
      
      // Rollback: delete folio to maintain consistency
      await supabaseServiceClient
        .from('stay_folios')
        .delete()
        .eq('id', folio.id)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to update booking status', 
          details: bookingUpdateError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[checkin] Booking status updated to checked_in')

    // CHECKIN-NOTIFICATION-V2: Send check-in notifications if enabled
    try {
      const { data: smsSettings } = await supabaseServiceClient
        .from('tenant_sms_settings')
        .select('enabled, auto_send_checkin_reminder')
        .eq('tenant_id', booking.tenant_id)
        .maybeSingle();

      const { data: guest } = await supabaseServiceClient
        .from('guests')
        .select('name, phone, email')
        .eq('id', booking.guest_id)
        .single();

      const { data: roomData } = await supabaseServiceClient
        .from('rooms')
        .select('category:room_categories!room_category_id(name)')
        .eq('id', booking.room_id)
        .single();

      // Use hotel_meta.hotel_name instead of tenants.name
      const { data: hotelMetaData } = await supabaseServiceClient
        .from('hotel_meta')
        .select('hotel_name')
        .eq('tenant_id', booking.tenant_id)
        .maybeSingle();

      const hotelName = hotelMetaData?.hotel_name || 'Our Hotel';
      const category = Array.isArray(roomData?.category) ? roomData?.category[0] : roomData?.category;
      const roomCategory = category?.name || 'room';

      // Send SMS if enabled
      if (smsSettings?.enabled && guest?.phone) {
        const checkOutDate = new Date(booking.check_out).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric'
        });
        const message = `Hi ${guest.name}, welcome to ${hotelName}! You're checked into ${roomCategory}. Checkout: ${checkOutDate}. Enjoy your stay!`;

        await supabaseServiceClient.functions.invoke('send-sms', {
          body: {
            tenant_id: booking.tenant_id,
            to: guest.phone,
            message,
            event_key: 'checkin_notification',
            booking_id: booking.id,
            guest_id: booking.guest_id
          }
        });
        console.log('[CHECKIN-NOTIFICATION-V2] Check-in SMS sent');
      }

      // Send Email with check_in_welcome event_key
      if (guest?.email) {
        const { data: emailProvider } = await supabaseServiceClient
          .from('platform_email_providers')
          .select('enabled')
          .eq('enabled', true)
          .or(`tenant_id.eq.${booking.tenant_id},tenant_id.is.null`)
          .limit(1)
          .maybeSingle();

        if (emailProvider) {
          await supabaseServiceClient.functions.invoke('send-email-notification', {
            body: {
              tenant_id: booking.tenant_id,
              to: guest.email,
              event_key: 'check_in_welcome',
              variables: {
                guest_name: guest.name,
                room_type: roomCategory,
                hotel_name: hotelName,
                check_out_date: new Date(booking.check_out).toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric'
                })
              },
              booking_id: booking.id,
              guest_id: booking.guest_id
            }
          });
          console.log('[CHECKIN-NOTIFICATION-V2] Check-in welcome email sent');
        }
      }
    } catch (notificationError) {
      console.error('[CHECKIN-NOTIFICATION-V2] Notification failed (non-blocking):', notificationError);
    }

    // Broadcast real-time update to all subscribers
    await supabaseServiceClient
      .channel(`folio-${folio.id}`)
      .send({
        type: 'broadcast',
        event: 'folio_created',
        payload: folio
      })

    return new Response(
      JSON.stringify({ success: true, folio }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[checkin] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
