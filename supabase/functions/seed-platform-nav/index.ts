import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if Platform Dashboard already exists
    const { data: existing } = await supabase
      .from('platform_nav_items')
      .select('id')
      .eq('path', '/dashboard/platform-admin')
      .maybeSingle();

    if (!existing) {
      // Insert Platform Dashboard
      const { error: insertError } = await supabase
        .from('platform_nav_items')
        .insert({
          tenant_id: null,
          name: 'Platform Dashboard',
          path: '/dashboard/platform-admin',
          icon: 'Server',
          roles_allowed: ['super_admin', 'admin', 'support_admin'],
          departments_allowed: [],
          order_index: 1,
          is_active: true
        });

      if (insertError) throw insertError;
      console.log('✅ Platform Dashboard navigation item created');
    } else {
      console.log('ℹ️ Platform Dashboard already exists');
    }

    // Update Platform Billing roles
    const { error: updateError } = await supabase
      .from('platform_nav_items')
      .update({
        roles_allowed: ['super_admin', 'admin', 'billing_admin', 'support_admin']
      })
      .eq('path', '/dashboard/platform-billing')
      .is('tenant_id', null);

    if (updateError) throw updateError;
    console.log('✅ Platform Billing roles updated');

    // Get all platform navigation items
    const { data: items, error: fetchError } = await supabase
      .from('platform_nav_items')
      .select('*')
      .is('tenant_id', null)
      .order('order_index');

    if (fetchError) throw fetchError;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Platform navigation items seeded successfully',
        items: items
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});