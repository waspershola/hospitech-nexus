// PHASE 2: Reconciliation Edge Function
// Purpose: Fix all orphaned payments where stay_folio_id is NULL
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[reconcile] Starting folio payment reconciliation');

    // Find all orphaned payments (stay_folio_id is NULL but booking_id exists)
    const { data: orphanedPayments, error: queryError } = await supabase
      .from('payments')
      .select('id, booking_id, amount, transaction_ref, created_at, tenant_id')
      .is('stay_folio_id', null)
      .not('booking_id', 'is', null)
      .eq('status', 'completed')
      .order('created_at', { ascending: true });

    if (queryError) {
      console.error('[reconcile] Error querying orphaned payments:', queryError);
      throw queryError;
    }

    console.log(`[reconcile] Found ${orphanedPayments?.length || 0} orphaned payments`);

    const results = {
      total: orphanedPayments?.length || 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[],
    };

    // Process each orphaned payment
    for (const payment of orphanedPayments || []) {
      console.log(`[reconcile] Processing payment ${payment.id} for booking ${payment.booking_id}`);

      // Find the open folio for this booking
      const { data: folio, error: folioError } = await supabase
        .from('stay_folios')
        .select('id, status, booking_id')
        .eq('booking_id', payment.booking_id)
        .eq('status', 'open')
        .maybeSingle();

      if (folioError) {
        console.error(`[reconcile] Error finding folio for payment ${payment.id}:`, folioError);
        results.failed++;
        results.details.push({
          payment_id: payment.id,
          transaction_ref: payment.transaction_ref,
          status: 'error',
          error: 'Failed to query folio',
        });
        continue;
      }

      if (!folio) {
        console.log(`[reconcile] No open folio found for payment ${payment.id} - skipping`);
        results.skipped++;
        results.details.push({
          payment_id: payment.id,
          transaction_ref: payment.transaction_ref,
          status: 'skipped',
          reason: 'No open folio found for booking',
        });
        continue;
      }

      // Post payment to folio using RPC
      const { data: rpcResult, error: rpcError } = await supabase.rpc('folio_post_payment', {
        p_folio_id: String(folio.id),
        p_payment_id: String(payment.id),
        p_amount: payment.amount,
      });

      if (rpcError) {
        console.error(`[reconcile] Failed to post payment ${payment.id} to folio:`, rpcError);
        results.failed++;
        results.details.push({
          payment_id: payment.id,
          transaction_ref: payment.transaction_ref,
          folio_id: folio.id,
          status: 'error',
          error: rpcError.message,
        });
      } else {
        console.log(`[reconcile] Successfully posted payment ${payment.id} to folio ${folio.id}`);
        results.successful++;
        results.details.push({
          payment_id: payment.id,
          transaction_ref: payment.transaction_ref,
          folio_id: folio.id,
          amount: payment.amount,
          status: 'success',
        });
      }
    }

    console.log('[reconcile] Reconciliation complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reconciliation complete: ${results.successful} successful, ${results.failed} failed, ${results.skipped} skipped`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[reconcile] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
