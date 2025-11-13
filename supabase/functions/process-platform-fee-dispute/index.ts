import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Processing dispute for user:', user.id);

    // Verify user is platform admin
    const { data: platformUser } = await supabase
      .from('platform_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!platformUser || !['super_admin', 'support_admin'].includes(platformUser.role)) {
      throw new Error('Insufficient permissions. Only platform admins can process disputes.');
    }

    // Get request body
    const { dispute_id } = await req.json();

    if (!dispute_id) {
      throw new Error('dispute_id is required');
    }

    console.log('Processing dispute ID:', dispute_id);

    // Fetch dispute details
    const { data: dispute, error: disputeError } = await supabase
      .from('platform_fee_disputes')
      .select(`
        *,
        tenants!inner(name)
      `)
      .eq('id', dispute_id)
      .single();

    if (disputeError || !dispute) {
      throw new Error('Dispute not found');
    }

    if (dispute.status !== 'approved') {
      throw new Error('Only approved disputes can be processed');
    }

    console.log('Processing dispute:', {
      action: dispute.requested_action,
      ledger_count: dispute.ledger_ids.length,
      tenant: dispute.tenants?.name
    });

    let processResult: any = { success: false };

    // Process based on requested action
    if (dispute.requested_action === 'waive') {
      console.log('Processing WAIVE action - calling waive-platform-fee function');
      
      // Call waive-platform-fee edge function
      const { data: waiveResult, error: waiveError } = await supabase.functions.invoke(
        'waive-platform-fee',
        {
          body: {
            ledger_ids: dispute.ledger_ids,
            waived_reason: `Dispute #${dispute.id} approved: ${dispute.resolution_notes || 'Fee dispute resolved in favor of tenant'}`,
          },
        }
      );

      if (waiveError) {
        console.error('Waive function error:', waiveError);
        throw new Error(`Failed to waive fees: ${waiveError.message}`);
      }

      console.log('Waive result:', waiveResult);
      processResult = { success: true, action: 'waived', waived_count: dispute.ledger_ids.length };

    } else if (dispute.requested_action === 'reduce') {
      console.log('Processing REDUCE action - creating partial refund');

      if (!dispute.requested_amount || dispute.requested_amount <= 0) {
        throw new Error('Invalid requested_amount for reduce action');
      }

      // Fetch ledger entries to validate
      const { data: ledgerEntries, error: ledgerError } = await supabase
        .from('platform_fee_ledger')
        .select('fee_amount, tenant_id, reference_type')
        .in('id', dispute.ledger_ids);

      if (ledgerError || !ledgerEntries || ledgerEntries.length === 0) {
        throw new Error('Failed to fetch disputed ledger entries');
      }

      const totalDisputedAmount = ledgerEntries.reduce((sum, entry) => sum + entry.fee_amount, 0);

      if (dispute.requested_amount > totalDisputedAmount) {
        throw new Error(`Requested refund (${dispute.requested_amount}) exceeds total disputed amount (${totalDisputedAmount})`);
      }

      // Create partial refund ledger entry (negative fee)
      const { error: refundError } = await supabase
        .from('platform_fee_ledger')
        .insert({
          tenant_id: dispute.tenant_id,
          reference_type: 'dispute_refund',
          reference_id: dispute.id,
          base_amount: 0,
          fee_amount: -dispute.requested_amount, // Negative amount for refund
          rate: 0,
          fee_type: 'flat',
          billing_cycle: 'realtime',
          payer: 'property',
          status: 'billed',
          billed_at: new Date().toISOString(),
          metadata: {
            dispute_id: dispute.id,
            original_ledger_ids: dispute.ledger_ids,
            refund_reason: dispute.resolution_notes || 'Partial refund from dispute resolution',
            processed_by: user.id,
          },
        });

      if (refundError) {
        console.error('Refund entry creation error:', refundError);
        throw new Error(`Failed to create refund entry: ${refundError.message}`);
      }

      console.log('Created partial refund entry:', {
        amount: -dispute.requested_amount,
        dispute_id: dispute.id
      });

      processResult = { 
        success: true, 
        action: 'reduced', 
        refund_amount: dispute.requested_amount,
        original_amount: totalDisputedAmount
      };

    } else if (dispute.requested_action === 'review') {
      console.log('Processing REVIEW action - no automated action required');
      processResult = { success: true, action: 'reviewed', message: 'Review completed, no fees modified' };
    }

    // Send resolution notification to tenant
    console.log('Sending resolution notification to tenant');

    // Find owner/manager of the tenant to send notification
    const { data: tenantOwners } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('tenant_id', dispute.tenant_id)
      .eq('role', 'owner')
      .limit(1);

    if (tenantOwners && tenantOwners.length > 0) {
      // Here you would typically insert into a notifications table or send email
      // For now, we'll log it
      console.log('Notification would be sent to user:', tenantOwners[0].user_id);
    }

    // Create audit event
    await supabase
      .from('finance_audit_events')
      .insert({
        tenant_id: dispute.tenant_id,
        event_type: 'platform_fee_dispute_processed',
        user_id: user.id,
        target_id: dispute.id,
        payload: {
          dispute_id: dispute.id,
          requested_action: dispute.requested_action,
          process_result: processResult,
          resolution_notes: dispute.resolution_notes,
        },
      });

    console.log('Dispute processed successfully:', processResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Dispute processed successfully',
        dispute_id: dispute.id,
        result: processResult,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing dispute:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
