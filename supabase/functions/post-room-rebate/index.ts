/**
 * post-room-rebate Edge Function
 * Version: 2.0.0 - MANAGER-PIN-V1
 * Applies room rebate with manager PIN approval validation
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RebateRequest {
  folio_id: string;
  rebate_type: 'flat' | 'percent';
  amount: number;
  reason: string;
  nights?: number[];
  approval_token?: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[post-room-rebate] MANAGER-PIN-V1: Request received');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get JWT claims for tenant_id and user_id
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    const body: RebateRequest = await req.json();
    const { folio_id, rebate_type, amount, reason, nights, approval_token } = body;

    console.log('[post-room-rebate] MANAGER-PIN-V1: Validated input', { folio_id, rebate_type, amount });

    // 1. Fetch folio with tenant check
    const { data: folio, error: folioError } = await supabase
      .from('stay_folios')
      .select('id, folio_type, status, booking_id, total_charges, balance, tenant_id')
      .eq('id', folio_id)
      .single();

    if (folioError || !folio) {
      throw new Error('Folio not found');
    }

    // 2. Verify user's tenant matches folio's tenant
    const { data: userRole, error: userRoleError } = await supabase
      .from('user_roles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();
    
    if (userRoleError || !userRole) {
      throw new Error('Unauthorized: User role not found');
    }

    // Fetch staff record to get approver_id for PIN validation (staff.id, not auth user.id)
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', userRole.tenant_id)
      .single();

    if (staffError || !staff) {
      throw new Error('Unauthorized: Staff record not found for approval');
    }
    
    if (userRole.tenant_id !== folio.tenant_id) {
      throw new Error('Unauthorized: Tenant mismatch');
    }

    // 3. Calculate final rebate amount early for approval validation
    let finalRebateAmount = amount;
    if (rebate_type === 'percent') {
      const roomCharges = folio.total_charges || 0;
      finalRebateAmount = (roomCharges * amount) / 100;
    }

    // 4. MANAGER PIN APPROVAL - Room rebates always require approval
    if (!approval_token) {
      throw new Error('Manager approval required for room rebates');
    }

    // Validate approval token using correct function signature
    const { data: validationResult, error: validationError } = await supabase.rpc(
      'validate_approval_token',
      {
        p_token: approval_token,
        p_action_type: 'rebate',
        p_approver_id: staff.id,
        p_tenant_id: userRole.tenant_id
      }
    );

    if (validationError) {
      console.error('[post-room-rebate] MANAGER-PIN-V1: Token validation error:', validationError);
      throw new Error('Failed to validate approval token');
    }

    if (!validationResult) {
      throw new Error('Invalid or expired approval token');
    }

    console.log('[post-room-rebate] MANAGER-PIN-V1: Approval validated');

    // 5. Validate folio type is 'room'
    if (folio.folio_type !== 'room') {
      throw new Error('Rebates can only be applied to Room folios');
    }

    // 6. Validate folio is open
    if (folio.status !== 'open') {
      throw new Error('Cannot post rebate to closed folio');
    }

    // 7. Validate rebate doesn't exceed total charges
    if (finalRebateAmount > folio.total_charges) {
      throw new Error(`Rebate amount (₦${finalRebateAmount.toFixed(2)}) exceeds total room charges (₦${folio.total_charges})`);
    }

    // 8. Insert rebate transaction (negative amount)
    const { data: transaction, error: txError } = await supabase
      .from('folio_transactions')
      .insert({
        tenant_id: folio.tenant_id,
        folio_id: folio_id,
        transaction_type: 'rebate',
        amount: -Math.abs(finalRebateAmount), // Ensure negative
        description: `Room Rebate: ${reason}`,
        reference_type: 'room_rebate',
        reference_id: null,
        department: 'front_desk',
        created_by: user.id,
        metadata: {
          reason,
          rebate_type,
          raw_input_amount: amount,
          nights: nights || [],
          posted_by: user.email,
          posted_at: new Date().toISOString(),
          approval_token_used: true,
          manager_pin_version: 'MANAGER-PIN-V1'
        }
      })
      .select()
      .single();

    if (txError) throw txError;

    // 9. Update folio balance (rebate reduces balance)
    const newTotalCharges = folio.total_charges - Math.abs(finalRebateAmount);
    const newBalance = folio.balance - Math.abs(finalRebateAmount);

    const { error: updateError } = await supabase
      .from('stay_folios')
      .update({
        total_charges: newTotalCharges,
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', folio_id);

    if (updateError) throw updateError;

    // 10. Clear the approval token after successful use
    await supabase.rpc('clear_approval_token', {
      p_user_id: user.id,
      p_tenant_id: userRole.tenant_id
    });

    // 11. Insert audit log
    await supabase
      .from('finance_audit_events')
      .insert({
        tenant_id: folio.tenant_id,
        event_type: 'room_rebate_posted',
        user_id: user.id,
        target_id: folio_id,
        payload: {
          transaction_id: transaction.id,
          folio_id,
          booking_id: folio.booking_id,
          rebate_amount: finalRebateAmount,
          rebate_type,
          reason,
          before_balance: folio.balance,
          after_balance: newBalance,
          manager_approved: true,
          version: 'MANAGER-PIN-V1'
        }
      });

    console.log('[post-room-rebate] MANAGER-PIN-V1: Success', {
      transaction_id: transaction.id,
      rebate_amount: finalRebateAmount,
      new_balance: newBalance
    });

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        rebate_amount: finalRebateAmount,
        new_balance: newBalance,
        folio_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[post-room-rebate] MANAGER-PIN-V1: Error:', errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
