import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

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

    // Get authenticated user
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { 
      booking_id, 
      force_cancel = false, 
      admin_approval = false,
      cancellation_reason,
      refund_policy,
      refund_amount
    } = await req.json()

    if (!booking_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'booking_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[cancel-booking] Processing cancellation:', { 
      booking_id, 
      force_cancel, 
      admin_approval 
    })

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseServiceClient
      .from('bookings')
      .select('*, guest:guests(*), room:rooms(*)')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      console.error('[cancel-booking] Booking not found:', bookingError)
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for associated folio
    const { data: folio } = await supabaseServiceClient
      .from('stay_folios')
      .select('*')
      .eq('booking_id', booking_id)
      .eq('status', 'open')
      .maybeSingle()

    console.log('[cancel-booking] Folio check:', { 
      has_folio: !!folio, 
      balance: folio?.balance 
    })

    // Rule 1: Check folio balance if folio exists
    if (folio && folio.balance > 0 && !force_cancel) {
      console.warn('[cancel-booking] Outstanding folio balance detected')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'FOLIO_OUTSTANDING_BALANCE',
          message: `Cannot cancel booking with outstanding folio balance of ₦${folio.balance.toLocaleString()}. Please settle the folio first or use force cancel with manager approval.`,
          folio_balance: folio.balance,
          folio_id: folio.id,
          requires_force: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rule 2: Force cancel requires admin approval
    if (force_cancel && !admin_approval) {
      console.warn('[cancel-booking] Force cancel attempted without approval')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'ADMIN_APPROVAL_REQUIRED',
          message: 'Force cancellation with outstanding balance requires manager approval',
          requires_approval: true
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Proceed with cancellation
    console.log('[cancel-booking] Proceeding with cancellation')

    // If force cancel with folio, mark folio as cancelled
    if (force_cancel && folio) {
      console.log('[cancel-booking] Force cancelling folio:', folio.id)
      
      const { error: folioError } = await supabaseServiceClient
        .from('stay_folios')
        .update({
          status: 'cancelled',
          metadata: {
            ...folio.metadata,
            force_cancelled: true,
            cancelled_reason: cancellation_reason,
            cancelled_by: user.id,
            cancelled_at: new Date().toISOString(),
            outstanding_balance_at_cancel: folio.balance
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', folio.id)

      if (folioError) {
        console.error('[cancel-booking] Failed to cancel folio:', folioError)
      }

      // Create finance audit event for force cancellation
      await supabaseServiceClient.from('finance_audit_events').insert({
        tenant_id: booking.tenant_id,
        event_type: 'folio_force_cancelled',
        user_id: user.id,
        target_id: folio.id,
        payload: {
          booking_id,
          booking_reference: booking.booking_reference,
          outstanding_balance: folio.balance,
          reason: cancellation_reason,
          admin_approval,
          force_cancel
        }
      })
    } else if (folio && folio.balance === 0) {
      // Close folio if balance is zero
      console.log('[cancel-booking] Closing balanced folio:', folio.id)
      await supabaseServiceClient
        .from('stay_folios')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', folio.id)
    }

    // Handle platform fees reversal
    console.log('[cancel-booking] Checking for platform fees to reverse')
    const { data: platformFees } = await supabaseServiceClient
      .from('platform_fee_ledger')
      .select('*')
      .eq('reference_type', 'booking')
      .eq('reference_id', booking_id)
      .in('status', ['pending', 'billed'])
      .is('waived_at', null)

    if (platformFees && platformFees.length > 0) {
      console.log(`[cancel-booking] Waiving ${platformFees.length} platform fees`)
      
      for (const fee of platformFees) {
        await supabaseServiceClient
          .from('platform_fee_ledger')
          .update({
            status: 'waived',
            waived_at: new Date().toISOString(),
            waived_reason: 'Booking cancelled - auto-waived by system',
            metadata: {
              ...fee.metadata,
              auto_waived: true,
              waived_at: new Date().toISOString(),
              cancel_reason: cancellation_reason,
              original_status: fee.status
            }
          })
          .eq('id', fee.id)
      }

      // Log platform fee reversal
      await supabaseServiceClient.from('finance_audit_events').insert({
        tenant_id: booking.tenant_id,
        event_type: 'platform_fees_waived',
        user_id: user.id,
        target_id: booking_id,
        payload: {
          booking_id,
          booking_reference: booking.booking_reference,
          fees_waived: platformFees.length,
          reason: 'Booking cancelled'
        }
      })
    }

    console.log('[cancel-booking] Cancellation completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        booking_id,
        folio_handled: !!folio,
        folio_status: folio ? (force_cancel ? 'cancelled' : 'closed') : null,
        platform_fees_waived: platformFees?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[cancel-booking] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
