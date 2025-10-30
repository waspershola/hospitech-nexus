import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('Financial settings:', {
      vat_rate: financials.vat_rate,
      vat_inclusive: financials.vat_inclusive,
      service_charge: financials.service_charge,
      service_charge_inclusive: financials.service_charge_inclusive,
      vat_applied_on: financials.vat_applied_on || 'subtotal',
      rounding: financials.rounding || 'round',
    });

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

        const rate = Number(room?.rate || 0);
        const baseAmount = rate * nights;

        console.log(`Booking ${booking.id}: rate=${rate}, nights=${nights}, baseAmount=${baseAmount}`);

        // Use the robust calculation function
        const taxBreakdown = calculateBookingTotal(baseAmount, financials);

        console.log(`Booking ${booking.id} breakdown:`, taxBreakdown);

        // Update booking with complete breakdown
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            total_amount: taxBreakdown.totalAmount,
            metadata: {
              ...booking.metadata,
              tax_breakdown: {
                base_amount: taxBreakdown.baseAmount,
                vat_amount: taxBreakdown.vatAmount,
                service_charge_amount: taxBreakdown.serviceAmount,
              },
              recalculated_at: new Date().toISOString(),
            }
          })
          .eq('id', booking.id);

        if (updateError) {
          console.error(`Error updating booking ${booking.id}:`, updateError);
          errors.push(`Booking ${booking.id}: ${updateError.message}`);
        } else {
          updated++;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error processing booking ${booking.id}:`, err);
        errors.push(`Booking ${booking.id}: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated_bookings: updated,
        total_bookings: bookings?.length || 0,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully recalculated ${updated} of ${bookings?.length || 0} bookings using corrected formulas`,
        financial_settings_applied: {
          vat_rate: financials.vat_rate,
          vat_inclusive: financials.vat_inclusive,
          service_charge: financials.service_charge,
          service_charge_inclusive: financials.service_charge_inclusive,
          vat_applied_on: financials.vat_applied_on || 'subtotal',
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in recalculate-financials:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
