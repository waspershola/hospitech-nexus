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

    // Resolve staff.id from user_id for ledger entry
    console.log('[WALLET-LEDGER-V1] Resolving staff ID from user_id:', staff_id);
    let resolvedStaffId = null;
    if (staff_id) {
      const { data: staffRow } = await supabase
        .from('staff')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('user_id', staff_id)
        .maybeSingle();
      
      resolvedStaffId = staffRow?.id || null;
      console.log('[WALLET-LEDGER-V1] Resolved staff ID:', resolvedStaffId);
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
    let paymentRecordId = null;
    if (booking_id) {
      const txnRef = `WALLET-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
      
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .insert([{
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
        }])
        .select('id')
        .single();

      if (paymentError) throw paymentError;
      paymentRecordId = paymentRecord?.id;
      console.log('[WALLET-LEDGER-V1] Created payment record:', paymentRecordId);

      // 🔥 CRITICAL FIX: Post wallet payment to folio
      console.log('[WALLET-LEDGER-V1] Posting wallet payment to folio');
      try {
        const { data: folioResult, error: folioError } = await supabase.rpc('execute_payment_posting', {
          p_tenant_id: tenant_id,
          p_booking_id: booking_id,
          p_payment_id: paymentRecordId,
          p_amount: maxApply
        });
        
        if (folioError) {
          console.error('[WALLET-LEDGER-V1] Failed to post to folio:', folioError);
          // Log but don't block - wallet transaction is valid
        } else {
          console.log('[WALLET-LEDGER-V1] Wallet payment posted to folio:', folioResult);
        }
      } catch (folioErr) {
        console.error('[WALLET-LEDGER-V1] Folio posting exception:', folioErr);
      }

      // 🔥 DOUBLE-ENTRY FIX: Create TWO ledger entries for wallet payment
      console.log('[WALLET-DOUBLE-ENTRY-V2] Recording ledger entries for wallet payment');
      
      // Import shared ledger helper
      const { insertLedgerEntry } = await import('../_shared/ledger.ts');
      
      try {
        // Entry 1: DEBIT - Wallet balance decreasing (asset account debit)
        await insertLedgerEntry(supabase, {
          tenantId: tenant_id,
          amount: maxApply,
          transactionType: 'debit',
          category: 'wallet_deduction',
          description: `Wallet deduction for booking ${booking_id}`,
          paymentMethod: 'wallet_credit',
          sourceType: 'wallet',
          referenceType: 'wallet_payment',
          referenceId: paymentRecordId,
          bookingId: booking_id,
          guestId: guest_id,
          staffId: resolvedStaffId,
          metadata: {
            wallet_id: wallet.id,
            entry_type: 'debit',
            wallet_balance_before: currentBalance,
            wallet_balance_after: balanceAfter,
            source: 'apply-wallet-credit',
            version: 'WALLET-DOUBLE-ENTRY-V2'
          }
        });
        
        console.log('[WALLET-DOUBLE-ENTRY-V2] ✅ DEBIT entry created (wallet balance down)');
        
        // Entry 2: CREDIT - Payment received against folio (revenue account credit)
        await insertLedgerEntry(supabase, {
          tenantId: tenant_id,
          amount: maxApply,
          transactionType: 'credit',
          category: 'wallet_payment',
          description: `Wallet payment applied to booking ${booking_id}`,
          paymentMethod: 'wallet_credit',
          sourceType: 'wallet',
          referenceType: 'payment',
          referenceId: paymentRecordId,
          bookingId: booking_id,
          guestId: guest_id,
          staffId: resolvedStaffId,
          metadata: {
            wallet_id: wallet.id,
            entry_type: 'credit',
            payment_id: paymentRecordId,
            source: 'apply-wallet-credit',
            version: 'WALLET-DOUBLE-ENTRY-V2'
          }
        });
        
        console.log('[WALLET-DOUBLE-ENTRY-V2] ✅ CREDIT entry created (payment received)');
        console.log('[WALLET-DOUBLE-ENTRY-V2] ✅ Double-entry complete for wallet payment');
        
      } catch (ledgerErr) {
        console.error('[WALLET-DOUBLE-ENTRY-V2] ❌ Ledger posting failed:', ledgerErr);
        // Non-blocking: wallet transaction is valid, ledger is supplementary
      }
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