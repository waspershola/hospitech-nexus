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

    const { tenant_id, provider_id, transactions, source, user_id } = await req.json();

    console.log(`Reconciling ${transactions.length} transactions for tenant ${tenant_id}`);

    const results = {
      matched: 0,
      unmatched: 0,
      partial: 0,
    };

    for (const txn of transactions) {
      // Try to find matching payment
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenant_id)
        .or(`transaction_ref.eq.${txn.reference},provider_reference.eq.${txn.reference}`);

      let status = 'unmatched';
      let internal_txn_id = null;

      if (payments && payments.length > 0) {
        const match = payments.find(p => 
          Math.abs(parseFloat(p.amount) - parseFloat(txn.amount)) < 0.01
        );

        if (match) {
          status = 'matched';
          internal_txn_id = match.id;
          results.matched++;
        } else {
          status = 'partial';
          results.partial++;
        }
      } else {
        results.unmatched++;
      }

      // Insert reconciliation record
      const { data: recon } = await supabase
        .from('finance_reconciliation_records')
        .insert([{
          tenant_id,
          provider_id,
          reference: txn.reference,
          internal_txn_id,
          amount: txn.amount,
          status,
          source,
          matched_by: status === 'matched' ? user_id : null,
          reconciled_at: status === 'matched' ? new Date().toISOString() : null,
          raw_data: txn,
        }])
        .select()
        .single();

      // Create audit log
      await supabase.from('finance_reconciliation_audit').insert([{
        tenant_id,
        reconciliation_id: recon.id,
        action: `auto_${status}`,
        performed_by: user_id,
      }]);
    }

    console.log('Reconciliation complete:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error reconciling transactions:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
