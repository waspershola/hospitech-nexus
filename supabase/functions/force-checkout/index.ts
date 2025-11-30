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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // SECURITY: Verify user authentication first
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[force-checkout] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user's role and tenant
    const { data: authenticatedUserRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role, tenant_id')
      .eq('user_id', user.id)
      .single();

    if (roleError || !authenticatedUserRole) {
      console.error('[force-checkout] Role fetch failed:', roleError);
      return new Response(
        JSON.stringify({ success: false, error: 'No role assigned to user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL: Only owners and managers can force checkout
    const allowedRoles = ['owner', 'manager'];
    if (!allowedRoles.includes(authenticatedUserRole.role)) {
      console.error('[force-checkout] Insufficient permissions:', authenticatedUserRole.role);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Insufficient permissions. Only managers and owners can force checkout.',
          required_roles: allowedRoles,
          user_role: authenticatedUserRole.role
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[force-checkout] User authorized:', user.id, 'Role:', authenticatedUserRole.role);

    const { booking_id, tenant_id, manager_id, reason, create_receivable, approval_token } = await req.json();

    if (!booking_id || !tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: booking_id, tenant_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FORCE-CHECKOUT-PIN-V1: Validate Manager PIN approval token
    if (!approval_token) {
      console.error('[FORCE-CHECKOUT-PIN-V1] Missing approval token');
      return new Response(
        JSON.stringify({ success: false, error: 'Manager approval required. Missing approval token.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the approval token
    const { data: tokenValidation, error: tokenError } = await supabase.rpc('validate_approval_token', {
      p_token: approval_token,
      p_tenant_id: tenant_id
    });

    if (tokenError || !tokenValidation) {
      console.error('[FORCE-CHECKOUT-PIN-V1] Token validation failed:', tokenError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid or expired approval token. Please verify your Manager PIN and try again.' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[FORCE-CHECKOUT-PIN-V1] Approval token validated for staff:', tokenValidation.staff_id);

    // SECURITY: Verify tenant_id matches authenticated user's tenant
    if (tenant_id !== authenticatedUserRole.tenant_id) {
      console.error('[force-checkout] Tenant mismatch:', tenant_id, 'vs', authenticatedUserRole.tenant_id);
      return new Response(
        JSON.stringify({ success: false, error: 'Tenant mismatch - unauthorized access attempt' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use authenticated user's ID as manager_id (ignore any provided manager_id)
    const actualManagerId = user.id;

    // PHASE-2-FIX: Get booking details with folio (source of truth for balance)
    const { data: booking } = await supabase
      .from('bookings')
      .select('*, guest:guests(*), room:rooms(*)')
      .eq('id', booking_id)
      .single();

    if (!booking) {
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PHASE-2-FIX: Get folio balance (source of truth)
    const { data: folio } = await supabase
      .from('stay_folios')
      .select('id, total_charges, total_payments, balance, status')
      .eq('booking_id', booking_id)
      .eq('tenant_id', tenant_id)
      .eq('status', 'open')
      .maybeSingle();

    const balanceDue = folio?.balance || 0;
    
    console.log('[PHASE-2-FIX] Force checkout:', {
      booking_id,
      folio_id: folio?.id,
      balance: balanceDue,
      create_receivable,
      reason
    });

    // PHASE-2-FIX: Create receivable only if there's an outstanding balance
    if (create_receivable && balanceDue > 0) {
      const { error: receivableError } = await supabase.from('receivables').insert([{
        tenant_id,
        guest_id: booking.guest_id,
        organization_id: booking.organization_id,
        booking_id: booking_id,
        amount: balanceDue,
        status: 'open',
        created_by: actualManagerId,
        approved_by: actualManagerId,
        metadata: {
          reason: reason || 'Manager override checkout',
          forced_checkout: true,
          booking_reference: booking.booking_reference,
          folio_id: folio?.id,
          approved_at: new Date().toISOString(),
          version: 'PHASE-2-FIX'
        },
      }]);

      if (receivableError) {
        console.error('[PHASE-2-FIX] Failed to create receivable:', receivableError);
        throw receivableError;
      }
      console.log('[PHASE-2-FIX] Receivable created for balance:', balanceDue);
    }

    // PHASE-2-FIX: Close the folio if it exists
    if (folio) {
      const { error: folioCloseError } = await supabase
        .from('stay_folios')
        .update({ 
          status: 'closed',
          updated_at: new Date().toISOString()
        })
        .eq('id', folio.id);

      if (folioCloseError) {
        console.error('[PHASE-2-FIX] Failed to close folio:', folioCloseError);
        throw folioCloseError;
      }
      console.log('[PHASE-2-FIX] Folio closed:', folio.id);
    }

    // PHASE-2-FIX: Update booking status to completed (not checked_out - use proper status)
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ 
        status: 'completed',
        metadata: { 
          ...(booking.metadata || {}), 
          forced_checkout: true,
          forced_checkout_by: actualManagerId,
          forced_checkout_at: new Date().toISOString(),
          forced_checkout_reason: reason,
          checked_out_by: actualManagerId,
          version: 'PHASE-2-FIX'
        }
      })
      .eq('id', booking_id);

    if (bookingError) {
      console.error('[PHASE-2-FIX] Failed to update booking:', bookingError);
      throw bookingError;
    }

    // PHASE-2-FIX: Update room status to cleaning (ready for housekeeping)
    if (booking.room_id) {
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'cleaning' })
        .eq('id', booking.room_id);

      if (roomError) {
        console.error('[PHASE-2-FIX] Failed to update room status:', roomError);
        // Non-blocking - don't throw
      } else {
        console.log('[PHASE-2-FIX] Room status updated to cleaning');
      }
    }

    // FORCE-CHECKOUT-PIN-V1: Clear the approval token to prevent replay attacks
    await supabase.rpc('clear_approval_token', {
      p_token: approval_token
    });

    // PHASE-2-FIX: Create audit log with enhanced details
    await supabase.from('finance_audit_events').insert([{
      tenant_id,
      event_type: 'checkout_override',
      user_id: actualManagerId,
      target_id: booking_id,
      payload: {
        booking_id,
        booking_reference: booking.booking_reference,
        guest_id: booking.guest_id,
        guest_name: booking.guest?.name,
        organization_id: booking.organization_id,
        room_id: booking.room_id,
        room_number: booking.room?.number,
        folio_id: folio?.id,
        balance_due: balanceDue,
        reason: reason || 'No reason provided',
        manager_role: authenticatedUserRole.role,
        receivable_created: create_receivable && balanceDue > 0,
        approval_token_used: true,
        approved_by_staff_id: tokenValidation.staff_id,
        version: 'FORCE-CHECKOUT-PIN-V1'
      },
    }]);

    return new Response(
      JSON.stringify({
        success: true,
        message: balanceDue > 0 
          ? 'Force checkout completed with outstanding balance' 
          : 'Force checkout completed',
        balance_due: balanceDue,
        receivable_created: create_receivable && balanceDue > 0,
        folio_closed: !!folio,
        room_updated: !!booking.room_id,
        version: 'FORCE-CHECKOUT-PIN-V1'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Force checkout error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});