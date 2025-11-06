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

    // Verify platform admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user } } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { data: platformUser } = await supabase
      .from('platform_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!platformUser || !['super_admin', 'billing_bot'].includes(platformUser.role)) {
      throw new Error('Insufficient permissions');
    }

    const { dateFrom, dateTo, tenantId } = await req.json();

    console.log('Syncing usage:', { dateFrom, dateTo, tenantId });

    // Get date range for sync
    const periodStart = dateFrom ? new Date(dateFrom) : new Date(new Date().setDate(1)); // First of month
    const periodEnd = dateTo ? new Date(dateTo) : new Date(); // Today

    // Query to build for tenant filtering
    let tenantsQuery = supabase
      .from('tenants')
      .select('id, name')
      .eq('status', 'active');

    if (tenantId) {
      tenantsQuery = tenantsQuery.eq('id', tenantId);
    }

    const { data: tenants, error: tenantsError } = await tenantsQuery;

    if (tenantsError) throw tenantsError;

    const usageRecords: any[] = [];

    // Sync usage for each tenant
    for (const tenant of tenants || []) {
      console.log(`Syncing usage for tenant: ${tenant.name}`);

      // Get tenant's current subscription
      const { data: subscription } = await supabase
        .from('tenant_subscriptions')
        .select('*, platform_plans(*)')
        .eq('tenant_id', tenant.id)
        .eq('status', 'active')
        .single();

      // Count SMS sent (from guest_communications)
      const { count: smsCount } = await supabase
        .from('guest_communications')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('type', 'sms')
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      // Count active users (from user_roles)
      const { count: usersCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id);

      // Count bookings created
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      // Count API calls (from platform_audit_stream if available)
      const { count: apiCallsCount } = await supabase
        .from('platform_audit_stream')
        .select('*', { count: 'exact', head: true })
        .eq('resource_id', tenant.id)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      // Calculate storage used (this is a placeholder - implement based on actual storage)
      const storageUsed = 0;

      const plan = subscription?.platform_plans;

      // Calculate costs for overages
      const calculateOverageCost = (usage: number, limit: number, rate: number) => {
        if (!limit || usage <= limit) return 0;
        return (usage - limit) * (rate || 0);
      };

      const smsOverageCost = plan ? calculateOverageCost(
        smsCount || 0,
        plan.limits?.sms_sent || 0,
        plan.overage_rates?.sms_sent || 0
      ) : 0;

      const storageOverageCost = plan ? calculateOverageCost(
        storageUsed,
        plan.limits?.storage_used || 0,
        plan.overage_rates?.storage_used || 0
      ) : 0;

      const apiCallsOverageCost = plan ? calculateOverageCost(
        apiCallsCount || 0,
        plan.limits?.api_calls || 0,
        plan.overage_rates?.api_calls || 0
      ) : 0;

      const usersOverageCost = plan ? calculateOverageCost(
        usersCount || 0,
        plan.limits?.users_active || 0,
        plan.overage_rates?.users_active || 0
      ) : 0;

      const bookingsOverageCost = plan ? calculateOverageCost(
        bookingsCount || 0,
        plan.limits?.bookings_created || 0,
        plan.overage_rates?.bookings_created || 0
      ) : 0;

      // Create usage records
      const records = [
        {
          tenant_id: tenant.id,
          plan_id: subscription?.plan_id,
          usage_type: 'sms_sent',
          quantity: smsCount || 0,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          cost: smsOverageCost,
          metadata: { limit: plan?.limits?.sms_sent, rate: plan?.overage_rates?.sms_sent },
        },
        {
          tenant_id: tenant.id,
          plan_id: subscription?.plan_id,
          usage_type: 'storage_used',
          quantity: storageUsed,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          cost: storageOverageCost,
          metadata: { limit: plan?.limits?.storage_used, rate: plan?.overage_rates?.storage_used },
        },
        {
          tenant_id: tenant.id,
          plan_id: subscription?.plan_id,
          usage_type: 'api_calls',
          quantity: apiCallsCount || 0,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          cost: apiCallsOverageCost,
          metadata: { limit: plan?.limits?.api_calls, rate: plan?.overage_rates?.api_calls },
        },
        {
          tenant_id: tenant.id,
          plan_id: subscription?.plan_id,
          usage_type: 'users_active',
          quantity: usersCount || 0,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          cost: usersOverageCost,
          metadata: { limit: plan?.limits?.users_active, rate: plan?.overage_rates?.users_active },
        },
        {
          tenant_id: tenant.id,
          plan_id: subscription?.plan_id,
          usage_type: 'bookings_created',
          quantity: bookingsCount || 0,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          cost: bookingsOverageCost,
          metadata: { limit: plan?.limits?.bookings_created, rate: plan?.overage_rates?.bookings_created },
        },
      ];

      usageRecords.push(...records);
    }

    // Insert usage records
    const { error: insertError } = await supabase
      .from('platform_usage_records')
      .insert(usageRecords);

    if (insertError) throw insertError;

    console.log(`Synced ${usageRecords.length} usage records`);

    return new Response(
      JSON.stringify({
        success: true,
        recordsCreated: usageRecords.length,
        periodStart,
        periodEnd,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error syncing usage:', error);
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
