import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting billing cycle processing...');

    // Get current period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all active tenants with their plans
    const { data: tenants, error: tenantsError } = await supabase
      .from('platform_tenants')
      .select('id, name, plan_id, platform_plans!inner(name, monthly_price, included_sms)')
      .eq('status', 'active');

    if (tenantsError) throw tenantsError;

    const invoices = [];
    console.log(`Processing billing for ${tenants?.length || 0} active tenants`);

    for (const tenant of tenants || []) {
      try {
        console.log(`Processing tenant: ${tenant.name} (${tenant.id})`);

        // Get usage data for this billing cycle
        const { data: usage } = await supabase
          .from('platform_usage')
          .select('*')
          .eq('tenant_id', tenant.id)
          .gte('last_sync', periodStart.toISOString())
          .lte('last_sync', periodEnd.toISOString())
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

        const overageAmount = smsOverageCost;
        const totalAmount = baseAmount + overageAmount;

        console.log(`Tenant ${tenant.name}: Base=₦${baseAmount}, SMS=${smsUsed}/${includedSMS}, Overage=₦${overageAmount}`);

        // Check if invoice already exists for this cycle
        const { data: existingInvoice } = await supabase
          .from('platform_billing')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('cycle_start', periodStart.toISOString())
          .eq('cycle_end', periodEnd.toISOString())
          .maybeSingle();

        if (existingInvoice) {
          console.log(`Invoice already exists for tenant ${tenant.id}, skipping`);
          continue;
        }

        // Create invoice with detailed line items
        const lineItems = [
          {
            description: `${plan?.name || 'Subscription'} - Monthly Fee`,
            quantity: 1,
            unit_price: baseAmount,
            amount: baseAmount,
          },
        ];

        if (smsOverage > 0) {
          lineItems.push({
            description: `SMS Overage (${smsOverage} messages)`,
            quantity: smsOverage,
            unit_price: 5,
            amount: smsOverageCost,
          });
        }

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('platform_billing')
          .insert({
            tenant_id: tenant.id,
            cycle_start: periodStart.toISOString(),
            cycle_end: periodEnd.toISOString(),
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
              line_items: lineItems,
            },
          })
          .select()
          .single();

        if (invoiceError) {
          console.error(`Failed to create invoice for tenant ${tenant.id}:`, invoiceError);
          continue;
        }

        invoices.push(invoice);

        // Log audit event
        await supabase.from('platform_audit_stream').insert({
          action: 'invoice_generated',
          resource_type: 'platform_billing',
          resource_id: invoice.id,
          actor_role: 'billing_bot',
          payload: {
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            cycle_start: periodStart.toISOString(),
            cycle_end: periodEnd.toISOString(),
            amount_due: totalAmount,
            sms_overage: smsOverage,
          },
        });

        console.log(`✅ Invoice created for tenant ${tenant.name}: ₦${totalAmount}`);
      } catch (error) {
        console.error(`Error processing tenant ${tenant.id}:`, error);
      }
    }

    console.log(`✅ Billing cycle completed. Generated ${invoices.length} invoices.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invoices_generated: invoices.length,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        total_billed: invoices.reduce((sum, inv) => sum + (inv.amount_due || 0), 0),
        invoices: invoices.map(inv => ({
          id: inv.id,
          tenant_id: inv.tenant_id,
          amount: inv.amount_due,
          status: inv.status,
        })),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Billing cycle error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
