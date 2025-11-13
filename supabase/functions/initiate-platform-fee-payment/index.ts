import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Payment gateway integration functions
async function initiateFlutterwavePayment(
  apiKey: string,
  amount: number,
  reference: string,
  tenantEmail: string,
  tenantName: string
): Promise<{ payment_url: string; provider: string }> {
  const response = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: reference,
      amount: amount.toString(),
      currency: 'NGN',
      redirect_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-platform-fee-payment`,
      payment_options: 'card,banktransfer,ussd',
      customer: {
        email: tenantEmail,
        name: tenantName,
      },
      customizations: {
        title: 'Platform Fee Payment',
        description: `Payment for platform fees - ${reference}`,
        logo: '',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Flutterwave] Payment initiation failed:', error);
    throw new Error(`Flutterwave payment initiation failed: ${error}`);
  }

  const data = await response.json();
  console.log('[Flutterwave] Payment initiated:', data);

  return {
    payment_url: data.data.link,
    provider: 'flutterwave',
  };
}

async function initiatePaystackPayment(
  apiKey: string,
  amount: number,
  reference: string,
  tenantEmail: string
): Promise<{ payment_url: string; provider: string }> {
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reference,
      amount: amount * 100, // Paystack expects amount in kobo
      email: tenantEmail,
      currency: 'NGN',
      callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-platform-fee-payment`,
      metadata: {
        payment_type: 'platform_fee',
        reference,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Paystack] Payment initiation failed:', error);
    throw new Error(`Paystack payment initiation failed: ${error}`);
  }

  const data = await response.json();
  console.log('[Paystack] Payment initiated:', data);

  return {
    payment_url: data.data.authorization_url,
    provider: 'paystack',
  };
}

async function initiateStripePayment(
  apiKey: string,
  amount: number,
  reference: string,
  tenantEmail: string,
  tenantName: string
): Promise<{ payment_url: string; provider: string }> {
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price_data][currency]': 'ngn',
      'line_items[0][price_data][unit_amount]': (amount * 100).toString(), // Stripe expects amount in kobo
      'line_items[0][price_data][product_data][name]': 'Platform Fee Payment',
      'line_items[0][price_data][product_data][description]': `Payment for platform fees - ${reference}`,
      'line_items[0][quantity]': '1',
      'mode': 'payment',
      'success_url': `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-platform-fee-payment?session_id={CHECKOUT_SESSION_ID}&reference=${reference}`,
      'cancel_url': `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-platform-fee-payment?reference=${reference}&status=cancelled`,
      'customer_email': tenantEmail,
      'client_reference_id': reference,
      'metadata[payment_type]': 'platform_fee',
      'metadata[reference]': reference,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Stripe] Payment initiation failed:', error);
    throw new Error(`Stripe payment initiation failed: ${error}`);
  }

  const data = await response.json();
  console.log('[Stripe] Payment initiated:', data);

  return {
    payment_url: data.url,
    provider: 'stripe',
  };
}

interface PaymentInitiationRequest {
  tenant_id: string;
  payment_method_id: string;
  ledger_ids?: string[]; // Optional: for retry attempts with specific fee entries
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

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Parse request body
    const requestData = await req.json() as PaymentInitiationRequest;
    
    if (!requestData) {
      throw new Error('Invalid request body');
    }

    const { tenant_id, payment_method_id, ledger_ids } = requestData;

    console.log('[initiate-platform-fee-payment] Starting payment initiation for tenant:', tenant_id);
    if (ledger_ids && ledger_ids.length > 0) {
      console.log('[initiate-platform-fee-payment] Retry mode: processing specific ledger entries:', ledger_ids);
    }

    // 1. Fetch outstanding fees (pending + billed status)
    // If ledger_ids provided (retry mode), fetch only those specific entries
    // Otherwise, fetch all outstanding fees for the tenant
    let feesQuery = supabase
      .from('platform_fee_ledger')
      .select('*')
      .eq('tenant_id', tenant_id);

    if (ledger_ids && ledger_ids.length > 0) {
      // Retry mode: fetch specific failed fee entries
      feesQuery = feesQuery.in('id', ledger_ids);
    } else {
      // Normal mode: fetch all outstanding fees
      feesQuery = feesQuery.in('status', ['pending', 'billed']);
    }

    const { data: fees, error: feesError } = await feesQuery;

    if (feesError) {
      console.error('[initiate-platform-fee-payment] Error fetching fees:', feesError);
      throw new Error(`Failed to fetch outstanding fees: ${feesError.message}`);
    }

