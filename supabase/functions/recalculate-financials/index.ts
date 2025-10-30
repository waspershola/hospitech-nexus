import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tenant_id and verify role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['owner', 'manager'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Owner or Manager role required' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current financial settings
    const { data: financials } = await supabase
      .from('hotel_financials')
      .select('*')
      .eq('tenant_id', userRole.tenant_id)
      .single();

    if (!financials) {
      return new Response(
        JSON.stringify({ error: 'No financial settings found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all active/future bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, check_in, check_out, room_id, metadata')
      .eq('tenant_id', userRole.tenant_id)
      .in('status', ['confirmed', 'checked_in'])
      .gte('check_out', new Date().toISOString());

    let updated = 0;
    const errors: string[] = [];

    for (const booking of bookings || []) {
      try {
        // Calculate nights
        const nights = Math.ceil(
          (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) 
          / (1000 * 60 * 60 * 24)
        );

        // Get room rate
        const { data: room } = await supabase
          .from('rooms')
          .select('rate')
          .eq('id', booking.room_id)
          .single();

        const baseRate = Number(room?.rate || 0) * nights;

        // Calculate VAT and service charge
        let vatAmount = 0;
        let serviceChargeAmount = 0;

        if (financials.vat_inclusive) {
          vatAmount = baseRate * (financials.vat_rate / (100 + financials.vat_rate));
        } else {
          vatAmount = baseRate * (financials.vat_rate / 100);
        }

        if (financials.service_charge_inclusive) {
          serviceChargeAmount = baseRate * (financials.service_charge / (100 + financials.service_charge));
        } else {
          serviceChargeAmount = baseRate * (financials.service_charge / 100);
        }

        const totalAmount = financials.vat_inclusive && financials.service_charge_inclusive 
          ? baseRate
          : baseRate + vatAmount + serviceChargeAmount;

        // Update booking
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            total_amount: totalAmount,
            metadata: {
              ...booking.metadata,
              vat_amount: vatAmount,
              service_charge_amount: serviceChargeAmount,
              recalculated_at: new Date().toISOString(),
            }
          })
          .eq('id', booking.id);

        if (updateError) {
          errors.push(`Booking ${booking.id}: ${updateError.message}`);
        } else {
          updated++;
        }
      } catch (err) {
        errors.push(`Booking ${booking.id}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated_bookings: updated,
        total_bookings: bookings?.length || 0,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully recalculated ${updated} of ${bookings?.length || 0} bookings`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in recalculate-financials:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
