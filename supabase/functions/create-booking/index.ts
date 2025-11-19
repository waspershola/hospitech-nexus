import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AVAILABLE_ADDONS = [
  { id: 'breakfast', label: 'Breakfast', price: 2500, type: 'per_night' },
  { id: 'late_checkout', label: 'Late Checkout (2 PM)', price: 5000, type: 'one_time' },
  { id: 'early_checkin', label: 'Early Check-In (10 AM)', price: 3000, type: 'one_time' },
  { id: 'airport_pickup', label: 'Airport Pickup', price: 15000, type: 'one_time' },
  { id: 'parking', label: 'Parking', price: 1500, type: 'per_night' },
  { id: 'wifi_premium', label: 'Premium WiFi', price: 1000, type: 'per_night' },
];

async function applyPlatformFee(
  supabase: any,
  tenant_id: string,
  booking_id: string,
  total_amount_from_frontend: number
): Promise<{applied: boolean; fee_amount: number; base_amount: number}> {
  try {
    console.log('[platform-fee] Extracting fee from total:', total_amount_from_frontend);
    
    const { data: feeConfig, error: configError } = await supabase
      .from('platform_fee_configurations')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('active', true)
      .single();
    
    if (configError || !feeConfig) {
      console.log('[platform-fee] No active booking fee config');
      return { applied: false, fee_amount: 0, base_amount: total_amount_from_frontend };
    }
    
    if (!feeConfig.applies_to.includes('bookings')) {
      console.log('[platform-fee] Bookings not in applies_to array');
      return { applied: false, fee_amount: 0, base_amount: total_amount_from_frontend };
    }
    
    if (feeConfig.trial_exemption_enabled) {
      const { data: tenant } = await supabase
        .from('platform_tenants')
        .select('trial_end_date, created_at')
        .eq('id', tenant_id)
        .single();
      
      if (tenant) {
        const trialEndDate = tenant.trial_end_date 
          ? new Date(tenant.trial_end_date)
          : new Date(new Date(tenant.created_at).getTime() + feeConfig.trial_days * 86400000);
        
        if (trialEndDate > new Date()) {
          console.log('[platform-fee] Tenant in trial, skipping fee');
          return { applied: false, fee_amount: 0, base_amount: total_amount_from_frontend };
        }
      }
    }
    
    let baseAmount: number;
    let feeAmount: number;
    
    if (feeConfig.payer === 'guest' && feeConfig.mode === 'inclusive') {
      if (feeConfig.fee_type === 'percentage') {
        baseAmount = total_amount_from_frontend / (1 + feeConfig.booking_fee / 100);
        feeAmount = total_amount_from_frontend - baseAmount;
      } else {
        feeAmount = feeConfig.booking_fee;
        baseAmount = total_amount_from_frontend - feeAmount;
      }
    } else if (feeConfig.payer === 'property' && feeConfig.mode === 'exclusive') {
      baseAmount = total_amount_from_frontend;
      if (feeConfig.fee_type === 'percentage') {
        feeAmount = (baseAmount * feeConfig.booking_fee) / 100;
      } else {
        feeAmount = feeConfig.booking_fee;
      }
    } else {
      return { applied: false, fee_amount: 0, base_amount: total_amount_from_frontend };
    }
    
    const { error: ledgerError } = await supabase
      .from('platform_fee_ledger')
      .insert({
        tenant_id,
        reference_type: 'booking',
        reference_id: booking_id,
        base_amount: baseAmount,
        fee_amount: feeAmount,
        rate: feeConfig.fee_type === 'percentage' ? feeConfig.booking_fee : null,
        billing_cycle: feeConfig.billing_cycle,
        payer: feeConfig.payer,
        status: feeConfig.billing_cycle === 'realtime' ? 'billed' : 'pending'
      });
    
    if (ledgerError) {
      console.error('[platform-fee] Ledger insert failed:', ledgerError);
      return { applied: false, fee_amount: 0, base_amount: total_amount_from_frontend };
    }
    
    console.log('[platform-fee] Fee recorded:', { baseAmount, feeAmount });
    return { applied: true, fee_amount: feeAmount, base_amount: baseAmount };
    
  } catch (error) {
    console.error('[platform-fee] Error:', error);
    return { applied: false, fee_amount: 0, base_amount: total_amount_from_frontend };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CREATE-BOOKING-V3] Request received');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const {
      guest_id,
      room_id,
      check_in,
      check_out,
      total_amount,
      booking_reference,
      status = 'reserved',
      source = 'front_desk',
      notes,
      metadata = {},
      tenant_id,
      organization_id,
      addons = [],
      requiresApproval = false,
      approvalStatus,
      overriddenRate,
      // Group booking fields
      group_booking,
      group_id,
      group_name,
      group_size,
      group_leader,
      is_part_of_group,
      total_rooms_in_group,
    } = body;

    if (!guest_id || !room_id || !check_in || !check_out || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const enrichedMetadata = {
      ...metadata,
      addons: addons || [],
      requiresApproval: requiresApproval || false,
      approvalStatus: approvalStatus || (requiresApproval ? 'pending' : 'approved'),
      overriddenRate: overriddenRate || null,
      // Group booking metadata
      group_booking,
      group_id,
      group_name,
      group_size,
      group_leader,
      isGroupBooking: group_booking,
      is_part_of_group,
      total_rooms_in_group,
      createdAt: new Date().toISOString(),
      version: 'CREATE-BOOKING-V3.1-UUID-CAST'
    };

    const isGroupBooking = enrichedMetadata.group_id && enrichedMetadata.isGroupBooking;
    
    if (isGroupBooking) {
      console.log('[GROUP-MASTER-V1] Group booking detected:', enrichedMetadata.group_id);
    }

    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        guest_id,
        room_id,
        check_in,
        check_out,
        total_amount,
        booking_reference,
        status,
        source,
        notes,
        metadata: enrichedMetadata,
        tenant_id,
        organization_id,
      })
      .select()
      .single();

    if (bookingError) {
      console.error('[CREATE-BOOKING-V3] Booking failed:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Failed to create booking', details: bookingError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-BOOKING-V3.1-UUID-CAST] Booking created:', newBooking.id);

    let platformFeeResult = { applied: false, fee_amount: 0, base_amount: total_amount };
    try {
      platformFeeResult = await applyPlatformFee(supabase, tenant_id, newBooking.id, total_amount);
    } catch (feeError) {
      console.error('[CREATE-BOOKING-V3.1-UUID-CAST] Platform fee failed (non-blocking):', feeError);
    }

    let masterFolioResult = null;
    if (isGroupBooking) {
      try {
        console.log('[GROUP-MASTER-V1] Group booking detected:', enrichedMetadata.group_id);
        
        // Validate group_id is a valid UUID format
        if (enrichedMetadata.group_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(enrichedMetadata.group_id)) {
          throw new Error(`Invalid group_id UUID format: ${enrichedMetadata.group_id}`);
        }
        
        console.log('[GROUP-MASTER-V1] Creating master folio...');
        
        const { data: masterFolio, error: masterFolioError } = await supabase
          .rpc('create_group_master_folio', {
            p_tenant_id: tenant_id,
            p_group_id: enrichedMetadata.group_id,
            p_master_booking_id: newBooking.id,
            p_guest_id: guest_id,
            p_group_name: enrichedMetadata.group_name || 'Group Booking'
          });

        if (masterFolioError) {
          console.error('[GROUP-MASTER-V1] Master folio failed (non-blocking):', masterFolioError);
        } else {
          console.log('[GROUP-MASTER-V1] Master folio created:', masterFolio);
          masterFolioResult = masterFolio;
        }
      } catch (groupError) {
        console.error('[GROUP-MASTER-V1] Exception (non-blocking):', groupError);
      }
    }

    const response = {
      success: true,
      booking: newBooking,
      platform_fee: platformFeeResult,
      master_folio: masterFolioResult,
      message: 'Booking created successfully'
    };

    return new Response(
      JSON.stringify(response),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[CREATE-BOOKING-V3.1-UUID-CAST] FATAL ERROR:', error);
    console.error('[CREATE-BOOKING-V3.1-UUID-CAST] Stack:', error?.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error?.message || String(error),
        stack: error?.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