    if (!fees || fees.length === 0) {
      const errorMessage = ledger_ids && ledger_ids.length > 0 
        ? 'No fees found for retry (fees may have already been paid)'
        : 'No outstanding fees to pay';
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 2. Calculate total amount
    const totalAmount = fees.reduce((sum, fee) => sum + Number(fee.fee_amount), 0);
    const isRetry = ledger_ids && ledger_ids.length > 0;
    console.log(
      isRetry 
        ? `[initiate-platform-fee-payment] Retry payment: ${totalAmount} from ${fees.length} fees`
        : `[initiate-platform-fee-payment] New payment: ${totalAmount} from ${fees.length} fees`
    );

     // 3. Fetch payment provider details including API keys
    const { data: provider, error: providerError } = await supabase
      .from('platform_payment_providers')
      .select('id, provider_name, provider_type, api_key_encrypted, api_secret_encrypted')
      .eq('id', payment_method_id)
      .eq('is_active', true)
      .single();

    if (providerError || !provider) {
      console.error('[initiate-platform-fee-payment] Error fetching provider:', providerError);
      throw new Error('Payment provider not found or inactive');
    }

    if (!provider.api_key_encrypted) {
      console.error('[initiate-platform-fee-payment] Provider missing API key');
      throw new Error('Payment provider not configured with API key');
    }

    console.log('[initiate-platform-fee-payment] Using provider:', provider.provider_type);

    // 4. Generate unique payment reference
    const timestamp = Date.now();
    const tenantSlug = tenant_id.slice(0, 8);
    const paymentReference = `PF-${timestamp}-${tenantSlug}`;

    // 5. Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('platform_fee_payments')
      .insert({
        tenant_id,
        payment_reference: paymentReference,
        total_amount: totalAmount,
        payment_method_id,
        provider: provider.provider_type,
        ledger_ids: fees.map(f => f.id),
        status: 'initiated',
        metadata: {
          fee_count: fees.length,
          initiated_at: new Date().toISOString(),
          is_retry: isRetry,
        }
      })
      .select()
      .single();

    if (paymentError) {
      console.error('[initiate-platform-fee-payment] Error creating payment record:', paymentError);
      throw new Error(`Failed to create payment record: ${paymentError.message}`);
    }

    console.log('[initiate-platform-fee-payment] Payment record created:', payment.id);

    // 6. Get tenant details for payment metadata
    const { data: platformTenant, error: platformTenantError } = await supabase
      .from('platform_tenants')
      .select('owner_email')
      .eq('id', tenant_id)
      .single();

    if (platformTenantError || !platformTenant) {
      console.error('[initiate-platform-fee-payment] Error fetching platform tenant:', platformTenantError);
      throw new Error('Tenant not found');
    }

    const { data: tenantInfo } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenant_id)
      .single();

    // 7. Initiate payment with actual payment gateway
    let paymentUrl: string;
    let providerType: string;

    try {
      const tenantEmail = platformTenant.owner_email || 'noreply@hotel.com';
      const tenantName = tenantInfo?.name || 'Hotel';

      switch (provider.provider_type) {
        case 'flutterwave': {
          const result = await initiateFlutterwavePayment(
            provider.api_key_encrypted,
            totalAmount,
            paymentReference,
            tenantEmail,
            tenantName
          );
          paymentUrl = result.payment_url;
          providerType = result.provider;
          break;
        }

        case 'paystack': {
          const result = await initiatePaystackPayment(
            provider.api_key_encrypted,
            totalAmount,
            paymentReference,
            tenantEmail
          );
          paymentUrl = result.payment_url;
          providerType = result.provider;
          break;
        }

        case 'stripe': {
          const result = await initiateStripePayment(
            provider.api_key_encrypted,
            totalAmount,
            paymentReference,
            tenantEmail,
            tenantName
          );
          paymentUrl = result.payment_url;
          providerType = result.provider;
          break;
        }

        default:
          throw new Error(`Unsupported payment provider: ${provider.provider_type}`);
      }

      console.log('[initiate-platform-fee-payment] Payment URL generated:', paymentUrl);

      // Update payment record with payment URL
      const { error: updateError } = await supabase
        .from('platform_fee_payments')
        .update({
          metadata: {
            fee_count: fees.length,
            initiated_at: new Date().toISOString(),
            payment_url: paymentUrl,
          }
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error('[initiate-platform-fee-payment] Error updating payment record:', updateError);
      }

    } catch (error) {
      console.error('[initiate-platform-fee-payment] Payment gateway error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment gateway initialization failed';
      throw new Error(`Payment gateway error: ${errorMessage}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        payment_reference: paymentReference,
        payment_url: paymentUrl,
        total_amount: totalAmount,
        provider: providerType,
        fee_count: fees.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[initiate-platform-fee-payment] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to initiate payment';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
