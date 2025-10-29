import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const chargeSchema = z.object({
  tenant_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  guest_id: z.string().uuid().optional(),
  booking_id: z.string().uuid().optional(),
  amount: z.number().positive(),
  description: z.string().min(1).max(500),
  department: z.string().optional(),
  recorded_by: z.string().uuid(),
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

    const rawBody = await req.json();
    const validationResult = chargeSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid input',
          details: validationResult.error.errors
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { tenant_id, organization_id, guest_id, booking_id, amount, description, department, recorded_by } = validationResult.data;

    console.log('Charging organization:', organization_id, 'amount:', amount);

    // Get organization and validate
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, credit_limit, allow_negative_balance, wallet_id')
      .eq('id', organization_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ success: false, error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!org.wallet_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Organization wallet not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate organization spending limits (per-guest, per-department, etc.)
    const { data: limitValidation, error: limitError } = await supabase.rpc('validate_org_limits', {
      _org_id: organization_id,
      _guest_id: guest_id || '',
      _department: department || 'general',
      _amount: amount,
    });

    if (limitError) {
      console.error('Limit validation error:', limitError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to validate spending limits',
          code: 'VALIDATION_ERROR'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validation = limitValidation as { allowed: boolean; code?: string; detail?: string };
    if (!validation.allowed) {
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

    // Check wallet balance and credit limit
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', org.wallet_id)
      .single();

    if (wallet && !org.allow_negative_balance) {
      const currentDebt = Math.abs(wallet.balance);
      if (currentDebt + amount > org.credit_limit) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Charge would exceed organization credit limit',
            code: 'CREDIT_LIMIT_EXCEEDED',
            current_debt: currentDebt,
            credit_limit: org.credit_limit
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Organization limits validated successfully');

    // Create payment record
    const transaction_ref = `ORG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        tenant_id,
        transaction_ref,
        organization_id,
        guest_id,
        booking_id,
        amount,
        method: 'organization_account',
        department,
        wallet_id: org.wallet_id,
        recorded_by,
        status: 'success',
        charged_to_organization: true,
        metadata: {
          description,
          charged_via: 'charge_to_organization_function'
        },
      }])
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      throw paymentError;
    }

    // Create wallet debit transaction
    const { error: walletError } = await supabase
      .from('wallet_transactions')
      .insert([{
        wallet_id: org.wallet_id,
        payment_id: payment.id,
        tenant_id,
        type: 'debit',
        amount,
        description: `Organization Charge: ${description}`,
        created_by: recorded_by,
      }]);

    if (walletError) {
      console.error('Error creating wallet transaction:', walletError);
      throw walletError;
    }

    console.log('Organization charged successfully:', payment.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment_id: payment.id,
        transaction_ref,
        message: 'Organization charged successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error charging organization:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
