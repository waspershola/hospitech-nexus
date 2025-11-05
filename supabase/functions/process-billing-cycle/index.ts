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

    // Get all active tenants with subscriptions
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, plan_id');

    if (tenantsError) throw tenantsError;

    const invoices = [];

    for (const tenant of tenants || []) {
      try {
        // Get usage for this tenant
        const { data: usage } = await supabase
          .from('platform_usage_aggregates')
          .select('*')
          .eq('tenant_id', tenant.id)
          .gte('period_start', periodStart.toISOString())
          .lte('period_end', periodEnd.toISOString());

        if (!usage || usage.length === 0) {
          console.log(`No usage for tenant ${tenant.id}, skipping`);
          continue;
        }

        // Calculate total cost
        let baseAmount = 0;
        let overageAmount = 0;
        const lineItems: any[] = [];

        // Get plan details
        const { data: plan } = await supabase
          .from('platform_plans')
          .select('*')
          .eq('id', tenant.plan_id)
          .single();

        const planLimits = plan?.limits || {};

        for (const usageRecord of usage) {
          const metricType = usageRecord.metric_type;
          const quantity = usageRecord.total_quantity;
          const limit = planLimits[metricType] || 0;

          if (quantity > limit) {
            // Calculate overage
            const overage = quantity - limit;
            const overageRate = plan?.overage_rates?.[metricType] || 0;
            const overageCost = overage * overageRate;

            overageAmount += overageCost;

            lineItems.push({
              description: `${metricType} overage (${overage} units)`,
              quantity: overage,
              unit_price: overageRate,
              amount: overageCost,
            });
          }
        }

        // Add base subscription fee
        baseAmount = plan?.price || 0;
        lineItems.unshift({
          description: `${plan?.name || 'Subscription'} - Monthly Fee`,
          quantity: 1,
          unit_price: baseAmount,
          amount: baseAmount,
        });

        const totalAmount = baseAmount + overageAmount;

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('platform_invoices')
          .insert({
            tenant_id: tenant.id,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
            base_amount: baseAmount,
            overage_amount: overageAmount,
            total_amount: totalAmount,
            status: 'pending',
            line_items: lineItems,
            metadata: {
              usage_summary: usage.map(u => ({
                metric: u.metric_type,
                quantity: u.total_quantity,
              })),
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
          event_type: 'invoice_generated',
          user_id: null,
          metadata: {
            invoice_id: invoice.id,
            tenant_id: tenant.id,
            total_amount: totalAmount,
            period_start: periodStart.toISOString(),
          },
        });

        console.log(`Invoice created for tenant ${tenant.id}: ${invoice.id}`);
      } catch (error) {
        console.error(`Error processing tenant ${tenant.id}:`, error);
      }
    }

    console.log(`Billing cycle completed. Generated ${invoices.length} invoices.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invoices_generated: invoices.length,
        invoices 
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
