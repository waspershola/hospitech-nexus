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

    // Verify platform admin or system bot
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (user) {
        const { data: platformUser } = await supabase
          .from('platform_users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!platformUser || !['super_admin', 'billing_bot'].includes(platformUser.role)) {
          throw new Error('Insufficient permissions');
        }
      }
    }

    const { tenantId, month, year } = await req.json().catch(() => ({}));

    // Default to previous month if not specified
    const targetDate = new Date();
    const targetYear = year || (targetDate.getMonth() === 0 ? targetDate.getFullYear() - 1 : targetDate.getFullYear());
    const targetMonth = month !== undefined ? month : (targetDate.getMonth() === 0 ? 11 : targetDate.getMonth() - 1);

    const periodStart = new Date(targetYear, targetMonth, 1);
    const periodEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    console.log('Generating invoices for period:', { periodStart, periodEnd, tenantId });

    // Get active tenants with subscriptions
    let tenantsQuery = supabase
      .from('tenants')
      .select(`
        id,
        name,
        tenant_subscriptions!inner(
          id,
          plan_id,
          status,
          platform_plans(*)
        )
      `)
      .eq('status', 'active')
      .eq('tenant_subscriptions.status', 'active');

    if (tenantId) {
      tenantsQuery = tenantsQuery.eq('id', tenantId);
    }

    const { data: tenants, error: tenantsError } = await tenantsQuery;
    if (tenantsError) throw tenantsError;

    const invoicesGenerated: any[] = [];

    for (const tenant of tenants || []) {
      const subscription = tenant.tenant_subscriptions[0];
      const plan = subscription?.platform_plans as any;

      if (!plan) continue;

      console.log(`Processing tenant: ${tenant.name}`);

      // Check if invoice already exists for this period
      const { data: existingInvoice } = await supabase
        .from('platform_invoices')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('period_start', periodStart.toISOString())
        .eq('period_end', periodEnd.toISOString())
        .single();

      if (existingInvoice) {
        console.log(`Invoice already exists for ${tenant.name}, skipping`);
        continue;
      }

      // Get usage records for the period
      const { data: usageRecords } = await supabase
        .from('platform_usage_records')
        .select('*')
        .eq('tenant_id', tenant.id)
        .gte('period_start', periodStart.toISOString())
        .lte('period_end', periodEnd.toISOString());

      // Aggregate usage by type
      const usage: Record<string, number> = {};
      usageRecords?.forEach((record) => {
        usage[record.usage_type] = (usage[record.usage_type] || 0) + Number(record.quantity);
      });

      // Calculate base subscription amount
      let totalAmount = Number(plan.price);
      const lineItems: any[] = [
        {
          description: `${plan.name} Plan - Monthly Subscription`,
          quantity: 1,
          unit_price: plan.price,
          amount: plan.price,
        },
      ];

      // Calculate overage charges
      if (plan.limits) {
        const limitsToCheck = [
          { key: 'sms_sent', name: 'SMS Messages', limit: plan.limits.sms_sent },
          { key: 'storage_used', name: 'Storage (GB)', limit: plan.limits.storage_used },
          { key: 'api_calls', name: 'API Calls', limit: plan.limits.api_calls },
          { key: 'users_active', name: 'Active Users', limit: plan.limits.users_active },
          { key: 'bookings_created', name: 'Bookings', limit: plan.limits.bookings_created },
        ];

        for (const item of limitsToCheck) {
          if (!item.limit) continue;

          const currentUsage = usage[item.key] || 0;
          const overage = Math.max(0, currentUsage - item.limit);

          if (overage > 0 && plan.overage_rates?.[item.key]) {
            const overageRate = plan.overage_rates[item.key];
            const overageAmount = overage * overageRate;

            lineItems.push({
              description: `${item.name} - Overage (${overage.toLocaleString()} units)`,
              quantity: overage,
              unit_price: overageRate,
              amount: overageAmount,
            });

            totalAmount += overageAmount;
          }
        }
      }

      // Generate invoice number
      const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('platform_invoices')
        .insert({
          tenant_id: tenant.id,
          subscription_id: subscription.id,
          invoice_number: invoiceNumber,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          amount: totalAmount,
          status: 'pending',
          due_date: new Date(periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days after period end
          line_items: lineItems,
        })
        .select()
        .single();

      if (invoiceError) {
        console.error(`Failed to create invoice for ${tenant.name}:`, invoiceError);
        continue;
      }

      invoicesGenerated.push(invoice);

      // Send invoice notification email
      try {
        await supabase.functions.invoke('email-provider', {
          body: {
            action: 'send_invoice',
            tenant_id: tenant.id,
            invoice_id: invoice.id,
            invoice,
          },
        });
        console.log(`Sent invoice notification to ${tenant.name}`);
      } catch (emailError) {
        console.error('Failed to send invoice email:', emailError);
      }
    }

    console.log(`Generated ${invoicesGenerated.length} invoices`);

    return new Response(
      JSON.stringify({
        success: true,
        invoicesGenerated: invoicesGenerated.length,
        invoices: invoicesGenerated,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating invoices:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
