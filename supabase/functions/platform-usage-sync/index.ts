import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UsageRecord {
  tenant_id: string;
  usage_type: 'sms' | 'storage' | 'api_calls' | 'users';
  quantity: number;
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if platform admin
    const { data: platformUser } = await supabase
      .from('platform_users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isPlatformAdmin = platformUser?.role && ['super_admin', 'billing_bot'].includes(platformUser.role);

    const body = await req.json();
    const { action, tenant_id, date_range } = body;

    // Sync SMS usage to billing
    if (action === 'sync_sms_usage') {
      const startDate = date_range?.start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const endDate = date_range?.end || new Date().toISOString();

      // Get all SMS usage logs for the period
      const { data: smsLogs, error: logsError } = await supabase
        .from('tenant_sms_usage_logs')
        .select('tenant_id, cost, sent_at')
        .gte('sent_at', startDate)
        .lte('sent_at', endDate);

      if (logsError) throw logsError;

      // Group by tenant
      const usageByTenant = smsLogs?.reduce((acc, log) => {
        if (!acc[log.tenant_id]) {
          acc[log.tenant_id] = { quantity: 0, cost: 0 };
        }
        acc[log.tenant_id].quantity += 1;
        acc[log.tenant_id].cost += Number(log.cost);
        return acc;
      }, {} as Record<string, { quantity: number; cost: number }>);

      // Create or update usage records
      const usageRecords = Object.entries(usageByTenant || {}).map(([tenantId, usage]) => ({
        tenant_id: tenantId,
        usage_type: 'sms',
        quantity: usage.quantity,
        cost: usage.cost,
        period_start: startDate,
        period_end: endDate,
        metadata: {
          total_messages: usage.quantity,
          total_cost: usage.cost,
        },
      }));

      if (usageRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('platform_usage_records')
          .upsert(usageRecords, {
            onConflict: 'tenant_id,usage_type,period_start',
          });

        if (insertError) throw insertError;
      }

      // Log to audit stream
      await supabase.from('platform_audit_stream').insert({
        event_type: 'usage_synced',
        actor_id: user.id,
        metadata: {
          action: 'sync_sms_usage',
          period: { start: startDate, end: endDate },
          records_synced: usageRecords.length,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          records_synced: usageRecords.length,
          usage_by_tenant: usageByTenant,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get usage summary for a tenant
    if (action === 'get_usage_summary') {
      if (!tenant_id && !isPlatformAdmin) {
        throw new Error('Tenant ID required for non-admin users');
      }

      const startDate = date_range?.start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const endDate = date_range?.end || new Date().toISOString();

      let query = supabase
        .from('platform_usage_records')
        .select('*')
        .gte('period_start', startDate)
        .lte('period_end', endDate);

      if (tenant_id) {
        query = query.eq('tenant_id', tenant_id);
      }

      const { data: usageRecords, error: usageError } = await query;

      if (usageError) throw usageError;

      // Calculate summary
      const summary = usageRecords?.reduce((acc, record) => {
        if (!acc[record.usage_type]) {
          acc[record.usage_type] = { quantity: 0, cost: 0 };
        }
        acc[record.usage_type].quantity += record.quantity;
        acc[record.usage_type].cost += Number(record.cost);
        return acc;
      }, {} as Record<string, { quantity: number; cost: number }>);

      return new Response(
        JSON.stringify({
          success: true,
          summary,
          records: usageRecords,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error('Usage sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
