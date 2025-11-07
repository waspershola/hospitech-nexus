import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if platform admin
    const { data: platformUser } = await supabase
      .from('platform_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!platformUser || !['super_admin', 'support_admin'].includes(platformUser.role)) {
      throw new Error('Insufficient permissions');
    }

    const body = await req.json();
    const { action, tenant_id, tenant_data, status } = body;

    // Activate tenant (complete onboarding)
    if (action === 'activate_tenant') {
      if (!tenant_id) {
        throw new Error('tenant_id is required');
      }

      // Update tenant status
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .update({
          status: 'active',
          activated_at: new Date().toISOString(),
        })
        .eq('id', tenant_id)
        .select('*, tenant_subscriptions(*, platform_plans(*))')
        .single();

      if (tenantError) throw tenantError;

      // CASCADE: Reactivate users suspended due to tenant suspension
      const { data: suspendedUsers, error: usersError } = await supabase
        .from('user_roles')
        .select('user_id, suspension_metadata')
        .eq('tenant_id', tenant_id)
        .eq('status', 'suspended');

      if (usersError) {
        console.error('Error fetching suspended users:', usersError);
      }

      // Only reactivate users suspended by tenant cascade (suspension_type='tenant')
      const cascadedUsers = suspendedUsers?.filter(u => 
        u.suspension_metadata?.suspension_type === 'tenant'
      ) || [];

      if (cascadedUsers.length > 0) {
        const userIdsToReactivate = cascadedUsers.map(u => u.user_id);
        
        const { error: reactivateError } = await supabase
          .from('user_roles')
          .update({ 
            status: 'active',
            suspension_metadata: null 
          })
          .eq('tenant_id', tenant_id)
          .in('user_id', userIdsToReactivate);

        if (reactivateError) {
          console.error('Error reactivating users:', reactivateError);
        } else {
          console.log(`✅ Reactivated ${cascadedUsers.length} users for tenant ${tenant_id}`);
        }
      }

      // Initialize default resources if needed
      await initializeTenantResources(supabase, tenant_id);

      // Send activation email
      try {
        await supabase.functions.invoke('email-provider', {
          body: {
            to_email: tenant.metadata?.contact_email || 'admin@example.com',
            subject: 'Your Account is Now Active!',
            template_id: 'tenant_activated',
            template_data: {
              tenant_name: tenant.name,
              dashboard_url: `https://app.example.com/dashboard`,
            },
          },
        });
      } catch (emailError) {
        console.error('Failed to send activation email:', emailError);
      }

      await supabase.from('platform_audit_stream').insert({
        event_type: 'tenant_activated',
        actor_id: user.id,
        metadata: {
          tenant_id,
          tenant_name: tenant.name,
          users_reactivated: cascadedUsers.length,
        },
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          tenant,
          users_reactivated: cascadedUsers.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Suspend tenant
    if (action === 'suspend_tenant') {
      if (!tenant_id) {
        throw new Error('tenant_id is required');
      }

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .update({
          status: 'suspended',
          suspended_at: new Date().toISOString(),
          suspension_reason: tenant_data?.suspension_reason || 'Administrative action',
        })
        .eq('id', tenant_id)
        .select()
        .single();

      if (tenantError) throw tenantError;

      // CASCADE: Suspend all active users for this tenant
      const { data: activeUsers, error: usersError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('tenant_id', tenant_id)
        .eq('status', 'active');

      if (usersError) {
        console.error('Error fetching active users:', usersError);
      }

      if (activeUsers && activeUsers.length > 0) {
        const { error: suspendError } = await supabase
          .from('user_roles')
          .update({ 
            status: 'suspended',
            suspension_metadata: {
              suspension_type: 'tenant',
              suspended_at: new Date().toISOString(),
              reason: tenant_data?.suspension_reason || 'Tenant suspended',
              suspended_by: user.id,
            }
          })
          .eq('tenant_id', tenant_id)
          .eq('status', 'active');

        if (suspendError) {
          console.error('Error suspending users:', suspendError);
        } else {
          console.log(`✅ Suspended ${activeUsers.length} users for tenant ${tenant_id}`);
        }
      }

      // Send suspension notification
      try {
        await supabase.functions.invoke('email-provider', {
          body: {
            to_email: tenant.metadata?.contact_email || 'admin@example.com',
            subject: 'Account Suspended',
            template_id: 'tenant_suspended',
            template_data: {
              tenant_name: tenant.name,
              reason: tenant_data?.suspension_reason || 'Administrative action',
            },
          },
        });
      } catch (emailError) {
        console.error('Failed to send suspension email:', emailError);
      }

      await supabase.from('platform_audit_stream').insert({
        event_type: 'tenant_suspended',
        actor_id: user.id,
        metadata: {
          tenant_id,
          tenant_name: tenant.name,
          reason: tenant_data?.suspension_reason,
          users_suspended: activeUsers?.length || 0,
        },
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          tenant,
          users_suspended: activeUsers?.length || 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deactivate tenant
    if (action === 'deactivate_tenant') {
      if (!tenant_id) {
        throw new Error('tenant_id is required');
      }

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .update({
          status: 'inactive',
          deactivated_at: new Date().toISOString(),
        })
        .eq('id', tenant_id)
        .select()
        .single();

      if (tenantError) throw tenantError;

      await supabase.from('platform_audit_stream').insert({
        event_type: 'tenant_deactivated',
        actor_id: user.id,
        metadata: {
          tenant_id,
          tenant_name: tenant.name,
        },
      });

      return new Response(
        JSON.stringify({ success: true, tenant }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tenant lifecycle stats
    if (action === 'get_lifecycle_stats') {
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('status, created_at, activated_at');

      if (tenantsError) throw tenantsError;

      const stats = {
        total: tenants?.length || 0,
        active: tenants?.filter(t => t.status === 'active').length || 0,
        pending: tenants?.filter(t => t.status === 'pending').length || 0,
        suspended: tenants?.filter(t => t.status === 'suspended').length || 0,
        inactive: tenants?.filter(t => t.status === 'inactive').length || 0,
        trial: tenants?.filter(t => t.status === 'trial').length || 0,
        avgActivationTime: calculateAvgActivationTime(tenants || []),
      };

      return new Response(
        JSON.stringify({ success: true, stats }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error('Tenant lifecycle error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function initializeTenantResources(supabase: any, tenantId: string) {
  // Create default navigation items
  const defaultNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', order_index: 0 },
    { name: 'Bookings', path: '/bookings', icon: 'Calendar', order_index: 1 },
    { name: 'Guests', path: '/guests', icon: 'Users', order_index: 2 },
    { name: 'Rooms', path: '/rooms', icon: 'DoorOpen', order_index: 3 },
    { name: 'Payments', path: '/payments', icon: 'CreditCard', order_index: 4 },
    { name: 'Settings', path: '/settings', icon: 'Settings', order_index: 5 },
  ];

  for (const item of defaultNavItems) {
    await supabase.from('navigation_items').insert({
      tenant_id: tenantId,
      ...item,
      allowed_roles: ['owner', 'manager', 'staff'],
      is_active: true,
    });
  }

  // Create default financial settings if not exists
  const { data: existingFinancials } = await supabase
    .from('hotel_financials')
    .select('id')
    .eq('tenant_id', tenantId)
    .single();

  if (!existingFinancials) {
    await supabase.from('hotel_financials').insert({
      tenant_id: tenantId,
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
  }

  console.log(`Initialized resources for tenant ${tenantId}`);
}

function calculateAvgActivationTime(tenants: any[]): number {
  const activatedTenants = tenants.filter(t => t.activated_at);
  if (activatedTenants.length === 0) return 0;

  const totalTime = activatedTenants.reduce((sum, t) => {
    const created = new Date(t.created_at).getTime();
    const activated = new Date(t.activated_at).getTime();
    return sum + (activated - created);
  }, 0);

  return Math.round(totalTime / activatedTenants.length / (1000 * 60 * 60 * 24)); // days
}
