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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { provider_id, start_date, end_date, tenant_id } = await req.json();

    console.log('Auto-sync reconciliation for provider:', provider_id);

    if (!provider_id || !tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: provider_id, tenant_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get provider details
    const { data: provider } = await supabase
      .from('finance_providers')
      .select('*')
      .eq('id', provider_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (!provider) {
      return new Response(
        JSON.stringify({ success: false, error: 'Provider not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get provider rules to check if auto-reconcile is enabled
    const { data: rules } = await supabase
      .from('finance_provider_rules')
      .select('auto_reconcile')
      .eq('provider_id', provider_id)
      .eq('tenant_id', tenant_id);

    const autoReconcileEnabled = rules?.some(r => r.auto_reconcile) || false;

    // Get internal payments for this provider
    const { data: payments } = await supabase
      .from('payments')
      .select('id, transaction_ref, provider_reference, amount, created_at, status')
      .eq('tenant_id', tenant_id)
      .eq('method_provider', provider.name)
      .gte('created_at', start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('created_at', end_date || new Date().toISOString());

    console.log(`Found ${payments?.length || 0} internal payments for provider ${provider.name}`);

    // Here you would normally fetch from provider API
    // For now, we'll simulate the process
    // In production, this would call provider-specific APIs like:
    // - Moniepoint: fetch transactions from their API
    // - Opay: fetch from their API
    // - Flutterwave: fetch from their API
    
    const simulatedExternalTransactions = payments?.map(p => ({
      reference: p.provider_reference || p.transaction_ref,
      amount: p.amount,
      date: p.created_at,
      status: 'success',
    })) || [];

    let matchedCount = 0;
    let unmatchedCount = 0;
    const matchedRecords = [];

    for (const extTxn of simulatedExternalTransactions) {
      // Check if reconciliation record already exists
      const { data: existingRecord } = await supabase
        .from('finance_reconciliation_records')
        .select('id, status')
        .eq('reference', extTxn.reference)
        .eq('tenant_id', tenant_id)
        .maybeSingle();

      if (existingRecord) {
        console.log('Reconciliation record already exists:', extTxn.reference);
        continue;
      }

      // Try to match with internal payment
      const matchedPayment = payments?.find(
        p => (p.provider_reference === extTxn.reference || p.transaction_ref === extTxn.reference) &&
             Math.abs(Number(p.amount) - extTxn.amount) < 0.01
      );

      const status = matchedPayment ? 'matched' : 'unmatched';
      
      // Create reconciliation record
      const { data: reconRecord, error: reconError } = await supabase
        .from('finance_reconciliation_records')
        .insert([{
          tenant_id,
          provider_id,
          reference: extTxn.reference,
          amount: extTxn.amount,
          status,
          source: 'api',
          internal_txn_id: matchedPayment?.id || null,
          matched_by: autoReconcileEnabled && matchedPayment ? user.id : null,
          reconciled_at: autoReconcileEnabled && matchedPayment ? new Date().toISOString() : null,
          raw_data: extTxn,
        }])
        .select()
        .single();

      if (!reconError && reconRecord) {
        if (status === 'matched') {
          matchedCount++;
          matchedRecords.push(reconRecord);

          // Create audit log for matched transaction
          await supabase.from('finance_reconciliation_audit').insert([{
            tenant_id,
            reconciliation_id: reconRecord.id,
            action: autoReconcileEnabled ? 'auto-matched' : 'matched',
            performed_by: user.id,
          }]);
        } else {
          unmatchedCount++;
        }
      }
    }

    console.log(`Reconciliation complete: ${matchedCount} matched, ${unmatchedCount} unmatched`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_processed: simulatedExternalTransactions.length,
          matched: matchedCount,
          unmatched: unmatchedCount,
          auto_reconcile_enabled: autoReconcileEnabled,
        },
        matched_records: matchedRecords,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in auto-sync:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
