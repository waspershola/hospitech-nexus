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

    console.log('[night-audit-run] NIGHT-AUDIT-V2-MULTI-FOLIO: Starting', { tenant_id, audit_date });

    // Calculate folio statistics by type
    const { data: folioStats, error: statsError } = await supabase.rpc(
      'calculate_folio_stats_by_type',
      { p_tenant_id: tenant_id, p_audit_date: audit_date }
    );

    if (statsError) {
      console.error('[night-audit-run] NIGHT-AUDIT-V2: Stats calculation failed', statsError);
    }

    console.log('[night-audit-run] NIGHT-AUDIT-V2: Folio stats by type', folioStats);

    // Create audit run with multi-folio data
    const { data: auditRun, error: runError } = await supabase
      .from('night_audit_runs')
      .insert({
        tenant_id,
        audit_date,
        cutoff_time: new Date(`${audit_date}T23:59:59Z`),
        status: 'running',
        run_by: req.headers.get('user-id'),
        folios_by_type: folioStats || {},
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

      // Calculate revenue by folio type
      const revenueByType: Record<string, number> = {};
      if (folioStats && typeof folioStats === 'object') {
        for (const [type, stats] of Object.entries(folioStats as Record<string, any>)) {
          revenueByType[type] = stats.revenue || 0;
        }
      }

      // Create ledger batch for this audit period
      const { data: ledgerBatch, error: batchError } = await supabase
        .from('ledger_batches')
        .insert({
          tenant_id,
          batch_type: 'night_audit',
          batch_date: audit_date,
          status: 'closed',
          metadata: {
            night_audit_run_id: auditRun.id,
            total_revenue: totalRevenue,
            total_folios: folioCount || 0,
            revenue_by_folio_type: revenueByType,
            cutoff_time: `${audit_date}T23:59:59Z`,
            created_at: new Date().toISOString(),
            version: 'LEDGER-NIGHT-AUDIT-V1'
          }
        })
        .select()
        .single();

      if (batchError) {
        console.error('[night-audit-run] LEDGER-NIGHT-AUDIT-V1: Failed to create ledger batch', batchError);
      } else {
        console.log('[night-audit-run] LEDGER-NIGHT-AUDIT-V1: Created ledger batch', { batch_id: ledgerBatch.id });
      }

      // Mark complete
      await supabase
        .from('night_audit_runs')
        .update({ 
          status: 'completed', 
          completed_at: new Date(),
          total_revenue: totalRevenue,
          total_folios_processed: folioCount || 0,
          revenue_by_folio_type: revenueByType,
        })
        .eq('id', auditRun.id);

      console.log('[night-audit-run] NIGHT-AUDIT-V2: Completed', { 
        total_revenue: totalRevenue,
        folios: folioCount,
        revenue_by_type: revenueByType
      });

      return new Response(JSON.stringify({ 
        success: true, 
        auditRun: { ...auditRun, total_revenue: totalRevenue, revenue_by_folio_type: revenueByType }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await supabase
        .from('night_audit_runs')
        .update({ status: 'failed', error_message: errorMessage })
        .eq('id', auditRun.id);

      throw error;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
