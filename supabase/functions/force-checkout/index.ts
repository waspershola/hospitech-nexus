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

    const { booking_id, tenant_id, manager_id, reason, create_receivable } = await req.json();

    if (!booking_id || !tenant_id || !manager_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate manager has permission
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', manager_id)
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (!userRole || !['owner', 'manager'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions. Manager or owner role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get booking details
    const { data: booking } = await supabase
      .from('bookings')
      .select('*, guest:guests(*)')
      .eq('id', booking_id)
      .single();

    if (!booking) {
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate outstanding balance
    const { data: charges } = await supabase
      .from('booking_charges')
      .select('amount')
      .eq('booking_id', booking_id);

    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('booking_id', booking_id)
      .eq('status', 'success');

    const totalCharges = charges?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
    const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const balanceDue = totalCharges - totalPaid;

    if (balanceDue <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No outstanding balance to force checkout' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create receivable if requested
    if (create_receivable) {
      const { error: receivableError } = await supabase.from('receivables').insert([{
        tenant_id,
        guest_id: booking.guest_id,
        organization_id: booking.organization_id,
        booking_id: booking_id,
        amount: balanceDue,
        status: 'open',
        created_by: manager_id,
        approved_by: manager_id,
        metadata: {
          reason: reason || 'Manager override checkout',
          forced_checkout: true,
          booking_reference: booking.id,
          approved_at: new Date().toISOString(),
        },
      }]);

      if (receivableError) throw receivableError;
    }

    // Update booking status to checked out
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ 
        status: 'checked_out',
        metadata: { 
          ...(booking.metadata || {}), 
          forced_checkout: true,
          forced_checkout_by: manager_id,
          forced_checkout_at: new Date().toISOString(),
          forced_checkout_reason: reason,
        }
      })
      .eq('id', booking_id);

    if (bookingError) throw bookingError;

    // Create audit log
    await supabase.from('finance_audit_events').insert([{
      tenant_id,
      event_type: 'checkout_override',
      user_id: manager_id,
      target_id: booking_id,
      payload: {
        booking_id,
        guest_id: booking.guest_id,
        organization_id: booking.organization_id,
        balance_due: balanceDue,
        reason: reason || 'No reason provided',
        manager_role: userRole.role,
        receivable_created: create_receivable,
      },
    }]);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Checkout approved with outstanding balance',
        balance_due: balanceDue,
        receivable_created: create_receivable,
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