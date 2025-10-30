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

    // Note: For payments, we typically receive the final amount paid by the customer
    // We don't recalculate taxes here, just record what was received
    // Tax breakdown is stored if available in metadata
    console.log('Recording payment:', { transaction_ref, amount, method });

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
    let isCreditDeferred = false;
    if (provider_id) {
      const { data: provider } = await supabase
        .from('finance_providers')
        .select('name, type, fee_percent, status')
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
      isCreditDeferred = provider.type === 'credit_deferred';
      
      console.log('Using provider:', providerName, 'with fee:', providerFee, '%');
      
      if (isCreditDeferred) {
        console.log('Processing Pay Later (credit_deferred) transaction');
        providerFee = 0; // No fee for internal credit
      }
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

    // Helper function to get or create guest wallet
    async function getOrCreateGuestWallet(supabase: any, guestId: string, tenantId: string): Promise<string> {
      // Try to find existing wallet
      const { data: existingWallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('wallet_type', 'guest')
        .eq('owner_id', guestId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existingWallet) {
        return existingWallet.id;
      }

      // Create new wallet
      const { data: guest } = await supabase
        .from('guests')
        .select('name')
        .eq('id', guestId)
        .single();

      const { data: newWallet, error } = await supabase
        .from('wallets')
        .insert([{
          tenant_id: tenantId,
          wallet_type: 'guest',
          owner_id: guestId,
          name: `${guest?.name || 'Guest'}'s Wallet`,
          currency: 'NGN',
          balance: 0,
        }])
        .select('id')
        .single();

      if (error) throw error;
      return newWallet.id;
    }

    // Get location details if provided (includes department wallet for auto-linking)
    let locationName = null;
    let locationWalletId = null;
    let locationDepartment = null;
    if (location_id) {
      const { data: location } = await supabase
        .from('finance_locations')
        .select('name, status, wallet_id, department')
        .eq('id', location_id)
        .eq('tenant_id', tenant_id)
        .single();

      if (location && location.status === 'active') {
        locationName = location.name;
        locationWalletId = location.wallet_id;
        locationDepartment = location.department;
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
        status: isCreditDeferred ? 'pending' : 'success',
        charged_to_organization: !!organization_id,
        metadata: {
          ...metadata,
          provider_id,
          location_id,
          provider_fee: providerFee,
          net_amount: amount - (amount * providerFee / 100),
          is_credit_deferred: isCreditDeferred,
          ...(isCreditDeferred && {
            is_receivable: true,
            accounting_category: 'accounts_receivable',
            settlement_required: true,
          }),
        },
      }])
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      throw paymentError;
    }

    console.log('Payment created:', payment.id);

    // Phase 1: Auto-create wallet transaction for organization or provided wallet
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
          department: locationDepartment,
        }]);

      if (walletError) {
        console.error('Error creating wallet transaction:', walletError);
        // Don't throw here, payment is already created
      } else {
        console.log('Wallet transaction created for wallet:', finalWalletId, 'type:', txnType, 'amount:', netAmount);
      }
    }

    // Phase 2: Auto-create department wallet transaction if location has a wallet
    if (locationWalletId && !organization_id) {
      const netAmount = amount - (amount * providerFee / 100);
      
      console.log('Auto-linking to department wallet:', locationWalletId, 'for location:', locationName);
      
      const { error: deptWalletError } = await supabase
        .from('wallet_transactions')
        .insert([{
          wallet_id: locationWalletId,
          payment_id: payment.id,
          tenant_id,
          type: 'credit',
          amount: netAmount,
          description: `Payment collected at ${locationName} - ${method}${providerName ? ` via ${providerName}` : ''}`,
          created_by: recorded_by,
          department: locationDepartment,
          metadata: {
            auto_linked: true,
            location_id,
            location_name: locationName,
          },
        }]);

      if (deptWalletError) {
        console.error('Error creating department wallet transaction:', deptWalletError);
        // Don't throw - this is a nice-to-have feature
      } else {
        console.log('Department wallet transaction created:', locationWalletId, 'amount:', netAmount);
      }
    }

    // Phase 3: Handle underpayment/overpayment logic
    if (expected_amount && guest_id) {
      const actualAmount = amount;
      const difference = actualAmount - expected_amount;
      
      if (difference > 0.01) {
        // OVERPAYMENT: Credit guest wallet
        console.log('Overpayment detected:', difference, '- crediting guest wallet');
        const guestWalletId = await getOrCreateGuestWallet(supabase, guest_id, tenant_id);
        
        await supabase.from('wallet_transactions').insert([{
          wallet_id: guestWalletId,
          tenant_id,
          type: 'credit',
          amount: difference,
          payment_id: payment.id,
          description: `Overpayment credit from ${transaction_ref}`,
          created_by: recorded_by,
          metadata: {
            payment_type: 'overpayment',
            original_payment: payment.id,
            expected: expected_amount,
            paid: actualAmount,
          },
        }]);
        
        console.log('Guest wallet credited with overpayment:', difference);
      } else if (difference < -0.01) {
        // UNDERPAYMENT: Create accounts receivable entry
        const balanceDue = Math.abs(difference);
        console.log('Underpayment detected:', balanceDue, '- creating AR entry');
        
        await supabase.from('booking_charges').insert([{
          tenant_id,
          booking_id: booking_id,
          guest_id: guest_id,
          charge_type: 'balance_due',
          description: `Outstanding balance from ${transaction_ref}`,
          amount: balanceDue,
          department: 'accounts_receivable',
          charged_by: recorded_by,
          metadata: {
            payment_type: 'partial',
            original_payment: payment.id,
            expected: expected_amount,
            paid: actualAmount,
          },
        }]);
        
        console.log('AR entry created for underpayment:', balanceDue);
      }
    }

    // Phase 5: Auto-create reconciliation record for non-cash/non-credit_deferred payments
    if (provider_id && providerName && !isCreditDeferred && providerName !== 'Cash') {
      console.log('Creating reconciliation record for provider:', providerName);
      
      await supabase.from('finance_reconciliation_records').insert([{
        tenant_id,
        source: 'internal_payment',
        provider_id,
        reference: transaction_ref,
        amount: amount,
        status: 'unmatched',
        internal_txn_id: payment.id,
        raw_data: {
          payment_method: method,
          provider_name: providerName,
          location: locationName,
          department,
          recorded_at: new Date().toISOString(),
          booking_id,
          guest_id,
        },
      }]);
      
      console.log('Reconciliation record created');
    } else if (isCreditDeferred) {
      console.log('Skipping reconciliation for credit_deferred (Pay Later) payment');
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
