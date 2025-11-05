import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UsageTrackingData {
  tenant_id: string;
  metric_type: 'sms_sent' | 'storage_used' | 'api_calls' | 'users_active' | 'bookings_created';
  quantity: number;
  metadata?: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // TRACK USAGE
    if (req.method === 'POST') {
      const body: UsageTrackingData = await req.json();

      // Validate required fields
      if (!body.tenant_id || !body.metric_type || body.quantity === undefined) {
        throw new Error('Missing required fields: tenant_id, metric_type, quantity');
      }

      // Get current billing period for tenant
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Record usage
      const { data: usage, error: usageError } = await supabase
        .from('platform_usage_records')
        .insert({
          tenant_id: body.tenant_id,
          metric_type: body.metric_type,
          quantity: body.quantity,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          metadata: body.metadata || {},
        })
        .select()
        .single();

      if (usageError) throw usageError;

      // Update aggregated usage
      const { data: existing } = await supabase
        .from('platform_usage_aggregates')
        .select('*')
        .eq('tenant_id', body.tenant_id)
        .eq('metric_type', body.metric_type)
        .eq('period_start', periodStart.toISOString())
        .single();

      if (existing) {
        // Update existing aggregate
        await supabase
          .from('platform_usage_aggregates')
          .update({
            total_quantity: existing.total_quantity + body.quantity,
            record_count: existing.record_count + 1,
          })
          .eq('id', existing.id);
      } else {
        // Create new aggregate
        await supabase
          .from('platform_usage_aggregates')
          .insert({
            tenant_id: body.tenant_id,
            metric_type: body.metric_type,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
            total_quantity: body.quantity,
            record_count: 1,
          });
      }

      console.log(`Usage tracked: ${body.tenant_id} - ${body.metric_type}: ${body.quantity}`);

      return new Response(JSON.stringify(usage), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // GET USAGE for tenant
    if (req.method === 'GET') {
      const tenantId = url.searchParams.get('tenant_id');
      const metricType = url.searchParams.get('metric_type');
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');

      if (!tenantId) {
        throw new Error('tenant_id is required');
      }

      // Check authorization - user must be admin or belong to tenant
      const { data: platformUser } = await supabase
        .from('platform_users')
        .select('role')
        .eq('id', user.id)
        .single();

      const isPlatformAdmin = platformUser?.role === 'super_admin' || platformUser?.role === 'billing_bot';

      if (!isPlatformAdmin) {
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();

        if (userRole?.tenant_id !== tenantId) {
          throw new Error('Forbidden: Cannot view usage for other tenants');
        }
      }

      let query = supabase
        .from('platform_usage_aggregates')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('period_start', { ascending: false });

      if (metricType) {
        query = query.eq('metric_type', metricType);
      }

      if (startDate) {
        query = query.gte('period_start', startDate);
      }

      if (endDate) {
        query = query.lte('period_end', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );

  } catch (error) {
    console.error('Usage tracking error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
