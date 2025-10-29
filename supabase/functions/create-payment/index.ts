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
      provider,
      department,
      wallet_id,
      recorded_by,
      metadata,
      location,
    } = await req.json();

    console.log('Processing payment:', { transaction_ref, amount, method });

    // Check for idempotency
    const { data: existing } = await supabase
      .from('payments')
      .select('id, status, amount')
      .eq('transaction_ref', transaction_ref)
      .maybeSingle();

    if (existing) {
      console.log('Payment already exists:', existing.id);
      return new Response(
        JSON.stringify({ success: true, payment_id: existing.id, payment: existing, message: 'Payment already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
          JSON.stringify({ success: false, error: validation.detail, code: validation.code }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
        payment_type,
        method,
        method_provider: provider,
        department,
        wallet_id,
        location,
        recorded_by,
        status: 'success',
        metadata,
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
      const { error: walletError } = await supabase
        .from('wallet_transactions')
        .insert([{
          wallet_id,
          payment_id: payment.id,
          tenant_id,
          type: 'credit',
          amount,
          description: `Payment via ${method} - ${metadata?.notes || ''}`,
          created_by: recorded_by,
        }]);

      if (walletError) {
        console.error('Error creating wallet transaction:', walletError);
        throw walletError;
      }
      console.log('Wallet transaction created for wallet:', wallet_id);
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
      JSON.stringify({ success: true, payment_id: payment.id, payment }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing payment:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
