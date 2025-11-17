import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecordFeeRequest {
  request_id: string;
  tenant_id: string;
  service_category: string;
  amount: number;
  payment_location?: string;
  payment_method?: string;
}

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

    const requestData: RecordFeeRequest = await req.json();
    const { request_id, tenant_id, service_category, amount, payment_location, payment_method } = requestData;

    console.log('[record-platform-fee] Recording fee for request:', request_id, 'tenant:', tenant_id);

    // Fetch active platform fee configuration
    const { data: feeConfig, error: configError } = await supabaseClient
      .from('platform_fee_configurations')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('active', true)
      .single();

    if (configError || !feeConfig) {
      console.log('[record-platform-fee] No active fee config found, skipping fee recording');
      return new Response(
        JSON.stringify({ success: true, message: 'No active fee configuration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if QR payments are covered
    if (!feeConfig.applies_to || !feeConfig.applies_to.includes('qr_payments')) {
      console.log('[record-platform-fee] Fee config does not apply to QR payments');
      return new Response(
        JSON.stringify({ success: true, message: 'Fee config does not apply to QR payments' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check trial exemption
    if (feeConfig.trial_exemption_enabled) {
      const { data: platformTenant } = await supabaseClient
        .from('platform_tenants')
        .select('trial_end_date, created_at')
        .eq('id', tenant_id)
        .single();

      if (platformTenant) {
        const trialEndDate = platformTenant.trial_end_date 
          ? new Date(platformTenant.trial_end_date)
          : new Date(new Date(platformTenant.created_at).getTime() + (feeConfig.trial_days || 14) * 86400000);
        
        if (trialEndDate > new Date()) {
          console.log('[record-platform-fee] Tenant in trial period, fee exempted');
          return new Response(
            JSON.stringify({ success: true, message: 'Trial exemption active' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Reverse-calculate platform fee from total amount
    // Frontend already included fee in amount, so extract it
    let base_amount: number;
    let fee_amount: number;

    if (feeConfig.payer === 'guest' && feeConfig.mode === 'inclusive') {
      // Guest pays, fee was added to total
      if (feeConfig.fee_type === 'percentage') {
        // amount = base * (1 + rate/100)
        // base = amount / (1 + rate/100)
        base_amount = amount / (1 + feeConfig.qr_fee / 100);
        fee_amount = amount - base_amount;
      } else {
        // Flat fee
        fee_amount = feeConfig.qr_fee;
        base_amount = amount - fee_amount;
      }
    } else if (feeConfig.payer === 'property' && feeConfig.mode === 'exclusive') {
      // Property pays, fee deducted from their revenue
      base_amount = amount; // Guest paid original amount
      if (feeConfig.fee_type === 'percentage') {
        fee_amount = amount * (feeConfig.qr_fee / 100);
      } else {
        fee_amount = feeConfig.qr_fee;
      }
    } else {
      // No fee scenario
      console.log('[record-platform-fee] Fee configuration does not require recording');
      return new Response(
        JSON.stringify({ success: true, message: 'No fee applicable' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert fee into platform_fee_ledger
    const ledgerStatus = feeConfig.billing_cycle === 'realtime' ? 'billed' : 'pending';
    
    const { data: ledgerEntry, error: ledgerError } = await supabaseClient
      .from('platform_fee_ledger')
      .insert({
        tenant_id,
        reference_type: 'qr_payment',
        reference_id: request_id,
        base_amount: Math.round(base_amount * 100) / 100,
        fee_amount: Math.round(fee_amount * 100) / 100,
        rate: feeConfig.qr_fee,
        fee_type: feeConfig.fee_type,
        billing_cycle: feeConfig.billing_cycle,
        payer: feeConfig.payer,
        status: ledgerStatus,
        metadata: {
          service_category,
          payment_location,
          payment_method,
          recorded_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (ledgerError) {
      console.error('[record-platform-fee] Error inserting ledger entry:', ledgerError);
      throw ledgerError;
    }

    console.log('[record-platform-fee] Fee recorded successfully:', ledgerEntry.id);

    // Create audit event
    await supabaseClient
      .from('finance_audit_events')
      .insert({
        tenant_id,
        event_type: 'platform_fee_recorded',
        target_id: ledgerEntry.id,
        payload: {
          request_id,
          service_category,
          base_amount,
          fee_amount,
          rate: feeConfig.qr_fee,
          billing_cycle: feeConfig.billing_cycle,
          payer: feeConfig.payer,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        ledger_entry_id: ledgerEntry.id,
        fee_amount,
        base_amount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[record-platform-fee] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
