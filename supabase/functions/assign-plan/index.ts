import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssignPlanRequest {
  tenant_id: string;
  plan_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check platform admin role
    const { data: platformUser } = await supabase
      .from('platform_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!platformUser || !['super_admin', 'billing_bot'].includes(platformUser.role)) {
      throw new Error('Insufficient permissions');
    }

    const { tenant_id, plan_id }: AssignPlanRequest = await req.json();

    console.log('Assigning plan:', { tenant_id, plan_id });

    // Verify plan exists and is active
    const { data: plan, error: planError } = await supabase
      .from('platform_plans')
      .select('*')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      throw new Error('Plan not found or inactive');
    }

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      throw new Error('Tenant not found');
    }

    // Update tenant with plan assignment
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        plan_id: plan_id,
        plan_assigned_at: new Date().toISOString(),
        trial_ends_at: plan.trial_days > 0 
          ? new Date(Date.now() + plan.trial_days * 24 * 60 * 60 * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenant_id);

    if (updateError) {
      throw updateError;
    }

    // Log audit event
    await supabase.from('platform_audit_events').insert({
      event_type: 'plan_assigned',
      user_id: user.id,
      target_id: tenant_id,
      payload: {
        plan_id,
        plan_name: plan.name,
        tenant_name: tenant.name,
        trial_days: plan.trial_days,
      },
    });

    console.log('Plan assigned successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Plan assigned successfully',
        plan: plan.name,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error assigning plan:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to assign plan' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
