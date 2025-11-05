import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NavigationItemData {
  id?: string;
  label: string;
  path: string;
  icon?: string;
  parent_id?: string;
  allowed_roles?: string[];
  order_index?: number;
  is_active?: boolean;
  tenant_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is platform admin
    const { data: platformUser } = await supabase
      .from('platform_users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isPlatformAdmin = platformUser?.role === 'super_admin' || platformUser?.role === 'support_admin';

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const navId = pathParts[1];
    const action = pathParts[2]; // For special actions like 'sync'

    // SYNC default navigation (platform admin only)
    if (req.method === 'POST' && action === 'sync') {
      if (!isPlatformAdmin) {
        throw new Error('Forbidden: Only platform admins can sync navigation');
      }

      // This will seed/update default navigation items
      const defaultNavItems = [
        { label: 'Overview', path: '/dashboard', icon: 'LayoutDashboard', allowed_roles: ['owner', 'admin', 'staff'], order_index: 1 },
        { label: 'Front Desk', path: '/dashboard/frontdesk', icon: 'Hotel', allowed_roles: ['owner', 'admin', 'frontdesk_staff'], order_index: 2 },
        { label: 'Bookings', path: '/dashboard/bookings', icon: 'Calendar', allowed_roles: ['owner', 'admin', 'frontdesk_staff'], order_index: 3 },
        { label: 'Guests', path: '/dashboard/guests', icon: 'Users', allowed_roles: ['owner', 'admin', 'frontdesk_staff'], order_index: 4 },
        { label: 'Rooms', path: '/dashboard/rooms', icon: 'DoorOpen', allowed_roles: ['owner', 'admin'], order_index: 5 },
        { label: 'Finance Center', path: '/dashboard/finance-center', icon: 'DollarSign', allowed_roles: ['owner', 'admin', 'finance_staff'], order_index: 6 },
        { label: 'Staff', path: '/dashboard/staff', icon: 'UserCog', allowed_roles: ['owner', 'admin'], order_index: 7 },
        { label: 'Configuration', path: '/dashboard/configuration', icon: 'Settings', allowed_roles: ['owner', 'admin'], order_index: 8 },
        { label: 'Platform Admin', path: '/dashboard/platform-admin?tab=payment-providers', icon: 'ShieldCheck', allowed_roles: ['super_admin', 'support_admin'], order_index: 100 },
      ];

      const results = [];
      for (const item of defaultNavItems) {
        const { data, error } = await supabase
          .from('platform_navigation_items')
          .upsert({
            label: item.label,
            path: item.path,
            icon: item.icon,
            allowed_roles: item.allowed_roles,
            order_index: item.order_index,
            is_active: true,
            tenant_id: null, // Global navigation
          }, {
            onConflict: 'path,tenant_id',
            ignoreDuplicates: false,
          })
          .select()
          .single();

        if (error) {
          console.error(`Failed to sync ${item.label}:`, error);
        } else {
          results.push(data);
        }
      }

      console.log(`Synced ${results.length} default navigation items`);

      return new Response(JSON.stringify({ synced: results.length, items: results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // LIST navigation items
    if (req.method === 'GET' && !navId) {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .single();

      let query = supabase
        .from('platform_navigation_items')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      // Filter by tenant or global navigation
      if (!isPlatformAdmin && userRole?.tenant_id) {
        query = query.or(`tenant_id.eq.${userRole.tenant_id},tenant_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by user role
      const filteredData = data?.filter((item: any) => {
        if (!item.allowed_roles || item.allowed_roles.length === 0) return true;
        if (!userRole?.role) return false;
        return item.allowed_roles.includes(userRole.role);
      });

      return new Response(JSON.stringify(filteredData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET single navigation item
    if (req.method === 'GET' && navId) {
      const { data, error } = await supabase
        .from('platform_navigation_items')
        .select('*')
        .eq('id', navId)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only platform admins can create/update/delete
    if (!isPlatformAdmin) {
      throw new Error('Forbidden: Only platform admins can manage navigation');
    }

    // CREATE navigation item
    if (req.method === 'POST' && !action) {
      const body: NavigationItemData = await req.json();

      // Validate required fields
      if (!body.label || !body.path) {
        throw new Error('Missing required fields: label, path');
      }

      const { data, error } = await supabase
        .from('platform_navigation_items')
        .insert({
          label: body.label,
          path: body.path,
          icon: body.icon,
          parent_id: body.parent_id,
          allowed_roles: body.allowed_roles || [],
          order_index: body.order_index || 999,
          is_active: body.is_active !== false,
          tenant_id: body.tenant_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await supabase.from('platform_audit_stream').insert({
        event_type: 'navigation_item_created',
        user_id: user.id,
        metadata: {
          nav_id: data.id,
          label: body.label,
          path: body.path,
        },
      });

      console.log(`Navigation item created: ${data.id}`);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // UPDATE navigation item
    if (req.method === 'PATCH' && navId) {
      const body: Partial<NavigationItemData> = await req.json();

      const updateData: any = {};
      if (body.label !== undefined) updateData.label = body.label;
      if (body.path !== undefined) updateData.path = body.path;
      if (body.icon !== undefined) updateData.icon = body.icon;
      if (body.parent_id !== undefined) updateData.parent_id = body.parent_id;
      if (body.allowed_roles !== undefined) updateData.allowed_roles = body.allowed_roles;
      if (body.order_index !== undefined) updateData.order_index = body.order_index;
      if (body.is_active !== undefined) updateData.is_active = body.is_active;

      const { data, error } = await supabase
        .from('platform_navigation_items')
        .update(updateData)
        .eq('id', navId)
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await supabase.from('platform_audit_stream').insert({
        event_type: 'navigation_item_updated',
        user_id: user.id,
        metadata: {
          nav_id: navId,
          changes: updateData,
        },
      });

      console.log(`Navigation item updated: ${navId}`);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE navigation item
    if (req.method === 'DELETE' && navId) {
      const { error } = await supabase
        .from('platform_navigation_items')
        .delete()
        .eq('id', navId);

      if (error) throw error;

      // Log audit event
      await supabase.from('platform_audit_stream').insert({
        event_type: 'navigation_item_deleted',
        user_id: user.id,
        metadata: {
          nav_id: navId,
        },
      });

      console.log(`Navigation item deleted: ${navId}`);

      return new Response(null, {
        headers: corsHeaders,
        status: 204,
      });
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );

  } catch (error) {
    console.error('Navigation management error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
