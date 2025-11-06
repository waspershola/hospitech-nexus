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

    // Verify platform admin or system
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

        if (!platformUser || !['super_admin', 'billing_bot', 'monitoring_bot'].includes(platformUser.role)) {
          throw new Error('Insufficient permissions');
        }
      }
    }

    const { tenantId } = await req.json().catch(() => ({}));

    console.log('Checking usage limits', { tenantId });

    // Get active tenants with subscriptions
    let tenantsQuery = supabase
      .from('tenants')
      .select(`
        id,
        name,
        status,
        tenant_subscriptions!inner(
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

    const warnings: any[] = [];
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    for (const tenant of tenants || []) {
      const subscription = tenant.tenant_subscriptions[0];
      const plan = subscription?.platform_plans as any;

      if (!plan || !plan.limits) continue;

      console.log(`Checking limits for tenant: ${tenant.name}`);

      // Get current month's usage
      const { data: usageRecords } = await supabase
        .from('platform_usage_records')
        .select('usage_type, quantity')
        .eq('tenant_id', tenant.id)
        .gte('period_start', currentMonth.toISOString());

      // Aggregate usage by type
      const usage: Record<string, number> = {};
      usageRecords?.forEach((record) => {
        usage[record.usage_type] = (usage[record.usage_type] || 0) + Number(record.quantity);
      });

      // Check each limit
      const limitsToCheck = [
        { key: 'sms_sent', name: 'SMS Messages', limit: plan.limits?.sms_sent },
        { key: 'storage_used', name: 'Storage', limit: plan.limits?.storage_used },
        { key: 'api_calls', name: 'API Calls', limit: plan.limits?.api_calls },
        { key: 'users_active', name: 'Active Users', limit: plan.limits?.users_active },
        { key: 'bookings_created', name: 'Bookings', limit: plan.limits?.bookings_created },
      ];

      for (const item of limitsToCheck) {
        if (!item.limit) continue;

        const currentUsage = usage[item.key] || 0;
        const percentage = (currentUsage / item.limit) * 100;

        // Trigger warnings at 80%, 90%, and 100%
        let warningLevel = null;
        if (percentage >= 100) {
          warningLevel = 'critical';
        } else if (percentage >= 90) {
          warningLevel = 'high';
        } else if (percentage >= 80) {
          warningLevel = 'medium';
        }

        if (warningLevel) {
          const warning = {
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            usage_type: item.key,
            usage_name: item.name,
            current_usage: currentUsage,
            limit: item.limit,
            percentage: Math.round(percentage),
            warning_level: warningLevel,
            overage_rate: plan.overage_rates?.[item.key] || 0,
          };

          warnings.push(warning);

          // Send notification
          try {
            await supabase.functions.invoke('email-provider', {
              body: {
                action: 'send_usage_warning',
                tenant_id: tenant.id,
                warning,
              },
            });
            console.log(`Sent ${warningLevel} warning for ${item.name} to ${tenant.name}`);
          } catch (emailError) {
            console.error('Failed to send email:', emailError);
          }
        }
      }
    }

    console.log(`Generated ${warnings.length} usage warnings`);

    return new Response(
      JSON.stringify({
        success: true,
        warnings,
        tenantsChecked: tenants?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error checking usage limits:', error);
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
