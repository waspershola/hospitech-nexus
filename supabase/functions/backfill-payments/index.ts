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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[backfill] Starting payment backfill process...');

    // Fetch payments that have stay_folio_id but no folio_transaction yet
    const { data: paymentsToPost, error: fetchError } = await supabase
      .from('payments')
      .select('id, stay_folio_id, amount, transaction_ref, created_at')
      .not('stay_folio_id', 'is', null)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('[backfill] Error fetching payments:', fetchError);
      throw fetchError;
    }

    if (!paymentsToPost || paymentsToPost.length === 0) {
      console.log('[backfill] No payments to post');
      return new Response(
        JSON.stringify({ success: true, message: 'No payments to backfill', posted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[backfill] Found ${paymentsToPost.length} payments to check`);

    let posted = 0;
    let alreadyPosted = 0;
    let failed = 0;
    const errors: any[] = [];

    // Process each payment
    for (const payment of paymentsToPost) {
      try {
        // Check if already posted (idempotency)
        const { data: existingTxn, error: checkError } = await supabase
          .from('folio_transactions')
          .select('id')
          .eq('reference_id', payment.id)
          .eq('reference_type', 'payment')
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error(`[backfill] Error checking transaction for payment ${payment.id}:`, checkError);
          failed++;
          errors.push({ payment_id: payment.id, error: checkError.message });
          continue;
        }

        if (existingTxn) {
          console.log(`[backfill] Payment ${payment.id} already posted, skipping`);
          alreadyPosted++;
          continue;
        }

        // Post payment using RPC
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('folio_post_payment', {
            p_folio_id: payment.stay_folio_id,
            p_payment_id: payment.id,
            p_amount: payment.amount
          });

        if (rpcError) {
          console.error(`[backfill] Failed to post payment ${payment.id}:`, rpcError);
          failed++;
          errors.push({ 
            payment_id: payment.id, 
            transaction_ref: payment.transaction_ref,
            error: rpcError.message 
          });
        } else {
          console.log(`[backfill] Successfully posted payment ${payment.id} (${payment.transaction_ref})`);
          posted++;
        }
      } catch (err: any) {
        console.error(`[backfill] Exception posting payment ${payment.id}:`, err);
        failed++;
        errors.push({ 
          payment_id: payment.id, 
          error: err.message || 'Unknown error' 
        });
      }
    }

    const summary = {
      success: true,
      total_checked: paymentsToPost.length,
      posted,
      already_posted: alreadyPosted,
      failed,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('[backfill] Backfill complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[backfill] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
