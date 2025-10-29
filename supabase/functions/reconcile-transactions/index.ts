import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sanitize error messages to prevent information leakage
function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    console.error('Full error (server-side only):', error);
    
    const message = error.message.toLowerCase();
    if (message.includes('violates') || message.includes('permission')) return 'Permission denied';
    if (message.includes('not found') || message.includes('does not exist')) return 'Resource not found';
    if (message.includes('invalid') || message.includes('malformed')) return 'Invalid request';
    
    return 'An error occurred processing your request';
  }
  return 'Unknown error';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { tenant_id, provider_id, transactions, source, user_id } = await req.json();

    if (!tenant_id || !transactions || !Array.isArray(transactions)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Reconciling ${transactions.length} transactions for tenant ${tenant_id} by user ${user.id}`);

    // Verify user belongs to the specified tenant
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || userRole.tenant_id !== tenant_id) {
      console.warn('Unauthorized reconciliation attempt:', { user_id: user.id, requested_tenant: tenant_id });
      return new Response(
        JSON.stringify({ success: false, error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has manager or owner role (reconciliation is a sensitive financial operation)
    const hasPermission = userRole.role === 'owner' || userRole.role === 'manager';
    if (!hasPermission) {
      console.warn('Insufficient role for reconciliation:', { user_id: user.id, role: userRole.role });
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions for reconciliation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user_id matches authenticated user (if provided)
    const effectiveUserId = user_id || user.id;
    if (user_id && user_id !== user.id) {
      console.warn('User ID mismatch in reconciliation:', { authenticated: user.id, provided: user_id });
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid user ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      matched: 0,
      unmatched: 0,
      partial: 0,
    };

    for (const txn of transactions) {
      if (!txn.reference || !txn.amount) {
        console.warn('Invalid transaction data:', txn);
        continue;
      }

      // Try to find matching payment
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenant_id)
        .or(`transaction_ref.eq.${txn.reference},provider_reference.eq.${txn.reference}`);

      let status = 'unmatched';
      let internal_txn_id = null;

      if (payments && payments.length > 0) {
        const match = payments.find(p => 
          Math.abs(parseFloat(p.amount) - parseFloat(txn.amount)) < 0.01
        );

        if (match) {
          status = 'matched';
          internal_txn_id = match.id;
          results.matched++;
        } else {
          status = 'partial';
          results.partial++;
        }
      } else {
        results.unmatched++;
      }

      // Insert reconciliation record
      const { data: recon } = await supabase
        .from('finance_reconciliation_records')
        .insert([{
          tenant_id,
          provider_id,
          reference: txn.reference,
          internal_txn_id,
          amount: txn.amount,
          status,
          source,
          matched_by: status === 'matched' ? effectiveUserId : null,
          reconciled_at: status === 'matched' ? new Date().toISOString() : null,
          raw_data: txn,
        }])
        .select()
        .single();

      // Create audit log
      if (recon) {
        await supabase.from('finance_reconciliation_audit').insert([{
          tenant_id,
          reconciliation_id: recon.id,
          action: `${status === 'matched' ? 'auto_' : ''}${status}`,
          performed_by: effectiveUserId,
        }]);
      }
    }

    console.log('Reconciliation complete:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error reconciling transactions:', error);
    return new Response(
      JSON.stringify({ success: false, error: sanitizeError(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
