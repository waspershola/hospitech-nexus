import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('[waive-platform-fee] Auth error:', authError);
      throw new Error('Unauthorized');
    }

    console.log('[waive-platform-fee] Request from user:', user.id);

    // Verify user is a platform admin
    const { data: platformUser, error: platformUserError } = await supabaseClient
      .from('platform_users')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (platformUserError || !platformUser || platformUser.role !== 'admin') {
      console.error('[waive-platform-fee] Not authorized - not platform admin:', {
        platformUser,
        error: platformUserError
      });
      throw new Error('Only platform admins can waive fees');
    }

    const { ledger_ids, waived_reason, approval_notes } = await req.json();

    if (!ledger_ids || !Array.isArray(ledger_ids) || ledger_ids.length === 0) {
      throw new Error('ledger_ids array is required');
    }

    if (!waived_reason || waived_reason.trim().length === 0) {
      throw new Error('waived_reason is required');
    }

    console.log('[waive-platform-fee] Waiving fees:', {
      ledger_ids,
      waived_reason,
      waived_by: user.id,
      count: ledger_ids.length
    });

    // Fetch the ledger entries to validate and get details
    const { data: ledgerEntries, error: fetchError } = await supabaseClient
      .from('platform_fee_ledger')
      .select('id, tenant_id, fee_amount, status, reference_type, reference_id')
      .in('id', ledger_ids);

    if (fetchError) {
      console.error('[waive-platform-fee] Error fetching ledger entries:', fetchError);
      throw new Error(`Failed to fetch ledger entries: ${fetchError.message}`);
    }

    if (!ledgerEntries || ledgerEntries.length === 0) {
      throw new Error('No ledger entries found for provided IDs');
    }

    // Validate that fees can be waived (only pending or billed fees)
    const invalidStatuses = ledgerEntries.filter(
      entry => !['pending', 'billed'].includes(entry.status)
    );

    if (invalidStatuses.length > 0) {
      throw new Error(
        `Cannot waive fees with status: ${invalidStatuses.map(e => e.status).join(', ')}. Only pending or billed fees can be waived.`
      );
    }

    // Update ledger entries to waived status
    const { error: updateError } = await supabaseClient
      .from('platform_fee_ledger')
      .update({
        status: 'waived',
        waived_at: new Date().toISOString(),
        waived_by: user.id,
        waived_reason: waived_reason.trim(),
        metadata: {
          approval_notes: approval_notes || null,
          waived_by_email: user.email
        }
      })
      .in('id', ledger_ids);

    if (updateError) {
      console.error('[waive-platform-fee] Error updating ledger:', updateError);
      throw new Error(`Failed to waive fees: ${updateError.message}`);
    }

    // Calculate total waived amount
    const totalWaivedAmount = ledgerEntries.reduce(
      (sum, entry) => sum + Number(entry.fee_amount),
      0
    );

    console.log('[waive-platform-fee] Successfully waived fees:', {
      count: ledger_ids.length,
      total_amount: totalWaivedAmount,
      waived_by: user.id
    });

    // Create audit log entries for each waived fee
    const auditLogs = ledgerEntries.map(entry => ({
      tenant_id: entry.tenant_id,
      event_type: 'platform_fee_waived',
      user_id: user.id,
      target_id: entry.id,
      payload: {
        ledger_id: entry.id,
        reference_type: entry.reference_type,
        reference_id: entry.reference_id,
        fee_amount: entry.fee_amount,
        waived_reason,
        approval_notes,
        waived_by_email: user.email
      }
    }));

    const { error: auditError } = await supabaseClient
      .from('finance_audit_events')
      .insert(auditLogs);

    if (auditError) {
      console.error('[waive-platform-fee] Error creating audit logs:', auditError);
      // Don't throw - audit failure shouldn't block the waiver
    }

    return new Response(
      JSON.stringify({
        success: true,
        waived_count: ledger_ids.length,
        total_waived_amount: totalWaivedAmount,
        ledger_ids
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[waive-platform-fee] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
