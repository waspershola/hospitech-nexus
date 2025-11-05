import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // This function should be called by cron, but we'll verify with service role
    console.log('Starting billing cycle processing...');

    // Get current period (previous month)
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 1, 1);

    console.log(`Processing billing for period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

    // Get all active tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, slug');

    if (tenantsError) throw tenantsError;

    console.log(`Found ${tenants?.length || 0} tenants to process`);

    const invoices = [];

    for (const tenant of tenants || []) {
      // Get usage for this tenant in the period
      const { data: usageRecords, error: usageError } = await supabase
        .from('platform_usage_records')
        .select('*')
        .eq('tenant_id', tenant.id)
        .gte('period_start', periodStart.toISOString())
        .lt('period_end', periodEnd.toISOString());

      if (usageError) {
        console.error(`Error fetching usage for tenant ${tenant.id}:`, usageError);
        continue;
      }

      if (!usageRecords || usageRecords.length === 0) {
        console.log(`No usage records for tenant ${tenant.id}, skipping invoice`);
        continue;
      }

      // Calculate total cost
      const totalCost = usageRecords.reduce((sum, record) => sum + Number(record.cost), 0);

      if (totalCost === 0) {
        console.log(`Zero cost for tenant ${tenant.id}, skipping invoice`);
        continue;
      }

      // Generate invoice number
      const invoiceNumber = `INV-${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}-${tenant.id.substring(0, 8).toUpperCase()}`;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('platform_invoices')
        .insert({
          tenant_id: tenant.id,
          invoice_number: invoiceNumber,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          total_amount: totalCost,
          status: 'pending',
          due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
          line_items: usageRecords.map(record => ({
            usage_type: record.usage_type,
            quantity: record.quantity,
            cost: record.cost,
            description: `${record.usage_type.toUpperCase()} usage: ${record.quantity} units`,
          })),
        })
        .select()
        .single();

      if (invoiceError) {
        console.error(`Error creating invoice for tenant ${tenant.id}:`, invoiceError);
        continue;
      }

      invoices.push(invoice);

      // Send invoice notification via email
      try {
        await supabase.functions.invoke('email-provider', {
          body: {
            to_email: tenant.slug + '@example.com', // Would get from tenant settings
            subject: `Invoice ${invoiceNumber} - Payment Due`,
            template_id: 'invoice_generated',
            template_data: {
              tenant_name: tenant.name,
              invoice_number: invoiceNumber,
              total_amount: totalCost,
              due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
              period: `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`,
            },
          },
        });
      } catch (emailError) {
        console.error(`Error sending invoice email for tenant ${tenant.id}:`, emailError);
      }

      console.log(`Created invoice ${invoiceNumber} for tenant ${tenant.name} - Amount: ₦${totalCost}`);
    }

    // Log to audit stream
    await supabase.from('platform_audit_stream').insert({
      event_type: 'billing_cycle_completed',
      actor_id: null,
      metadata: {
        period: { start: periodStart.toISOString(), end: periodEnd.toISOString() },
        invoices_generated: invoices.length,
        total_billed: invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        period: { start: periodStart.toISOString(), end: periodEnd.toISOString() },
        invoices_generated: invoices.length,
        total_billed: invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0),
        invoices,
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
