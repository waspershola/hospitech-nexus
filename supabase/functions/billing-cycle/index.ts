import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    console.log('Starting billing cycle automation...');

    // Get current billing period
    const now = new Date();
    const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Fetch all active tenants with their plans
    const { data: tenants, error: tenantsError } = await supabase
      .from('platform_tenants')
      .select('id, name, plan_id, platform_plans!inner(monthly_price, included_sms)')
      .eq('status', 'active');

    if (tenantsError) throw tenantsError;

    console.log(`Processing billing for ${tenants?.length || 0} tenants`);

    const results = [];

    for (const tenant of tenants || []) {
      try {
        // Fetch usage data for this billing cycle
        const { data: usage } = await supabase
          .from('platform_usage')
          .select('*')
          .eq('tenant_id', tenant.id)
          .gte('last_sync', cycleStart.toISOString())
          .lte('last_sync', cycleEnd.toISOString())
          .order('last_sync', { ascending: false })
          .limit(1)
          .single();

        // Calculate base amount from plan
        const plan = Array.isArray(tenant.platform_plans) ? tenant.platform_plans[0] : tenant.platform_plans;
        const baseAmount = plan?.monthly_price || 0;
        
        // Calculate SMS overage
        const includedSMS = plan?.included_sms || 0;
        const smsUsed = usage?.sms_sent || 0;
        const smsOverage = Math.max(0, smsUsed - includedSMS);
        const smsOverageCost = smsOverage * 5; // ₦5 per SMS overage

        const totalAmount = baseAmount + smsOverageCost;

        // Check if invoice already exists for this cycle
        const { data: existingInvoice } = await supabase
          .from('platform_billing')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('cycle_start', cycleStart.toISOString())
          .eq('cycle_end', cycleEnd.toISOString())
          .maybeSingle();

        if (existingInvoice) {
          console.log(`Invoice already exists for tenant ${tenant.id}`);
          continue;
        }

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('platform_billing')
          .insert({
            tenant_id: tenant.id,
            cycle_start: cycleStart.toISOString(),
            cycle_end: cycleEnd.toISOString(),
            amount_due: totalAmount,
            amount_paid: 0,
            status: 'pending',
            sms_used: smsUsed,
            invoice_payload: {
              base_amount: baseAmount,
              sms_included: includedSMS,
              sms_used: smsUsed,
              sms_overage: smsOverage,
              sms_overage_cost: smsOverageCost,
              rooms_total: usage?.rooms_total || 0,
              bookings_monthly: usage?.bookings_monthly || 0,
              api_calls: usage?.api_calls || 0,
            },
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Log to audit stream
        await supabase
          .from('platform_audit_stream')
          .insert({
            action: 'invoice_generated',
            resource_type: 'platform_billing',
            resource_id: invoice.id,
            actor_role: 'billing_bot',
            payload: {
              tenant_id: tenant.id,
              tenant_name: tenant.name,
              cycle_start: cycleStart.toISOString(),
              cycle_end: cycleEnd.toISOString(),
              amount_due: totalAmount,
              sms_overage: smsOverage,
            },
          });

        results.push({
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          invoice_id: invoice.id,
          amount_due: totalAmount,
          sms_overage: smsOverage,
        });

        console.log(`Invoice created for tenant ${tenant.id}: ₦${totalAmount}`);
      } catch (error: any) {
        console.error(`Error processing tenant ${tenant.id}:`, error);
        results.push({
          tenant_id: tenant.id,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        cycle_start: cycleStart.toISOString(),
        cycle_end: cycleEnd.toISOString(),
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Billing cycle error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
