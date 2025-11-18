import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

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

    const { tenant_id, audit_date } = await req.json();

    // Create audit run
    const { data: auditRun, error: runError } = await supabase
      .from('night_audit_runs')
      .insert({
        tenant_id,
        audit_date,
        cutoff_time: new Date(`${audit_date}T23:59:59Z`),
        status: 'running',
        run_by: req.headers.get('user-id')
      })
      .select()
      .single();

    if (runError) throw runError;

    try {
      // Calculate daily revenue
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('tenant_id', tenant_id)
        .gte('created_at', `${audit_date}T00:00:00Z`)
        .lte('created_at', `${audit_date}T23:59:59Z`)
        .eq('status', 'completed');

      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Count processed folios
      const { count: folioCount } = await supabase
        .from('stay_folios')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant_id)
        .eq('status', 'open');

      // Mark complete
      await supabase
        .from('night_audit_runs')
        .update({ 
          status: 'completed', 
          completed_at: new Date(),
          total_revenue: totalRevenue,
          total_folios_processed: folioCount || 0
        })
        .eq('id', auditRun.id);

      return new Response(JSON.stringify({ 
        success: true, 
        auditRun: { ...auditRun, total_revenue: totalRevenue }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (error) {
      await supabase
        .from('night_audit_runs')
        .update({ status: 'failed', error_message: error.message })
        .eq('id', auditRun.id);

      throw error;
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
