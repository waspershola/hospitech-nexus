import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentInitiationRequest {
  tenant_id: string;
  payment_method_id: string;
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

    const { data: requestData, error: parseError } = await req.json().catch(() => ({ data: null, error: 'Invalid JSON' }));
    if (parseError) {
      throw new Error('Invalid request body');
    }

    const { tenant_id, payment_method_id } = requestData as PaymentInitiationRequest;

    console.log('[initiate-platform-fee-payment] Starting payment initiation for tenant:', tenant_id);

    // 1. Fetch outstanding fees (pending + billed status)
    const { data: fees, error: feesError } = await supabase
      .from('platform_fee_ledger')
      .select('*')
      .eq('tenant_id', tenant_id)
      .in('status', ['pending', 'billed']);

    if (feesError) {
      console.error('[initiate-platform-fee-payment] Error fetching fees:', feesError);
      throw new Error(`Failed to fetch outstanding fees: ${feesError.message}`);
    }

    if (!fees || fees.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No outstanding fees to pay' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 2. Calculate total amount
    const totalAmount = fees.reduce((sum, fee) => sum + Number(fee.fee_amount), 0);
    console.log('[initiate-platform-fee-payment] Total outstanding:', totalAmount, 'from', fees.length, 'fees');

    // 3. Fetch payment provider details
    const { data: provider, error: providerError } = await supabase
      .from('platform_payment_providers')
      .select('*')
      .eq('id', payment_method_id)
      .eq('active', true)
      .single();

    if (providerError || !provider) {
      console.error('[initiate-platform-fee-payment] Error fetching provider:', providerError);
      throw new Error('Payment provider not found or inactive');
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
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenant_id)
      .single();

    // 7. Initiate payment with provider (placeholder - will be implemented in Phase 5)
    // For now, return mock payment URL
    const callbackUrl = `${supabaseUrl}/functions/v1/verify-platform-fee-payment`;
    
    // TODO: Phase 5 - Integrate actual payment providers
    const paymentUrl = `https://payment-gateway.example.com/checkout?ref=${paymentReference}&amount=${totalAmount}&callback=${encodeURIComponent(callbackUrl)}`;

    console.log('[initiate-platform-fee-payment] Payment URL generated:', paymentUrl);

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        payment_reference: paymentReference,
        payment_url: paymentUrl,
        total_amount: totalAmount,
        provider: provider.provider_type,
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
