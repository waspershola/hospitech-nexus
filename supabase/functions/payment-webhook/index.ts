import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature, verif-hash',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const provider = url.searchParams.get('provider');

    if (!provider) {
      throw new Error('Provider parameter is required');
    }

    const body = await req.json();
    console.log(`Webhook received for provider: ${provider}`, body);

    let billingId: string | null = null;
    let status: 'completed' | 'failed' = 'failed';
    let transactionId: string | null = null;

    // Process webhook based on provider
    switch (provider) {
      case 'stripe':
        ({ billingId, status, transactionId } = await processStripeWebhook(req, body, supabase));
        break;
      case 'paystack':
        ({ billingId, status, transactionId } = await processPaystackWebhook(req, body, supabase));
        break;
      case 'flutterwave':
        ({ billingId, status, transactionId } = await processFlutterwaveWebhook(req, body, supabase));
        break;
      case 'monnify':
        ({ billingId, status, transactionId } = await processMonnifyWebhook(req, body, supabase));
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    if (!billingId) {
      console.error('Could not extract billing ID from webhook');
      return new Response(JSON.stringify({ error: 'Invalid webhook data' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Update billing record
    const { data: billing, error: billingError } = await supabase
      .from('platform_billing')
      .update({
        status,
        paid_at: status === 'completed' ? new Date().toISOString() : null,
        transaction_id: transactionId,
      })
      .eq('id', billingId)
      .select()
      .single();

    if (billingError) {
      console.error('Failed to update billing:', billingError);
      throw billingError;
    }

    // If payment successful, credit SMS units
    if (status === 'completed' && billing.addon_id) {
      const { data: addon } = await supabase
        .from('platform_marketplace_addons')
        .select('units_available')
        .eq('id', billing.addon_id)
        .single();

      if (addon) {
        // Get or create tenant SMS credits record
        const { data: existingCredits } = await supabase
          .from('tenant_sms_credits')
          .select('*')
          .eq('tenant_id', billing.tenant_id)
          .single();

        if (existingCredits) {
          await supabase
            .from('tenant_sms_credits')
            .update({
              credits_available: existingCredits.credits_available + addon.units_available,
              total_purchased: existingCredits.total_purchased + addon.units_available,
            })
            .eq('tenant_id', billing.tenant_id);
        } else {
          await supabase
            .from('tenant_sms_credits')
            .insert({
              tenant_id: billing.tenant_id,
              credits_available: addon.units_available,
              credits_used: 0,
              total_purchased: addon.units_available,
            });
        }

        // Log purchase
        await supabase.from('platform_audit_stream').insert({
          event_type: 'addon_purchase_completed',
          metadata: {
            billing_id: billingId,
            addon_id: billing.addon_id,
            tenant_id: billing.tenant_id,
            units_credited: addon.units_available,
            amount: billing.amount,
            provider,
          },
        });
      }
    }

    console.log(`Payment webhook processed: ${billingId} - ${status}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Webhook processing failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function processStripeWebhook(req: Request, body: any, supabase: any) {
  const signature = req.headers.get('stripe-signature');
  
  // In production, verify signature here
  // For now, we'll process the event
  
  let billingId: string | null = null;
  let status: 'completed' | 'failed' = 'failed';
  let transactionId: string | null = null;

  if (body.type === 'checkout.session.completed') {
    const session = body.data.object;
    billingId = session.metadata?.billing_id;
    transactionId = session.id;
    status = session.payment_status === 'paid' ? 'completed' : 'failed';
  }

  return { billingId, status, transactionId };
}

async function processPaystackWebhook(req: Request, body: any, supabase: any) {
  const signature = req.headers.get('x-paystack-signature');
  
  // Verify signature in production
  
  let billingId: string | null = null;
  let status: 'completed' | 'failed' = 'failed';
  let transactionId: string | null = null;

  if (body.event === 'charge.success') {
    const data = body.data;
    billingId = data.metadata?.billing_id;
    transactionId = data.reference;
    status = data.status === 'success' ? 'completed' : 'failed';
  }

  return { billingId, status, transactionId };
}

async function processFlutterwaveWebhook(req: Request, body: any, supabase: any) {
  const signature = req.headers.get('verif-hash');
  
  // Verify signature in production
  
  let billingId: string | null = null;
  let status: 'completed' | 'failed' = 'failed';
  let transactionId: string | null = null;

  if (body.event === 'charge.completed') {
    const data = body.data;
    billingId = data.meta?.billing_id;
    transactionId = data.tx_ref;
    status = data.status === 'successful' ? 'completed' : 'failed';
  }

  return { billingId, status, transactionId };
}

async function processMonnifyWebhook(req: Request, body: any, supabase: any) {
  // Monnify sends webhook data directly
  
  let billingId: string | null = null;
  let status: 'completed' | 'failed' = 'failed';
  let transactionId: string | null = null;

  if (body.eventType === 'SUCCESSFUL_TRANSACTION') {
    const data = body.eventData;
    // Extract billing_id from payment reference
    const match = data.paymentReference?.match(/addon_([^_]+)_/);
    billingId = match ? match[1] : null;
    transactionId = data.transactionReference;
    status = data.paymentStatus === 'PAID' ? 'completed' : 'failed';
  }

  return { billingId, status, transactionId };
}
