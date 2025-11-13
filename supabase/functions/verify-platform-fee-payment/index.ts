import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  payment_reference: string;
  status: 'successful' | 'failed';
  provider_response?: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const webhookData = await req.json();
    console.log('[verify-platform-fee-payment] Webhook received:', JSON.stringify(webhookData, null, 2));

    const { payment_reference, status, provider_response } = webhookData as WebhookPayload;

    if (!payment_reference) {
      throw new Error('Missing payment_reference in webhook');
    }

    // 1. Fetch payment record
    const { data: payment, error: paymentError } = await supabase
      .from('platform_fee_payments')
      .select('*')
      .eq('payment_reference', payment_reference)
      .single();

    if (paymentError || !payment) {
      console.error('[verify-platform-fee-payment] Payment not found:', payment_reference);
      throw new Error('Payment record not found');
    }

    console.log('[verify-platform-fee-payment] Processing payment:', payment.id, 'Status:', status);

    // 2. TODO: Phase 5 - Verify payment with provider API
    // For now, trust the webhook data (in production, always verify with provider)
    
    const now = new Date().toISOString();
    const isSuccessful = status === 'successful';

    // 3. Update payment record
    const { error: updatePaymentError } = await supabase
      .from('platform_fee_payments')
      .update({
        status,
        provider_response,
        updated_at: now,
        ...(isSuccessful ? { settled_at: now } : { failed_at: now })
      })
      .eq('id', payment.id);

    if (updatePaymentError) {
      console.error('[verify-platform-fee-payment] Error updating payment:', updatePaymentError);
      throw new Error(`Failed to update payment: ${updatePaymentError.message}`);
    }

    // 4. Update ledger entries
    const ledgerStatus = isSuccessful ? 'settled' : 'failed';
    const ledgerTimestamp = isSuccessful ? { settled_at: now } : { failed_at: now };

    const { error: updateLedgerError } = await supabase
      .from('platform_fee_ledger')
      .update({
        status: ledgerStatus,
        payment_id: payment.id,
        ...ledgerTimestamp,
        updated_at: now
      })
      .in('id', payment.ledger_ids);

    if (updateLedgerError) {
      console.error('[verify-platform-fee-payment] Error updating ledger:', updateLedgerError);
      throw new Error(`Failed to update ledger: ${updateLedgerError.message}`);
    }

    console.log('[verify-platform-fee-payment] Updated', payment.ledger_ids.length, 'ledger entries to', ledgerStatus);

    // 5. Create audit event
    const { error: auditError } = await supabase
      .from('finance_audit_events')
      .insert({
        tenant_id: payment.tenant_id,
        event_type: isSuccessful ? 'platform_fee_payment_successful' : 'platform_fee_payment_failed',
        target_id: payment.id,
        payload: {
          payment_reference,
          total_amount: payment.total_amount,
          provider: payment.provider,
          ledger_count: payment.ledger_ids.length,
          status
        }
      });

    if (auditError) {
      console.error('[verify-platform-fee-payment] Audit error (non-critical):', auditError);
    }

    // 6. If successful, generate and send receipt
    if (isSuccessful) {
      console.log('[verify-platform-fee-payment] Payment successful, generating receipt...');
      
      try {
        await supabase.functions.invoke('generate-payment-receipt', {
          body: {
            payment_id: payment.id,
            tenant_id: payment.tenant_id
          }
        });
        console.log('[verify-platform-fee-payment] Receipt generation initiated');
      } catch (receiptError) {
        console.error('[verify-platform-fee-payment] Receipt error (non-critical):', receiptError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        status: ledgerStatus,
        message: isSuccessful 
          ? 'Payment verified and fees settled successfully' 
          : 'Payment failed, ledger updated'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-platform-fee-payment] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to verify payment';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
