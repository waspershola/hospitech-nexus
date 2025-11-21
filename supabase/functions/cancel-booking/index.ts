import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'

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
      refund_amount,
      approval_token
    } = await req.json()

    if (!booking_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'booking_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[CANCEL-V2-PIN] Processing cancellation:', { 
      booking_id, 
      force_cancel, 
      admin_approval,
      has_approval_token: !!approval_token,
      user_id: user.id,
      timestamp: new Date().toISOString()
    })

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseServiceClient
      .from('bookings')
      .select('*, guest:guests(*), room:rooms!bookings_room_id_fkey(*)')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      console.error('[CANCEL-V2] Booking not found:', {
        booking_id,
        error: bookingError?.message,
        code: bookingError?.code
      })
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

    console.log('[CANCEL-V2] Folio check:', { 
      has_folio: !!folio, 
      folio_id: folio?.id,
      balance: folio?.balance,
      status: folio?.status
    })

    // Rule 1: Check folio balance if folio exists
    if (folio && folio.balance > 0 && !force_cancel) {
      console.warn('[CANCEL-V2] Outstanding folio balance detected:', {
        folio_id: folio.id,
        balance: folio.balance,
        booking_id
      })
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

    // Rule 2: Force cancel requires manager PIN approval
    if (force_cancel) {
      if (!approval_token) {
        console.warn('[CANCEL-V2-PIN] Force cancel attempted without approval token:', {
          user_id: user.id,
          booking_id,
          folio_balance: folio?.balance
        })
        return new Response(
          JSON.stringify({
            success: false,
            error: 'MANAGER_APPROVAL_REQUIRED',
            message: 'Force cancellation with outstanding balance requires manager PIN approval',
            requires_approval: true
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get user's tenant_id
      const { data: userRole } = await supabaseServiceClient
        .from('user_roles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      if (!userRole) {
        return new Response(
          JSON.stringify({ success: false, error: 'User role not found' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate approval token using RPC
      const { data: validationResult, error: validationError } = await supabaseServiceClient.rpc(
        'validate_approval_token',
        {
          p_token: approval_token,
          p_user_id: user.id,
          p_tenant_id: userRole.tenant_id,
          p_action_type: 'force_cancel',
          p_action_reference: booking_id,
          p_amount: folio?.balance || 0
        }
      )

      if (validationError) {
        console.error('[CANCEL-V2-PIN] Token validation error:', validationError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to validate approval token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!validationResult) {
        console.warn('[CANCEL-V2-PIN] Invalid or expired approval token')
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or expired approval token' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[CANCEL-V2-PIN] Manager approval validated successfully')
    }

    // Proceed with cancellation
    console.log('[CANCEL-V2] Proceeding with cancellation')

    // If force cancel with folio, mark folio as cancelled
    if (force_cancel && folio) {
      console.log('[CANCEL-V2] Force cancelling folio:', {
        folio_id: folio.id,
        outstanding_balance: folio.balance,
        booking_reference: booking.booking_reference
      })
      
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
        console.error('[CANCEL-V2] Failed to cancel folio:', {
          folio_id: folio.id,
          error: folioError.message,
          code: folioError.code
        })
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
          force_cancel,
          manager_pin_approved: true,
          version: 'CANCEL-V2-PIN'
        }
      })

      // Clear the approval token after successful use
      const { data: userRole } = await supabaseServiceClient
        .from('user_roles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      if (userRole && approval_token) {
        await supabaseServiceClient.rpc('clear_approval_token', {
          p_user_id: user.id,
          p_tenant_id: userRole.tenant_id
        })
      }
    } else if (folio && folio.balance === 0) {
      console.log('[CANCEL-V2] Closing balanced folio:', {
        folio_id: folio.id,
        balance: 0
      })
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
    console.log('[CANCEL-V2] Checking for platform fees to reverse:', { booking_id })
    const { data: platformFees } = await supabaseServiceClient
      .from('platform_fee_ledger')
      .select('*')
      .eq('reference_type', 'booking')
      .eq('reference_id', booking_id)
      .in('status', ['pending', 'billed'])
      .is('waived_at', null)

    if (platformFees && platformFees.length > 0) {
      console.log(`[CANCEL-V2] Waiving ${platformFees.length} platform fees:`, {
        fee_ids: platformFees.map(f => f.id),
        total_fee_amount: platformFees.reduce((sum, f) => sum + f.fee_amount, 0)
      })
      
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

    console.log('[CANCEL-V2] Cancellation completed successfully:', {
      booking_id,
      folio_handled: !!folio,
      platform_fees_waived: platformFees?.length || 0,
      force_cancel,
      admin_approval
    })

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
    console.error('[CANCEL-V2] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
