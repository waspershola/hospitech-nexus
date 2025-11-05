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

    if (platformError || !platformUser || !['super_admin', 'support_admin'].includes(platformUser.role)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Platform admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const method = req.method;
    const url = new URL(req.url);
    const tenantId = url.pathname.split('/').pop();

    // CREATE TENANT
    if (method === 'POST' && url.pathname === '/tenant-management/create') {
      const { hotel_name, owner_email, plan_id, domain } = await req.json();

      if (!hotel_name || !owner_email || !plan_id) {
        return new Response(
          JSON.stringify({ error: 'hotel_name, owner_email, and plan_id are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create tenant
      const slug = hotel_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({ name: hotel_name, slug })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Create platform tenant entry
      const { error: platformTenantError } = await supabase
        .from('platform_tenants')
        .insert({
          id: tenant.id,
          domain,
          status: 'trial',
          plan_id,
          owner_email,
        });

      if (platformTenantError) throw platformTenantError;

      // Create default financial settings
      const { error: financialError } = await supabase
        .from('hotel_financials')
        .insert({
          tenant_id: tenant.id,
          vat_rate: 0,
          vat_inclusive: false,
          service_charge: 0,
          service_charge_inclusive: false,
          currency: 'NGN',
          currency_symbol: '₦',
          symbol_position: 'before',
          decimal_separator: '.',
          thousand_separator: ',',
          decimal_places: 2,
        });

      if (financialError) console.error('Financial settings error:', financialError);

      // Create default branding
      const { error: brandingError } = await supabase
        .from('hotel_branding')
        .insert({
          tenant_id: tenant.id,
          primary_color: 'hsl(0 65% 51%)',
          secondary_color: 'hsl(51 100% 50%)',
          accent_color: 'hsl(51 85% 65%)',
          font_heading: 'Playfair Display',
          font_body: 'Inter',
        });

      if (brandingError) console.error('Branding error:', brandingError);

      // Create default hotel meta
      const { error: metaError } = await supabase
        .from('hotel_meta')
        .insert({
          tenant_id: tenant.id,
          hotel_name,
          tagline: `Welcome to ${hotel_name}`,
        });

      if (metaError) console.error('Meta error:', metaError);

      // Log audit event
      await supabase
        .from('platform_audit_stream')
        .insert({
          action: 'tenant_created',
          resource_type: 'tenant',
          resource_id: tenant.id,
          actor_id: user.id,
          actor_role: platformUser.role,
          payload: {
            tenant_id: tenant.id,
            hotel_name,
            owner_email,
            plan_id,
            domain,
          },
        });

      return new Response(
        JSON.stringify({ success: true, tenant }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE TENANT
    if (method === 'PATCH' && tenantId) {
      const updates = await req.json();

      const { error: updateError } = await supabase
        .from('platform_tenants')
        .update(updates)
        .eq('id', tenantId);

      if (updateError) throw updateError;

      // Log audit event
      await supabase
        .from('platform_audit_stream')
        .insert({
          action: 'tenant_updated',
          resource_type: 'tenant',
          resource_id: tenantId,
          actor_id: user.id,
          actor_role: platformUser.role,
          payload: { tenant_id: tenantId, updates },
        });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SUSPEND TENANT
    if (method === 'POST' && url.pathname.includes('/suspend')) {
      const { error: suspendError } = await supabase
        .from('platform_tenants')
        .update({ status: 'suspended' })
        .eq('id', tenantId);

      if (suspendError) throw suspendError;

      // Log audit event
      await supabase
        .from('platform_audit_stream')
        .insert({
          action: 'tenant_suspended',
          resource_type: 'tenant',
          resource_id: tenantId,
          actor_id: user.id,
          actor_role: platformUser.role,
          payload: { tenant_id: tenantId },
        });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTIVATE TENANT
    if (method === 'POST' && url.pathname.includes('/activate')) {
      const { error: activateError } = await supabase
        .from('platform_tenants')
        .update({ status: 'active' })
        .eq('id', tenantId);

      if (activateError) throw activateError;

      // Log audit event
      await supabase
        .from('platform_audit_stream')
        .insert({
          action: 'tenant_activated',
          resource_type: 'tenant',
          resource_id: tenantId,
          actor_id: user.id,
          actor_role: platformUser.role,
          payload: { tenant_id: tenantId },
        });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE TENANT (soft delete)
    if (method === 'DELETE' && tenantId) {
      const { error: deleteError } = await supabase
        .from('platform_tenants')
        .update({ status: 'cancelled' })
        .eq('id', tenantId);

      if (deleteError) throw deleteError;

      // Log audit event
      await supabase
        .from('platform_audit_stream')
        .insert({
          action: 'tenant_deleted',
          resource_type: 'tenant',
          resource_id: tenantId,
          actor_id: user.id,
          actor_role: platformUser.role,
          payload: { tenant_id: tenantId },
        });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Tenant management error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
