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

    const { tenant_id } = await req.json();

    console.log(`[reconcile] Starting reconciliation for tenant ${tenant_id}`);

    // Find payments that need folio linking
    const { data: orphanPayments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        bookings!inner(
          id,
          status,
          stay_folios!inner(id, status)
        )
      `)
      .eq('tenant_id', tenant_id)
      .is('stay_folio_id', null)
      .not('booking_id', 'is', null)
      .eq('bookings.stay_folios.status', 'open');

    if (paymentsError) throw paymentsError;

    const results = {
      total_found: orphanPayments?.length || 0,
      linked: 0,
      failed: [] as any[],
    };

    for (const payment of orphanPayments || []) {
      // Handle both array and object responses from nested query
      const folios = payment.bookings?.stay_folios;
      const folio = Array.isArray(folios) ? folios[0] : folios;
      const folioId = folio?.id;
      
      console.log(`[reconcile] Payment ${payment.id}: folio structure:`, { folios, folio, folioId });
      
      if (!folioId) {
        results.failed.push({
          payment_id: payment.id,
          reason: 'No open folio found'
        });
        continue;
      }

      const { data: postResult, error } = await supabase.rpc('folio_post_payment', {
        p_folio_id: folioId,
        p_payment_id: payment.id,
        p_amount: payment.amount
      });

      if (error || !postResult?.success) {
        console.error(`[reconcile] Failed to link payment ${payment.id}:`, error || postResult);
        results.failed.push({
          payment_id: payment.id,
          transaction_ref: payment.transaction_ref,
          amount: payment.amount,
          error: error?.message || postResult?.error
        });
      } else {
        results.linked++;
        console.log(`[reconcile] Successfully linked payment ${payment.id} to folio ${folioId}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[reconcile] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
