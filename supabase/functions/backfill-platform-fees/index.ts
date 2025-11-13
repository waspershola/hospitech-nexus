import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    console.log('[backfill-platform-fees] Starting backfill process...');

    // Get all paid QR requests that don't have ledger entries
    const { data: paidRequests, error: requestsError } = await supabaseClient
      .from('requests')
      .select('id, tenant_id, service_category, metadata, created_at')
      .in('service_category', ['digital_menu', 'room_service', 'laundry', 'spa', 'dining_reservation'])
      .not('metadata->payment_info->status', 'is', null)
      .order('created_at', { ascending: true });

    if (requestsError) {
      throw requestsError;
    }

    console.log(`[backfill-platform-fees] Found ${paidRequests?.length || 0} paid requests`);

    let backfilled = 0;
    let skipped = 0;
    let errors = 0;

    for (const request of paidRequests || []) {
      const paymentStatus = request.metadata?.payment_info?.status;
      
      if (paymentStatus !== 'paid') {
        skipped++;
        continue;
      }

      // Check if ledger entry already exists
      const { data: existingEntry } = await supabaseClient
        .from('platform_fee_ledger')
        .select('id')
        .eq('reference_type', 'qr_payment')
        .eq('reference_id', request.id)
        .single();

      if (existingEntry) {
        console.log(`[backfill-platform-fees] Ledger entry already exists for request ${request.id}, skipping`);
        skipped++;
        continue;
      }

      // Get fee config for this tenant
      const { data: feeConfig, error: configError } = await supabaseClient
        .from('platform_fee_configurations')
        .select('*')
        .eq('tenant_id', request.tenant_id)
        .eq('active', true)
        .single();

      if (configError || !feeConfig) {
        console.log(`[backfill-platform-fees] No active fee config for tenant ${request.tenant_id}, skipping`);
        skipped++;
        continue;
      }

      if (!feeConfig.applies_to?.includes('qr_payments')) {
        skipped++;
        continue;
      }

      // Check trial exemption at time of payment
      if (feeConfig.trial_exemption_enabled) {
        const { data: platformTenant } = await supabaseClient
          .from('platform_tenants')
          .select('trial_end_date, created_at')
          .eq('id', request.tenant_id)
          .single();

        if (platformTenant) {
          const requestDate = new Date(request.created_at);
          const trialEndDate = platformTenant.trial_end_date 
            ? new Date(platformTenant.trial_end_date)
            : new Date(new Date(platformTenant.created_at).getTime() + (feeConfig.trial_days || 14) * 86400000);
          
          if (requestDate < trialEndDate) {
            console.log(`[backfill-platform-fees] Request ${request.id} was during trial period, skipping`);
            skipped++;
            continue;
          }
        }
      }

      // Extract amount from metadata
      const amount = request.metadata?.payment_info?.amount;
      if (!amount || amount <= 0) {
        console.log(`[backfill-platform-fees] No valid amount for request ${request.id}, skipping`);
        skipped++;
        continue;
      }

      // Calculate platform fee (reverse calculation)
      let base_amount: number;
      let fee_amount: number;

      if (feeConfig.payer === 'guest' && feeConfig.mode === 'inclusive') {
        if (feeConfig.fee_type === 'percentage') {
          base_amount = amount / (1 + feeConfig.qr_fee / 100);
          fee_amount = amount - base_amount;
        } else {
          fee_amount = feeConfig.qr_fee;
          base_amount = amount - fee_amount;
        }
      } else if (feeConfig.payer === 'property' && feeConfig.mode === 'exclusive') {
        base_amount = amount;
        if (feeConfig.fee_type === 'percentage') {
          fee_amount = amount * (feeConfig.qr_fee / 100);
        } else {
          fee_amount = feeConfig.qr_fee;
        }
      } else {
        skipped++;
        continue;
      }

      // Insert ledger entry (mark as settled since payment already collected)
      const { error: insertError } = await supabaseClient
        .from('platform_fee_ledger')
        .insert({
          tenant_id: request.tenant_id,
          reference_type: 'qr_payment',
          reference_id: request.id,
          base_amount: Math.round(base_amount * 100) / 100,
          fee_amount: Math.round(fee_amount * 100) / 100,
          rate: feeConfig.qr_fee,
          fee_type: feeConfig.fee_type,
          billing_cycle: feeConfig.billing_cycle,
          payer: feeConfig.payer,
          status: 'settled',
          settled_at: request.metadata?.payment_info?.collected_at || request.created_at,
          metadata: {
            service_category: request.service_category,
            backfilled: true,
            original_payment_date: request.metadata?.payment_info?.collected_at,
          },
        });

      if (insertError) {
        console.error(`[backfill-platform-fees] Error inserting entry for ${request.id}:`, insertError);
        errors++;
      } else {
        console.log(`[backfill-platform-fees] Backfilled fee for request ${request.id}`);
        backfilled++;
      }
    }

    const summary = {
      total_requests: paidRequests?.length || 0,
      backfilled,
      skipped,
      errors,
      message: `Backfill complete: ${backfilled} fees recorded, ${skipped} skipped, ${errors} errors`,
    };

    console.log('[backfill-platform-fees] Summary:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[backfill-platform-fees] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
