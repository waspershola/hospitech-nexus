import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const paymentSchema = z.object({
  tenant_id: z.string().uuid('Invalid tenant ID format'),
  transaction_ref: z.string().min(1, 'Transaction reference required').max(100, 'Transaction reference too long'),
  guest_id: z.string().uuid('Invalid guest ID format').optional().nullable(),
  organization_id: z.string().uuid('Invalid organization ID format').optional().nullable(),
  booking_id: z.string().uuid('Invalid booking ID format').optional().nullable(),
  amount: z.number().positive('Amount must be positive').max(1000000000, 'Amount exceeds maximum'),
  expected_amount: z.number().positive().max(1000000000).optional().nullable(),
  payment_type: z.enum(['partial', 'full', 'overpayment']).optional().nullable(),
  method: z.string().min(1, 'Payment method required').max(50, 'Method name too long'),
  provider_id: z.string().uuid('Invalid provider ID format').optional().nullable(),
  location_id: z.string().uuid('Invalid location ID format').optional().nullable(),
  department: z.string().max(100, 'Department name too long').optional().nullable(),
  wallet_id: z.string().uuid('Invalid wallet ID format').optional().nullable(),
  recorded_by: z.string().uuid('Invalid user ID format').optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse and validate input
    const rawBody = await req.json();
    const validationResult = paymentSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid input', 
          code: 'VALIDATION_ERROR',
          details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    } = validationResult.data;

    console.log('Processing payment:', { transaction_ref, amount, method, provider_id, location_id });

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
      
      // Auto-fetch organization wallet if not provided
      if (!wallet_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('wallet_id')
          .eq('id', organization_id)
          .eq('tenant_id', tenant_id)
          .single();
        
        if (org?.wallet_id) {
          console.log('Auto-linking organization wallet:', org.wallet_id);
        }
      }
    }

    // Helper function to get organization wallet
    async function getOrgWalletId(supabase: any, orgId: string, tenantId: string): Promise<string | null> {
      const { data: org } = await supabase
        .from('organizations')
        .select('wallet_id')
        .eq('id', orgId)
        .eq('tenant_id', tenantId)
        .single();
      
      return org?.wallet_id || null;
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
        wallet_id: wallet_id || (organization_id ? await getOrgWalletId(supabase, organization_id, tenant_id) : null),
        location: locationName,
        recorded_by,
        status: 'success',
        charged_to_organization: !!organization_id,
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

    // Auto-create wallet transaction for organization or provided wallet
    const finalWalletId = payment.wallet_id;
    if (finalWalletId) {
      const netAmount = amount - (amount * providerFee / 100);
      
      // Debit organization wallet (negative transaction)
      const txnType = organization_id ? 'debit' : 'credit';
      
      const { error: walletError } = await supabase
        .from('wallet_transactions')
        .insert([{
          wallet_id: finalWalletId,
          payment_id: payment.id,
          tenant_id,
          type: txnType,
          amount: netAmount,
          description: organization_id 
            ? `Charged to organization - ${method}${providerName ? ` (${providerName})` : ''} - ${metadata?.notes || transaction_ref}`
            : `Payment via ${method}${providerName ? ` (${providerName})` : ''} - ${metadata?.notes || transaction_ref}`,
          created_by: recorded_by,
        }]);

      if (walletError) {
        console.error('Error creating wallet transaction:', walletError);
        // Don't throw here, payment is already created
      } else {
        console.log('Wallet transaction created for wallet:', finalWalletId, 'type:', txnType, 'amount:', netAmount);
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
