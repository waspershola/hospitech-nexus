import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check role - only owners/managers can purchase
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role, tenant_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!userRole || !['owner', 'manager'].includes(userRole.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { tenant_id, marketplace_item_id, payment_method, payment_reference } = body;

    if (!tenant_id || !marketplace_item_id || !payment_method || !payment_reference) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify tenant match
    if (tenant_id !== userRole.tenant_id) {
      return new Response(JSON.stringify({ error: 'Tenant mismatch' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing SMS bundle purchase for tenant ${tenant_id}`);

    // Get marketplace item
    const { data: item, error: itemError } = await supabase
      .from('sms_marketplace_items')
      .select('*')
      .eq('id', marketplace_item_id)
      .eq('is_active', true)
      .maybeSingle();

    if (itemError || !item) {
      return new Response(JSON.stringify({ error: 'Marketplace item not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Item found: ${item.name} - ${item.credits_amount} credits for ${item.price_amount}`);

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        tenant_id,
        transaction_ref: payment_reference,
        amount: item.price_amount,
        method: payment_method,
        status: 'completed',
        recorded_by: user.id,
        metadata: {
          purchase_type: 'sms_bundle',
          marketplace_item_id,
          credits_amount: item.credits_amount,
        },
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment creation error:', paymentError);
      throw paymentError;
    }

    // Create purchase record
    const expiresAt = item.validity_days
      ? new Date(Date.now() + item.validity_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data: purchase, error: purchaseError } = await supabase
      .from('tenant_sms_purchases')
      .insert({
        tenant_id,
        marketplace_item_id,
        credits_purchased: item.credits_amount,
        amount_paid: item.price_amount,
        currency: item.currency,
        payment_id: payment.id,
        status: 'completed',
        purchased_by: user.id,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Purchase record error:', purchaseError);
      throw purchaseError;
    }

    // Update SMS quota
    const { data: currentQuota } = await supabase
      .from('tenant_sms_quota')
      .select('quota_total, quota_used')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (currentQuota) {
      // Update existing quota
      await supabase
        .from('tenant_sms_quota')
        .update({
          quota_total: currentQuota.quota_total + item.credits_amount,
          last_purchase_at: new Date().toISOString(),
          quota_reset_date: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenant_id);

      console.log(`Quota updated: ${currentQuota.quota_total} + ${item.credits_amount} = ${currentQuota.quota_total + item.credits_amount}`);
    } else {
      // Create new quota record
      await supabase
        .from('tenant_sms_quota')
        .insert({
          tenant_id,
          quota_total: item.credits_amount,
          quota_used: 0,
          last_purchase_at: new Date().toISOString(),
          quota_reset_date: expiresAt,
        });

      console.log(`New quota created: ${item.credits_amount} credits`);
    }

    return new Response(JSON.stringify({
      success: true,
      purchase_id: purchase.id,
      credits_added: item.credits_amount,
      new_total: (currentQuota?.quota_total || 0) + item.credits_amount,
      expires_at: expiresAt,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Purchase error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
