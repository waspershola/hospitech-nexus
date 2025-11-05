import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PurchaseRequest {
  addon_id: string;
  payment_provider_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's tenant
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!userRole?.tenant_id) {
      throw new Error('User has no tenant assigned');
    }

    const body: PurchaseRequest = await req.json();
    const { addon_id, payment_provider_id } = body;

    // Validate inputs
    if (!addon_id || !payment_provider_id) {
      throw new Error('Missing required fields: addon_id, payment_provider_id');
    }

    // Get addon details
    const { data: addon, error: addonError } = await supabase
      .from('platform_marketplace_addons')
      .select('*')
      .eq('id', addon_id)
      .eq('is_active', true)
      .single();

    if (addonError || !addon) {
      throw new Error('Addon not found or inactive');
    }

    // Get payment provider
    const { data: provider, error: providerError } = await supabase
      .from('platform_payment_providers')
      .select('*')
      .eq('id', payment_provider_id)
      .eq('is_active', true)
      .single();

    if (providerError || !provider) {
      throw new Error('Payment provider not found or inactive');
    }

    // Calculate total amount
    const totalAmount = addon.price;

    // Create billing record
    const { data: billing, error: billingError } = await supabase
      .from('platform_billing')
      .insert({
        tenant_id: userRole.tenant_id,
        addon_id: addon.id,
        payment_provider_id: provider.id,
        amount: totalAmount,
        currency: addon.currency || 'USD',
        status: 'pending',
        billing_type: 'addon_purchase',
      })
      .select()
      .single();

    if (billingError) {
      console.error('Billing record creation error:', billingError);
      throw new Error('Failed to create billing record');
    }

    // Process payment based on provider type
    let paymentResult;
    
    switch (provider.provider_type) {
      case 'stripe':
        paymentResult = await processStripePayment(billing, addon, provider);
        break;
      case 'paystack':
        paymentResult = await processPaystackPayment(billing, addon, provider);
        break;
      case 'flutterwave':
        paymentResult = await processFlutterwavePayment(billing, addon, provider);
        break;
      case 'monnify':
        paymentResult = await processMonnifyPayment(billing, addon, provider);
        break;
      default:
        throw new Error(`Unsupported payment provider: ${provider.provider_type}`);
    }

    // Update billing record with payment details
    await supabase
      .from('platform_billing')
      .update({
        transaction_id: paymentResult.transaction_id,
        payment_metadata: paymentResult.metadata,
      })
      .eq('id', billing.id);

    // Log audit event
    await supabase.from('platform_audit_stream').insert({
      event_type: 'addon_purchase_initiated',
      user_id: user.id,
      metadata: {
        addon_id: addon.id,
        billing_id: billing.id,
        amount: totalAmount,
        provider: provider.provider_type,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      billing_id: billing.id,
      payment_url: paymentResult.payment_url,
      transaction_id: paymentResult.transaction_id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Addon purchase error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Payment processor functions
async function processStripePayment(billing: any, addon: any, provider: any) {
  const stripeKey = provider.api_secret_encrypted;
  
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'mode': 'payment',
      'success_url': `${Deno.env.get('SUPABASE_URL')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${Deno.env.get('SUPABASE_URL')}/payment/cancel`,
      'line_items[0][price_data][currency]': addon.currency || 'usd',
      'line_items[0][price_data][product_data][name]': addon.name,
      'line_items[0][price_data][product_data][description]': addon.description,
      'line_items[0][price_data][unit_amount]': Math.round(addon.price * 100).toString(),
      'line_items[0][quantity]': '1',
      'metadata[billing_id]': billing.id,
    }),
  });

  const session = await response.json();
  
  if (!response.ok) {
    throw new Error(`Stripe error: ${session.error?.message || 'Unknown error'}`);
  }

  return {
    transaction_id: session.id,
    payment_url: session.url,
    metadata: { stripe_session: session },
  };
}

async function processPaystackPayment(billing: any, addon: any, provider: any) {
  const paystackKey = provider.api_secret_encrypted;
  
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${paystackKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Math.round(addon.price * 100), // In kobo
      email: billing.tenant_id, // Should get tenant email
      currency: addon.currency || 'NGN',
      metadata: {
        billing_id: billing.id,
        addon_name: addon.name,
      },
      callback_url: `${Deno.env.get('SUPABASE_URL')}/payment/success`,
    }),
  });

  const result = await response.json();
  
  if (!result.status) {
    throw new Error(`Paystack error: ${result.message || 'Unknown error'}`);
  }

  return {
    transaction_id: result.data.reference,
    payment_url: result.data.authorization_url,
    metadata: { paystack_reference: result.data.reference },
  };
}

async function processFlutterwavePayment(billing: any, addon: any, provider: any) {
  const flwKey = provider.api_secret_encrypted;
  
  const response = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${flwKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: `addon_${billing.id}_${Date.now()}`,
      amount: addon.price,
      currency: addon.currency || 'NGN',
      redirect_url: `${Deno.env.get('SUPABASE_URL')}/payment/success`,
      payment_options: 'card,banktransfer,ussd',
      customer: {
        email: billing.tenant_id, // Should get tenant email
        name: addon.name,
      },
      customizations: {
        title: addon.name,
        description: addon.description,
      },
      meta: {
        billing_id: billing.id,
      },
    }),
  });

  const result = await response.json();
  
  if (result.status !== 'success') {
    throw new Error(`Flutterwave error: ${result.message || 'Unknown error'}`);
  }

  return {
    transaction_id: result.data.tx_ref,
    payment_url: result.data.link,
    metadata: { flutterwave_reference: result.data.tx_ref },
  };
}

async function processMonnifyPayment(billing: any, addon: any, provider: any) {
  const monnifyKey = provider.api_key_encrypted;
  
  // First, get access token
  const authResponse = await fetch('https://api.monnify.com/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(monnifyKey)}`,
      'Content-Type': 'application/json',
    },
  });

  const authResult = await authResponse.json();
  
  if (!authResult.requestSuccessful) {
    throw new Error(`Monnify auth error: ${authResult.responseMessage || 'Unknown error'}`);
  }

  const accessToken = authResult.responseBody.accessToken;

  // Initialize transaction
  const response = await fetch('https://api.monnify.com/api/v1/merchant/transactions/init-transaction', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: addon.price,
      customerName: addon.name,
      customerEmail: billing.tenant_id, // Should get tenant email
      paymentReference: `addon_${billing.id}_${Date.now()}`,
      paymentDescription: addon.description,
      currencyCode: addon.currency || 'NGN',
      contractCode: provider.config?.contract_code,
      redirectUrl: `${Deno.env.get('SUPABASE_URL')}/payment/success`,
      paymentMethods: ['CARD', 'ACCOUNT_TRANSFER'],
    }),
  });

  const result = await response.json();
  
  if (!result.requestSuccessful) {
    throw new Error(`Monnify error: ${result.responseMessage || 'Unknown error'}`);
  }

  return {
    transaction_id: result.responseBody.transactionReference,
    payment_url: result.responseBody.checkoutUrl,
    metadata: { monnify_reference: result.responseBody.transactionReference },
  };
}
