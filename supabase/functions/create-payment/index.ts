/**
 * create-payment Edge Function
 * Version: 2.2.0 - STABLE BUILD with correct imports
 * Handles payment creation and folio posting
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';
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
  // Allow any expected amount (can be negative for credit balances); business logic will interpret correctly
  expected_amount: z.number().max(1000000000).optional().nullable(),
  payment_type: z.enum(['partial', 'full', 'overpayment']).optional().nullable(),
  method: z.string().min(1, 'Payment method required').max(50, 'Method name too long'),
  provider_id: z.string().uuid('Invalid provider ID format').optional().nullable(),
  location_id: z.string().uuid('Invalid location ID format').optional().nullable(),
  department: z.string().max(100, 'Department name too long').optional().nullable(),
  shift: z.enum(['morning', 'evening', 'night']).optional().nullable(),
  wallet_id: z.string().uuid('Invalid wallet ID format').optional().nullable(),
  recorded_by: z.string().uuid('Invalid user ID format').optional().nullable(),
  overpayment_action: z.enum(['wallet', 'refund']).optional().nullable(),
  // Set when manager PIN approval has been granted
  approval_token: z.string().optional().nullable(),
  force_approve: z.boolean().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 CREATE-PAYMENT V2.2.1-FINAL-4PARAM: Initialized');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // SECURITY: Verify user authentication and role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user role and tenant
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role, tenant_id')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole) {
      console.error('Role fetch failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'No role assigned to user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check role permissions - only certain roles can create payments
    const allowedRoles = ['owner', 'manager', 'frontdesk', 'finance', 'accountant'];
    if (!allowedRoles.includes(userRole.role)) {
      console.error('Insufficient permissions:', userRole.role);
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient permissions to create payments',
          required_roles: allowedRoles,
          user_role: userRole.role
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authorized:', user.id, 'Role:', userRole.role, 'Tenant:', userRole.tenant_id);

    // Fetch payment preferences for threshold validation
    const { data: paymentPreferences } = await supabase
      .from('hotel_payment_preferences')
      .select('manager_approval_threshold, large_overpayment_threshold')
      .eq('tenant_id', userRole.tenant_id)
      .maybeSingle();

    const managerApprovalThreshold = paymentPreferences?.manager_approval_threshold || 50000;
    const largeOverpaymentThreshold = paymentPreferences?.large_overpayment_threshold || 50000;

    console.log('Payment thresholds:', { managerApprovalThreshold, largeOverpaymentThreshold });

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
      shift,
      department,
      wallet_id,
      recorded_by,
      overpayment_action,
      approval_token,
      force_approve,
      metadata,
    } = validationResult.data;

    // SECURITY: Verify tenant_id matches user's tenant
    if (tenant_id !== userRole.tenant_id) {
      console.error('Tenant mismatch:', tenant_id, 'vs', userRole.tenant_id);
      return new Response(
        JSON.stringify({ error: 'Tenant mismatch - unauthorized access attempt' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing payment:', { transaction_ref, amount, method, provider_id, location_id });

    // PHASE 2B: Threshold validation for partial payments and overpayments
    if (expected_amount && payment_type) {
      const paymentDifference = amount - expected_amount;
      
      // Partial payment validation - check remaining balance
      if (payment_type === 'partial') {
        const balanceDue = expected_amount - amount;
        if (balanceDue > managerApprovalThreshold) {
          // Require manager approval for large remaining balance
          if (!approval_token && !force_approve) {
            console.log('BLOCKED: Partial payment requires manager approval. Balance due:', balanceDue);
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: `Partial payment with balance ₦${balanceDue.toLocaleString()} requires manager approval`,
                code: 'MANAGER_APPROVAL_REQUIRED_PARTIAL',
                balance_due: balanceDue,
                threshold: managerApprovalThreshold
              }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          console.log('Manager approval provided for partial payment. Token:', approval_token?.substring(0, 10) + '...');
        }
      }
      
      // Overpayment validation - check excess amount
      if (payment_type === 'overpayment' && paymentDifference > 0) {
        if (paymentDifference > largeOverpaymentThreshold) {
          // Require manager approval for large overpayment
          if (!approval_token && !force_approve) {
            console.log('BLOCKED: Large overpayment requires manager approval. Excess:', paymentDifference);
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: `Overpayment of ₦${paymentDifference.toLocaleString()} requires manager approval`,
                code: 'MANAGER_APPROVAL_REQUIRED_OVERPAYMENT',
                overpayment_excess: paymentDifference,
                threshold: largeOverpaymentThreshold
              }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          console.log('Manager approval provided for large overpayment. Token:', approval_token?.substring(0, 10) + '...');
        }
      }
    }

    // Note: For payments, we typically receive the final amount paid by the customer
    // We don't recalculate taxes here, just record what was received
    // Tax breakdown is stored if available in metadata
    console.log('Recording payment:', { transaction_ref, amount, method });

    // LEDGER-PHASE-2B-V1: Insert ledger entry for all payments
    console.log('[ledger-integration] STAFF-LOOKUP-V1: Logging payment to accounting ledger');
    
    // STAFF-LOOKUP-V1: Lookup staff.id from user_id before ledger posting
    let staffId = null;
    if (recorded_by) {
      const { data: staffRow } = await supabase
        .from('staff')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('user_id', recorded_by)
        .maybeSingle();
      
      staffId = staffRow?.id || null;
      console.log('[ledger-integration] STAFF-LOOKUP-V1: Resolved staff_id:', staffId, 'from user_id:', recorded_by);
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
    let feeBearer = 'property';
    let isCreditDeferred = false;
    if (provider_id) {
      const { data: provider } = await supabase
        .from('finance_providers')
        .select('name, type, fee_percent, fee_bearer, status')
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
      feeBearer = provider.fee_bearer || 'property';
      isCreditDeferred = provider.type === 'credit_deferred';
      
      console.log('Using provider:', providerName, 'with fee:', providerFee, '%, Fee bearer:', feeBearer);
      
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

    // Calculate fee amounts based on fee_bearer
    const feeAmount = amount * providerFee / 100;
    let netAmount: number;
    let grossAmount: number;
    let actualGuestCharge: number;

    if (feeBearer === 'guest') {
      // Guest pays fee - add to their charge
      actualGuestCharge = amount + feeAmount;
      grossAmount = amount; // Property receives full requested amount
      netAmount = amount; // Property gets the full amount (fee paid by guest)
    } else {
      // Property pays fee - deduct from amount (current behavior)
      actualGuestCharge = amount;
      grossAmount = amount;
      netAmount = amount - feeAmount; // Property receives less
    }

    console.log('Fee calculation:', {
      feeBearer,
      amount,
      feeAmount,
      actualGuestCharge,
      netAmount,
      grossAmount,
    });

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        tenant_id,
        transaction_ref,
        guest_id,
        organization_id,
        booking_id,
        amount: actualGuestCharge, // The actual amount charged to guest
        expected_amount,
        payment_type: payment_type || (expected_amount ? (actualGuestCharge < expected_amount ? 'partial' : actualGuestCharge > expected_amount ? 'overpayment' : 'full') : 'full'),
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
          provider_fee: feeAmount, // Actual fee amount
          fee_bearer: feeBearer, // Who pays the fee
          net_amount: netAmount, // What property receives
          gross_amount: grossAmount, // The base amount before fees
          guest_charged: actualGuestCharge, // What guest actually pays
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

    // FINANCE-CONFIG-V1: Lookup payment method ID from payment_methods table
    let paymentMethodId = null;
    if (method) {
      const { data: methodRow } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('method_type', method.toLowerCase())
        .maybeSingle();
      
      paymentMethodId = methodRow?.id || null;
      
      if (!paymentMethodId) {
        console.warn(`[FINANCE-CONFIG-V1] Payment method not found for type: ${method}`);
      } else {
        console.log(`[FINANCE-CONFIG-V1] Resolved payment method ID:`, paymentMethodId);
      }
    }

    // FINANCE-CONFIG-V1: Post payment to accounting ledger with FK IDs
    try {
      const { error: ledgerError } = await supabase.rpc('insert_ledger_entry', {
        p_tenant_id: tenant_id,
        p_transaction_type: 'credit',
        p_amount: actualGuestCharge,
        p_description: `Payment received - ${method}`,
        p_reference_type: 'payment',
        p_reference_id: payment.id,
        p_category: 'guest_payment',
        p_payment_method: method,
        p_payment_method_id: paymentMethodId,
        p_payment_provider: providerName,
        p_payment_provider_id: provider_id || null,
        p_payment_location: locationName,
        p_payment_location_id: location_id || null,
        p_source_type: 'payment',
        p_department: department || locationDepartment || null,
        p_folio_id: payment.stay_folio_id || null,
        p_booking_id: booking_id || null,
        p_guest_id: guest_id || null,
        p_organization_id: organization_id || null,
        p_staff_id: staffId || null, // STAFF-LOOKUP-V1: Use resolved staff.id instead of user_id
        p_metadata: {
          payment_id: payment.id,
          transaction_ref: transaction_ref,
          payment_type: payment.payment_type,
          provider_fee: feeAmount,
          net_amount: netAmount,
          source: 'create-payment',
          version: 'FINANCE-CONFIG-V1'
        }
      });

      if (ledgerError) {
        console.error('[ledger-integration] FINANCE-CONFIG-V1: Failed to post to ledger:', ledgerError);
        console.error('[ledger-integration] CRITICAL: Payment created but ledger entry failed - manual reconciliation required');
        // Don't throw - payment is already created, but log for reconciliation
      } else {
        console.log('[ledger-integration] FINANCE-CONFIG-V1: Payment posted to ledger successfully');
      }
    } catch (ledgerErr) {
      console.error('[ledger-integration] FINANCE-CONFIG-V1: Ledger posting exception:', ledgerErr);
      console.error('[ledger-integration] CRITICAL: Payment created but ledger entry failed - manual reconciliation required');
    }

    // Phase 2: Check if booking is completed - route to post-checkout ledger
    if (booking_id) {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('status')
        .eq('id', booking_id)
        .single();

      if (!bookingError && booking?.status === 'completed') {
        console.log('✅ Booking completed - routing to post-checkout ledger');
        
        const { error: ledgerError } = await supabase
          .from('post_checkout_ledger')
          .insert({
            tenant_id,
            booking_id,
            payment_id: payment.id,
            guest_id,
            amount,
            reason: 'late_payment',
            recorded_by: recorded_by || user.id,
            notes: `Payment received after checkout: ${method}`
          });
        
        if (ledgerError) {
          console.error('Failed to record post-checkout payment:', ledgerError);
          // Don't fail - payment is already recorded
        } else {
          console.log('✅ Post-checkout payment recorded in ledger');
        }
        
        // Return success - skip folio posting
        return new Response(JSON.stringify({
          success: true,
          payment,
          post_checkout: true,
          message: 'Payment recorded in post-checkout ledger'
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // V2.2.1-FINAL-4PARAM: Post payment to folio using tenant-aware database wrapper
    // This ensures explicit tenant isolation and eliminates JS client serialization issues
    if (booking_id) {
      console.log('[V2.2.1-FINAL-4PARAM] Attempting DB-level payment posting');
      console.log('[V2.2.1-FINAL-4PARAM] Parameters:', {
        tenant_id,
        booking_id,
        payment_id: payment.id,
        amount
      });
      
      try {
        // Call DB wrapper with all 4 parameters (tenant_id is critical for security)
        const { data: execRes, error: execErr } = await supabase.rpc('execute_payment_posting', {
          p_tenant_id: tenant_id,
          p_booking_id: booking_id,
          p_payment_id: payment.id,
          p_amount: amount
        });

        if (execErr) {
          // Log error but don't block payment creation (payment already exists)
          console.error('[V2.2.1-FINAL-4PARAM] execute_payment_posting RPC error:', JSON.stringify(execErr));
          console.error('[V2.2.1-FINAL-4PARAM] Payment created but NOT posted to folio - manual intervention may be required');
        } else {
          console.log('[V2.2.1-FINAL-4PARAM] execute_payment_posting response:', JSON.stringify(execRes));
          
          // Check wrapper response
          if (execRes?.success === false) {
            console.warn('[V2.2.1-FINAL-4PARAM] execute_payment_posting indicated failure:', execRes);
            console.warn('[V2.2.1-FINAL-4PARAM] Reason:', execRes.message || 'unknown');
          } else {
            console.log('[V2.2.1-FINAL-4PARAM] ✅ Payment posted to folio successfully via DB wrapper');
            console.log('[V2.2.1-FINAL-4PARAM] Folio ID:', execRes?.folio_id);
            console.log('[V2.2.1-FINAL-4PARAM] Result:', execRes?.result);
          }
        }
      } catch (err) {
        console.error('[V2.2.1-FINAL-4PARAM] Unexpected error calling execute_payment_posting:', err);
        console.error('[V2.2.1-FINAL-4PARAM] Payment exists but folio posting failed - check logs');
      }
    }

    // Phase 1: Auto-create wallet transaction for organization or provided wallet
    const finalWalletId = payment.wallet_id;
    if (finalWalletId) {
      // Use netAmount for wallet credit (what property actually receives)
      const txnType = organization_id ? 'debit' : 'credit';
      
      const { error: walletError } = await supabase
        .from('wallet_transactions')
        .insert([{
          wallet_id: finalWalletId,
          payment_id: payment.id,
          tenant_id,
          type: txnType,
          amount: netAmount, // Credit the NET amount (after fee)
          description: organization_id 
            ? `Charged to organization - ${method}${providerName ? ` (${providerName})` : ''} - ${metadata?.notes || transaction_ref}`
            : `Payment via ${method}${providerName ? ` (${providerName})` : ''} - ${metadata?.notes || transaction_ref}`,
          created_by: recorded_by,
          department: locationDepartment,
          metadata: {
            fee_bearer: feeBearer,
            fee_amount: feeAmount,
            gross_amount: grossAmount,
          },
        }]);

      if (walletError) {
        console.error('Error creating wallet transaction:', walletError);
        // Don't throw here, payment is already created
      } else {
        console.log('Wallet transaction created - Net amount:', netAmount, 'Fee bearer:', feeBearer);
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
    if (expected_amount !== null && expected_amount !== undefined && guest_id) {
      const actualAmount = amount;
      const difference = actualAmount - expected_amount;
      
      // Get payment preferences
      const { data: prefs } = await supabase
        .from('hotel_payment_preferences')
        .select('large_overpayment_threshold, manager_approval_threshold, overpayment_default_action')
        .eq('tenant_id', tenant_id)
        .maybeSingle();
      
      const overpaymentThreshold = prefs?.large_overpayment_threshold || 50000;
      const underpaymentThreshold = prefs?.manager_approval_threshold || 50000;
      const isManagerApproved = !!approval_token || !!force_approve;
      
      if (difference > 0.01) {
        // OVERPAYMENT: Check if needs manager approval
        if (difference > overpaymentThreshold && !isManagerApproved) {
          return new Response(
            JSON.stringify({
              success: false,
              code: 'MANAGER_APPROVAL_REQUIRED',
              error: `Overpayment of ₦${difference.toLocaleString()} exceeds threshold. Manager approval required.`,
              requires_approval: true,
              overpayment_amount: difference,
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Handle overpayment based on user choice or default
        const action = overpayment_action || prefs?.overpayment_default_action || 'wallet';
        
        if (action === 'wallet') {
          console.log('Overpayment detected:', difference, '- crediting guest wallet');
          const guestWalletId = await getOrCreateGuestWallet(supabase, guest_id, tenant_id);
          
          // Get current wallet balance
          const { data: currentWallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('id', guestWalletId)
            .single();
          
          const balanceAfter = Number(currentWallet?.balance || 0) + difference;
          
          await supabase.from('wallet_transactions').insert([{
            wallet_id: guestWalletId,
            tenant_id,
            type: 'credit',
            amount: difference,
            balance_after: balanceAfter,
            source: 'overpayment',
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
        } else if (action === 'refund') {
          // Mark payment for refund processing
          console.log('Overpayment refund requested:', difference);
          await supabase.from('finance_reconciliation_records').insert([{
            tenant_id,
            source: 'refund_pending',
            provider_id,
            reference: `REFUND-${transaction_ref}`,
            amount: difference,
            status: 'pending_refund',
            raw_data: {
              original_payment: payment.id,
              refund_reason: 'overpayment',
              guest_id,
              booking_id,
            },
          }]);
        }
      } else if (difference < -0.01) {
        // UNDERPAYMENT: Check if needs manager approval
        const balanceDue = Math.abs(difference);
        
        if (balanceDue > underpaymentThreshold && !isManagerApproved) {
          return new Response(
            JSON.stringify({
              success: false,
              code: 'MANAGER_APPROVAL_REQUIRED',
              error: `Balance due of ₦${balanceDue.toLocaleString()} exceeds threshold. Manager must approve partial payment.`,
              requires_approval: true,
              balance_due: balanceDue,
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('Underpayment detected:', balanceDue, '- creating receivable entry');
        
        // Create receivable entry (preferred method)
        await supabase.from('receivables').insert([{
          tenant_id,
          guest_id: guest_id,
          organization_id: organization_id,
          booking_id: booking_id,
          amount: balanceDue,
          status: 'open',
          created_by: recorded_by,
          approved_by: force_approve ? recorded_by : null,
          metadata: {
            payment_type: 'partial',
            original_payment: payment.id,
            expected: expected_amount,
            paid: actualAmount,
            transaction_ref,
          },
        }]);
        
        // Also create booking_charges for folio display (backward compatibility)
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
        
        console.log('Receivable and AR entry created for underpayment:', balanceDue);
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

    // ============= LEDGER INTEGRATION - RECORD ALL PAYMENTS =============
    // Record payment to accounting ledger
    try {
      console.log('[LEDGER-INTEGRATION-V2] Recording payment to ledger with shift:', payment.id);
      
      const { data: ledgerEntryId, error: ledgerError } = await supabase
        .rpc('insert_ledger_entry', {
          p_tenant_id: tenant_id,
          p_transaction_type: 'credit',
          p_amount: amount,
          p_description: `Payment received - ${method || 'N/A'}`,
          p_reference_type: 'payment',
          p_reference_id: payment.id,
          p_payment_method: method,
          p_provider_id: provider_id,
          p_location_id: location_id,
          p_department: department,
          p_shift: shift,
          p_category: 'payment_received',
          p_folio_id: booking_id ? undefined : undefined, // Will be linked via folio_post_payment
          p_booking_id: booking_id,
          p_guest_id: guest_id,
          p_staff_id: recorded_by,
          p_metadata: {
            payment_id: payment.id,
            transaction_ref,
            payment_type: payment.payment_type,
            expected_amount,
            overpayment_action: payment.overpayment_action,
            wallet_id,
            shift,
            version: 'LEDGER-INTEGRATION-V2'
          }
        });

      if (ledgerError) {
        console.error('[LEDGER-INTEGRATION-V1] Failed to record ledger entry:', ledgerError);
        // Don't fail payment if ledger recording fails - log for manual reconciliation
      } else {
        console.log('[LEDGER-INTEGRATION-V1] Ledger entry created:', ledgerEntryId);
      }
    } catch (ledgerException) {
      console.error('[LEDGER-INTEGRATION-V1] Ledger recording exception:', ledgerException);
      // Continue - payment is still valid
    }

    // Send payment notifications
    try {
      if (guest_id) {
        const { data: guest } = await supabase
          .from('guests')
          .select('phone, name, email')
          .eq('id', guest_id)
          .single();

        if (guest) {
          const { data: hotelMeta } = await supabase
            .from('hotel_meta')
            .select('hotel_name, contact_phone')
            .eq('tenant_id', tenant_id)
            .maybeSingle();

          const { data: financials } = await supabase
            .from('hotel_financials')
            .select('currency_symbol')
            .eq('tenant_id', tenant_id)
            .maybeSingle();

          const hotelName = hotelMeta?.hotel_name || 'Hotel';
          const hotelPhone = hotelMeta?.contact_phone || 'our frontdesk';
          const currencySymbol = financials?.currency_symbol || '₦';

          // Check SMS settings for payment confirmation
          const { data: smsSettings } = await supabase
            .from('tenant_sms_settings')
            .select('enabled, auto_send_payment_confirmation')
            .eq('tenant_id', tenant_id)
            .maybeSingle();

          // Send SMS if enabled
          if (smsSettings?.enabled && smsSettings?.auto_send_payment_confirmation && guest.phone) {
            const message = `Payment received: ${currencySymbol}${amount.toLocaleString()} via ${method}. Ref: ${transaction_ref}. Thank you! Questions? Call ${hotelPhone} - ${hotelName}`;

            await supabase.functions.invoke('send-sms', {
              headers: {
                Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: {
                tenant_id,
                to: guest.phone,
                message,
                event_key: 'payment_received',
                booking_id,
                guest_id,
              },
            });

            console.log('Payment confirmation SMS sent to:', guest.phone);
          }

          // Send email if guest has email (independent of SMS settings)
          if (guest.email) {
            console.log('Sending payment confirmation email...');
            
            // Check if email provider is configured
            const { data: emailProvider } = await supabase
              .from('platform_email_providers')
              .select('id, enabled')
              .eq('provider_type', 'resend')
              .eq('enabled', true)
              .or(`tenant_id.eq.${tenant_id},tenant_id.is.null`)
              .order('tenant_id', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (emailProvider) {
              await supabase.functions.invoke('send-email-notification', {
                body: {
                  tenant_id,
                  to: guest.email,
                  event_key: 'payment_received',
                  variables: {
                    guest_name: guest.name,
                    receipt_number: transaction_ref,
                    amount: amount.toFixed(2),
                    payment_method: method || 'N/A',
                    payment_date: new Date().toLocaleDateString(),
                  },
                  booking_id,
                  guest_id,
                },
              }).catch((error) => {
                console.error('Email send exception:', error);
              });
              
              console.log('Payment confirmation email sent to:', guest.email);
            } else {
              console.log('Email provider not configured, skipping email notification');
            }
          }
        }
      }
    } catch (notificationError) {
      console.error('Payment notification error:', notificationError);
      // Don't fail the payment if notifications fail
    }

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
