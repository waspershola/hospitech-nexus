import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') ?? '',
          },
        },
      }
    );

    const url = new URL(req.url);
    const method = req.method;

    // POST for fetching (to avoid query param issues) or GET with query params
    if (method === 'GET' || method === 'POST') {
      let tenantId = url.searchParams.get('tenant_id');
      
      // For POST, also check body
      if (method === 'POST' && !tenantId) {
        const body = await req.json().catch(() => ({}));
        tenantId = body.tenant_id;
      }
      
      if (!tenantId) {
        console.log('No tenant_id provided, attempting to get from auth');
        // Try to get tenant from authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return new Response(
            JSON.stringify({ error: 'tenant_id required or user must be authenticated' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Get tenant from user_roles
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();
        
        tenantId = userRole?.tenant_id;
      }

      console.log('Fetching navigation for tenant:', tenantId);

      // Fetch tenant-specific + global nav items
      const { data: navItems, error } = await supabase
        .from('platform_nav_items')
        .select('*')
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .eq('is_active', true)
        .order('order_index');

      if (error) {
        console.error('Error fetching nav items:', error);
        throw error;
      }

      console.log(`Found ${navItems?.length || 0} navigation items`);

      // Group by tenant_id (null = global, tenantId = tenant override)
      const globalItems = navItems?.filter(item => !item.tenant_id) || [];
      const tenantItems = navItems?.filter(item => item.tenant_id === tenantId) || [];

      // Merge: tenant overrides take precedence (match by path)
      const merged = [...globalItems];
      tenantItems.forEach(tenantItem => {
        const existingIndex = merged.findIndex(g => g.path === tenantItem.path);
        if (existingIndex >= 0) {
          merged[existingIndex] = tenantItem; // Override
        } else {
          merged.push(tenantItem); // Add new
        }
      });

      // Sort by order_index
      merged.sort((a, b) => a.order_index - b.order_index);

      return new Response(
        JSON.stringify({ data: merged }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT for creating/updating (changed from POST to avoid conflict with fetch)
    if (method === 'PUT') {
      const body = await req.json();
      const { tenant_id, name, path, icon, roles_allowed, departments_allowed, parent_id, order_index, is_active, metadata } = body;

      // Validate required fields
      if (!name || !path || !icon || !roles_allowed) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('platform_nav_items')
        .upsert({
          tenant_id,
          name,
          path,
          icon,
          roles_allowed,
          departments_allowed: departments_allowed || [],
          parent_id,
          order_index: order_index || 0,
          is_active: is_active !== undefined ? is_active : true,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /platform-nav-sync/{id} - Delete nav item (platform admin only)
    if (method === 'DELETE') {
      const id = url.searchParams.get('id');
      
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('platform_nav_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Platform nav sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
