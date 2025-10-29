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

    const {
      tenant_id,
      transaction_ref,
      guest_id,
      organization_id,
      booking_id,
      amount,
      expected_amount,
      payment_type,
      method,
      provider_id,
      location_id,
      department,
      wallet_id,
      recorded_by,
      metadata,
    } = await req.json();

    console.log('Processing payment:', { transaction_ref, amount, method, provider_id, location_id });

    // Validate required fields
    if (!tenant_id || !amount || !transaction_ref) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: tenant_id, amount, transaction_ref' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for idempotency
    const { data: existing } = await supabase
      .from('payments')
      .select('id, status, amount')
      .eq('transaction_ref', transaction_ref)
      .maybeSingle();

    if (existing) {
      console.log('Payment already exists:', existing.id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          payment_id: existing.id, 
          payment: existing, 
          message: 'Payment already processed (idempotent)' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get provider details if provider_id is provided
    let providerName = null;
    let providerFee = 0;
    if (provider_id) {
      const { data: provider } = await supabase
        .from('finance_providers')
        .select('name, fee_percent, status')
        .eq('id', provider_id)
        .eq('tenant_id', tenant_id)
        .single();

      if (!provider) {
        return new Response(
          JSON.stringify({ success: false, error: 'Provider not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (provider.status !== 'active') {
        return new Response(
          JSON.stringify({ success: false, error: 'Provider is inactive' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      providerName = provider.name;
      providerFee = provider.fee_percent || 0;
      console.log('Using provider:', providerName, 'with fee:', providerFee, '%');
    }

    // Check provider rules if location or department specified
    if (location_id || department) {
      const { data: rules } = await supabase
        .from('finance_provider_rules')
        .select('max_txn_limit, auto_reconcile')
        .eq('tenant_id', tenant_id)
        .eq('provider_id', provider_id)
        .or(location_id ? `location_id.eq.${location_id}` : 'location_id.is.null');

      if (rules && rules.length > 0) {
        const rule = rules[0];
        
        // Check transaction limit
        if (rule.max_txn_limit && amount > rule.max_txn_limit) {
          console.log('Transaction exceeds limit:', amount, '>', rule.max_txn_limit);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Transaction amount exceeds configured limit',
              code: 'TRANSACTION_LIMIT_EXCEEDED',
              detail: `Maximum allowed: ₦${rule.max_txn_limit.toLocaleString()}` 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Validate organization limits if applicable
    if (organization_id) {
      const { data: validation } = await supabase.rpc('validate_org_limits', {
        _org_id: organization_id,
        _guest_id: guest_id,
        _department: department,
        _amount: amount,
      });

      if (validation && !validation.allowed) {
        console.log('Organization limit exceeded:', validation.detail);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: validation.detail || 'Organization spending limit exceeded', 
            code: validation.code || 'ORG_LIMIT_EXCEEDED' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Organization limits validated');
    }

    // Get location details if provided
    let locationName = null;
    if (location_id) {
      const { data: location } = await supabase
        .from('finance_locations')
        .select('name, status')
        .eq('id', location_id)
        .eq('tenant_id', tenant_id)
        .single();

      if (location && location.status === 'active') {
        locationName = location.name;
      }
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        tenant_id,
        transaction_ref,
        guest_id,
        organization_id,
        booking_id,
        amount,
        expected_amount,
        payment_type: payment_type || (expected_amount ? (amount < expected_amount ? 'partial' : amount > expected_amount ? 'overpayment' : 'full') : 'full'),
        method,
        method_provider: providerName,
        department,
        wallet_id,
        location: locationName,
        recorded_by,
        status: 'success',
        metadata: {
          ...metadata,
          provider_id,
          location_id,
          provider_fee: providerFee,
          net_amount: amount - (amount * providerFee / 100),
        },
      }])
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      throw paymentError;
    }

    console.log('Payment created:', payment.id);

    // If wallet_id provided, create wallet transaction
    if (wallet_id) {
      const netAmount = amount - (amount * providerFee / 100);
      
      const { error: walletError } = await supabase
        .from('wallet_transactions')
        .insert([{
          wallet_id,
          payment_id: payment.id,
          tenant_id,
          type: 'credit',
          amount: netAmount,
          description: `Payment via ${method}${providerName ? ` (${providerName})` : ''} - ${metadata?.notes || transaction_ref}`,
          created_by: recorded_by,
        }]);

      if (walletError) {
        console.error('Error creating wallet transaction:', walletError);
        // Don't throw here, payment is already created
      } else {
        console.log('Wallet transaction created for wallet:', wallet_id, 'amount:', netAmount);
      }
    }

    // Create audit log
    await supabase.from('hotel_audit_logs').insert([{
      tenant_id,
      user_id: recorded_by,
      action: 'CREATE',
      table_name: 'payments',
      record_id: payment.id,
      after_data: payment,
    }]);

    console.log('Payment processing complete:', payment.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment_id: payment.id, 
        payment,
        message: 'Payment processed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing payment:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'PAYMENT_PROCESSING_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
