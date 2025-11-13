import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Determine provider from URL or webhook payload
    const url = new URL(req.url);
    const payloadText = await req.text();
    const payload = payloadText ? JSON.parse(payloadText) : {};

    console.log('[verify-platform-fee-payment] Webhook received:', { 
      method: req.method,
      url: url.toString(),
      hasPayload: !!payloadText 
    });

    let paymentReference: string | null = null;
    let paymentStatus: 'successful' | 'failed' = 'failed';
    let providerResponse: any = payload;

    // Handle different provider webhook formats
    if (payload.event === 'charge.completed' || payload.status === 'successful') {
      // Flutterwave webhook
      paymentReference = payload.data?.tx_ref || payload.txRef;
      paymentStatus = payload.data?.status === 'successful' || payload.status === 'successful' 
        ? 'successful' 
        : 'failed';
      
      console.log('[verify-platform-fee-payment] Flutterwave webhook:', { 
        txRef: paymentReference, 
        status: paymentStatus 
      });

    } else if (payload.event === 'charge.success' || payload.data?.status === 'success') {
      // Paystack webhook
      paymentReference = payload.data?.reference;
      paymentStatus = payload.data?.status === 'success' ? 'successful' : 'failed';
      
      console.log('[verify-platform-fee-payment] Paystack webhook:', { 
        reference: paymentReference, 
        status: paymentStatus 
      });

    } else if (payload.type?.startsWith('checkout.session')) {
      // Stripe webhook
      paymentReference = payload.data?.object?.client_reference_id || 
                        payload.data?.object?.metadata?.reference;
      paymentStatus = payload.data?.object?.payment_status === 'paid' ? 'successful' : 'failed';
      
      console.log('[verify-platform-fee-payment] Stripe webhook:', { 
        reference: paymentReference, 
        status: paymentStatus 
      });

    } else {
      // Fallback for manual verification or redirect callbacks
      paymentReference = url.searchParams.get('reference') || 
                        url.searchParams.get('tx_ref') ||
                        payload.payment_reference;
      
      const statusParam = url.searchParams.get('status') || payload.status;
      paymentStatus = statusParam === 'successful' || 
                     statusParam === 'success' || 
                     statusParam === 'completed'
        ? 'successful' 
        : 'failed';
      
      console.log('[verify-platform-fee-payment] Manual verification:', { 
        reference: paymentReference, 
        status: paymentStatus 
      });
    }

    if (!paymentReference) {
      console.error('[verify-platform-fee-payment] No payment reference found in webhook');
      return new Response(
        JSON.stringify({ error: 'Payment reference not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('platform_fee_payments')
      .select('*')
      .eq('payment_reference', paymentReference)
      .single();

    if (paymentError || !payment) {
      console.error('[verify-platform-fee-payment] Payment not found:', paymentReference);
      return new Response(
        JSON.stringify({ error: 'Payment record not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('[verify-platform-fee-payment] Processing payment:', payment.id);

    // Update payment record
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('platform_fee_payments')
      .update({
        status: paymentStatus,
        provider_response: providerResponse,
        updated_at: now,
        ...(paymentStatus === 'successful' 
          ? { settled_at: now }
          : { failed_at: now }
        ),
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('[verify-platform-fee-payment] Payment update error:', updateError);
      throw updateError;
    }

    console.log('[verify-platform-fee-payment] Payment updated:', payment.id);

    // Update ledger entries
    if (paymentStatus === 'successful') {
      const { error: ledgerError } = await supabaseAdmin
        .from('platform_fee_ledger')
        .update({
          status: 'settled',
          payment_id: payment.id,
          settled_at: now,
          updated_at: now,
        })
        .in('id', payment.ledger_ids);

      if (ledgerError) {
        console.error('[verify-platform-fee-payment] Ledger update error:', ledgerError);
        throw ledgerError;
      }

      console.log('[verify-platform-fee-payment] Updated', payment.ledger_ids.length, 'ledger entries to settled');

      // Create audit event
      await supabaseAdmin
        .from('finance_audit_events')
        .insert({
          tenant_id: payment.tenant_id,
          event_type: 'platform_fee_payment_successful',
          target_id: payment.id,
          payload: {
            payment_reference: paymentReference,
            total_amount: payment.total_amount,
            provider: payment.provider,
            ledger_count: payment.ledger_ids.length,
          },
        });

      // Generate payment receipt
      try {
        await supabaseAdmin.functions.invoke('generate-payment-receipt', {
          body: { payment_id: payment.id },
        });
        console.log('[verify-platform-fee-payment] Receipt generation initiated');
      } catch (receiptError) {
        console.error('[verify-platform-fee-payment] Receipt error (non-critical):', receiptError);
      }
    } else {
      // Update failed ledger entries
      const { error: ledgerError } = await supabaseAdmin
        .from('platform_fee_ledger')
        .update({
          status: 'failed',
          payment_id: payment.id,
          failed_at: now,
          updated_at: now,
        })
        .in('id', payment.ledger_ids);

      if (ledgerError) {
        console.error('[verify-platform-fee-payment] Ledger update error:', ledgerError);
      }

      // Create audit event for failed payment
      await supabaseAdmin
        .from('finance_audit_events')
        .insert({
          tenant_id: payment.tenant_id,
          event_type: 'platform_fee_payment_failed',
          target_id: payment.id,
          payload: {
            payment_reference: paymentReference,
            total_amount: payment.total_amount,
            provider: payment.provider,
            ledger_count: payment.ledger_ids.length,
          },
        });
    }

    // For webhook responses, return 200 OK
    // For redirect URLs, redirect to success/failure page
    if (req.headers.get('content-type')?.includes('application/json') || 
        req.headers.get('x-paystack-signature') ||
        req.headers.get('verif-hash') ||
        req.headers.get('stripe-signature')) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          payment_id: payment.id, 
          status: paymentStatus 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Redirect to tenant dashboard with status
      const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://app.') || '';
      const redirectUrl = `${baseUrl}/dashboard/finance-center?payment=${paymentStatus}&ref=${paymentReference}`;
      
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectUrl },
      });
    }
  } catch (error) {
    console.error('[verify-platform-fee-payment] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
