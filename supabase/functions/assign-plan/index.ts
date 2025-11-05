import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Verify user is platform admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is platform admin
    const { data: platformUser, error: platformError } = await supabase
      .from('platform_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (platformError || !platformUser || !['super_admin', 'billing_bot'].includes(platformUser.role)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Platform admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { tenant_id, plan_id, apply_pro_rata = false } = await req.json();

    if (!tenant_id || !plan_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_id and plan_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get old plan
    const { data: oldTenant, error: oldTenantError } = await supabase
      .from('platform_tenants')
      .select('plan_id, platform_plans!inner(monthly_price)')
      .eq('id', tenant_id)
      .single();

    if (oldTenantError) throw oldTenantError;

    // Get new plan
    const { data: newPlan, error: newPlanError } = await supabase
      .from('platform_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (newPlanError) throw newPlanError;

    // Calculate pro-rata adjustment if needed
    let adjustmentAmount = 0;
    let adjustmentNote = '';

    if (apply_pro_rata && oldTenant.plan_id) {
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const daysRemaining = daysInMonth - today.getDate();
      const oldPlanData: any = oldTenant.platform_plans;
      const dailyRateOld = (oldPlanData?.monthly_price || 0) / daysInMonth;
      const dailyRateNew = newPlan.monthly_price / daysInMonth;
      
      adjustmentAmount = (dailyRateNew - dailyRateOld) * daysRemaining;
      adjustmentNote = `Pro-rata adjustment for ${daysRemaining} days remaining in current cycle`;
    }

    // Update tenant plan
    const { error: updateError } = await supabase
      .from('platform_tenants')
      .update({ plan_id: plan_id })
      .eq('id', tenant_id);

    if (updateError) throw updateError;

    // Create billing adjustment if pro-rata
    if (apply_pro_rata && adjustmentAmount !== 0) {
      const { error: billingError } = await supabase
        .from('platform_billing')
        .insert({
          tenant_id: tenant_id,
          invoice_type: 'adjustment',
          amount_due: adjustmentAmount,
          amount_paid: 0,
          status: 'pending',
          billing_period_start: new Date().toISOString(),
          billing_period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
          payload: {
            type: 'plan_change',
            old_plan_id: oldTenant.plan_id,
            new_plan_id: plan_id,
            note: adjustmentNote,
          },
        });

      if (billingError) throw billingError;
    }

    // Log audit event
    const { error: auditError } = await supabase
      .from('platform_audit_stream')
      .insert({
        action: 'plan_assigned',
        resource_type: 'tenant',
        resource_id: tenant_id,
        actor_id: user.id,
        actor_role: platformUser.role,
        payload: {
          tenant_id,
          old_plan_id: oldTenant.plan_id,
          new_plan_id: plan_id,
          adjustment_amount: adjustmentAmount,
          pro_rata_applied: apply_pro_rata,
        },
      });

    if (auditError) console.error('Audit log error:', auditError);

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id,
        plan_id,
        adjustment: {
          amount: adjustmentAmount,
          note: adjustmentNote,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Assign plan error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
