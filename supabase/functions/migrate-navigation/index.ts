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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    console.log('Starting navigation migration...');

    // 1. Fetch all navigation_items
    const { data: oldNavItems, error: fetchError } = await supabase
      .from('navigation_items')
      .select('*');

    if (fetchError) {
      console.error('Error fetching navigation_items:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${oldNavItems?.length || 0} navigation items to migrate`);

    if (!oldNavItems || oldNavItems.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No navigation items to migrate',
          migrated: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Transform and insert into platform_nav_items
    const transformedItems = oldNavItems.map(item => ({
      tenant_id: item.tenant_id,
      name: item.name,
      path: item.path,
      icon: item.icon,
      roles_allowed: item.allowed_roles || [],
      departments_allowed: item.allowed_departments || [],
      parent_id: item.parent_id,
      order_index: item.order_index || 0,
      is_active: item.is_active !== false, // Default to true
      metadata: item.metadata || {},
    }));

    const { data: insertedItems, error: insertError } = await supabase
      .from('platform_nav_items')
      .upsert(transformedItems, {
        onConflict: 'tenant_id,path', // Avoid duplicates based on tenant + path
        ignoreDuplicates: false,
      })
      .select();

    if (insertError) {
      console.error('Error inserting into platform_nav_items:', insertError);
      throw insertError;
    }

    console.log(`Successfully migrated ${insertedItems?.length || 0} navigation items`);

    // 3. Log to platform_audit_stream
    await supabase
      .from('platform_audit_stream')
      .insert({
        action: 'navigation_migration_completed',
        resource_type: 'platform_nav_items',
        actor_role: 'super_admin',
        payload: {
          items_migrated: insertedItems?.length || 0,
          migration_timestamp: new Date().toISOString(),
        },
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Navigation migration completed successfully',
        migrated: insertedItems?.length || 0,
        items: insertedItems,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Navigation migration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: error,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
