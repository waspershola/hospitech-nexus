import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

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

    // 🔒 SECURITY: Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🔒 SECURITY: Role-based authorization
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role, tenant_id')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole) {
      console.error('Role fetch failed:', roleError);
      return new Response(
        JSON.stringify({ success: false, error: 'User role not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowedRoles = ['owner', 'manager', 'frontdesk'];
    if (!allowedRoles.includes(userRole.role)) {
      console.log(`Access denied for role: ${userRole.role}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Insufficient permissions',
          required_roles: allowedRoles
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { booking_id, guest_id, tenant_id, amount_to_apply, staff_id } = await req.json();

    if (!guest_id || !tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🔒 SECURITY: Tenant ID validation
    if (tenant_id !== userRole.tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Tenant ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get guest wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('wallet_type', 'guest')
      .eq('owner_id', guest_id)
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (!wallet) {
      return new Response(
        JSON.stringify({ success: false, error: 'Guest wallet not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (wallet.balance <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No available wallet balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const maxApply = Math.min(amount_to_apply || wallet.balance, wallet.balance);

    // Get current wallet balance for balance_after calculation
    const currentBalance = Number(wallet.balance);
    const balanceAfter = currentBalance - maxApply;

    // Create debit wallet transaction
    const { error: walletTxnError } = await supabase.from('wallet_transactions').insert([{
      wallet_id: wallet.id,
      tenant_id,
      type: 'debit',
      amount: maxApply,
      balance_after: balanceAfter,
      source: 'booking_apply',
      description: `Applied to booking ${booking_id || 'new booking'}`,
      created_by: staff_id,
      metadata: { 
        booking_id, 
        applied_to_booking: true,
        guest_id,
      },
    }]);

    if (walletTxnError) throw walletTxnError;

    // Create payment record linked to booking if booking_id provided
    if (booking_id) {
      const txnRef = `WALLET-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
      
      const { error: paymentError } = await supabase.from('payments').insert([{
        tenant_id,
        transaction_ref: txnRef,
        guest_id,
        booking_id,
        amount: maxApply,
        method: 'wallet_credit',
        status: 'success',
        wallet_id: wallet.id,
        recorded_by: staff_id,
        metadata: { 
          source: 'wallet_balance_applied',
          wallet_debit: true,
        },
      }]);

      if (paymentError) throw paymentError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        amount_applied: maxApply,
        remaining_balance: balanceAfter,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Apply wallet credit error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});