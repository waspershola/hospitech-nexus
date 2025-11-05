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

    const { tenant_id } = await req.json();

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Tracking usage for tenant: ${tenant_id}`);

    // Count total rooms
    const { count: roomsTotal } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id);

    // Count bookings this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: bookingsMonthly } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .gte('created_at', startOfMonth.toISOString());

    // Count SMS sent this month
    const { data: smsLogs } = await supabase
      .from('platform_audit_stream')
      .select('payload')
      .eq('action', 'sms_sent')
      .eq('resource_type', 'sms')
      .contains('payload', { tenant_id })
      .gte('created_at', startOfMonth.toISOString());

    const smsSent = smsLogs?.length || 0;

    // Count API calls this month (from audit stream)
    const { count: apiCalls } = await supabase
      .from('platform_audit_stream')
      .select('*', { count: 'exact', head: true })
      .contains('payload', { tenant_id })
      .gte('created_at', startOfMonth.toISOString());

    // Prepare usage snapshot
    const usageSnapshot = {
      rooms_by_status: {},
      bookings_by_status: {},
      sms_by_provider: {},
      peak_occupancy: 0,
      revenue_monthly: 0,
    };

    // Upsert usage record
    const { data: usage, error: usageError } = await supabase
      .from('platform_usage')
      .upsert({
        tenant_id,
        rooms_total: roomsTotal || 0,
        bookings_monthly: bookingsMonthly || 0,
        sms_sent: smsSent,
        api_calls: apiCalls || 0,
        last_sync: new Date().toISOString(),
        usage_snapshot: usageSnapshot,
      }, {
        onConflict: 'tenant_id',
      })
      .select()
      .single();

    if (usageError) throw usageError;

    // Log to audit stream
    await supabase
      .from('platform_audit_stream')
      .insert({
        action: 'usage_tracked',
        resource_type: 'platform_usage',
        resource_id: usage.id,
        actor_role: 'monitoring_bot',
        payload: {
          tenant_id,
          rooms_total: roomsTotal || 0,
          bookings_monthly: bookingsMonthly || 0,
          sms_sent: smsSent,
          api_calls: apiCalls || 0,
        },
      });

    console.log(`Usage tracked for tenant ${tenant_id}:`, usage);

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id,
        usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Usage tracking error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
