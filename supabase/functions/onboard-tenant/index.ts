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

    const { tenant_id } = await req.json();

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting onboarding for tenant:', tenant_id);

    // Get tenant details
    const { data: tenant, error: tenantError } = await supabase
      .from('platform_tenants')
      .select('*, tenants(name)')
      .eq('id', tenant_id)
      .single();

    if (tenantError) throw tenantError;

    const hotelName = (tenant.tenants as any)?.name || 'Hotel';

    // Step 1: Seed default navigation from platform defaults
    const { data: platformNav, error: navError } = await supabase
      .from('platform_nav_items')
      .select('*')
      .is('tenant_id', null); // Get global defaults

    if (navError) console.error('Navigation seed error:', navError);

    if (platformNav && platformNav.length > 0) {
      const tenantNav = platformNav.map((item: any) => ({
        tenant_id,
        name: item.name,
        path: item.path,
        icon: item.icon,
        roles_allowed: item.roles_allowed,
        departments_allowed: item.departments_allowed,
        parent_id: item.parent_id,
        order_index: item.order_index,
        is_active: item.is_active,
        description: item.description,
        metadata: item.metadata,
      }));

      const { error: navInsertError } = await supabase
        .from('navigation_items')
        .insert(tenantNav);

      if (navInsertError) console.error('Navigation insert error:', navInsertError);
    }

    // Step 2: Create default room category
    const { data: category, error: categoryError } = await supabase
      .from('room_categories')
      .insert({
        tenant_id,
        name: 'Standard Room',
        base_price: 25000,
        capacity: 2,
        description: 'Comfortable standard room with essential amenities',
      })
      .select()
      .single();

    if (categoryError) console.error('Category creation error:', categoryError);

    // Step 3: Create sample room
    if (category) {
      const { error: roomError } = await supabase
        .from('rooms')
        .insert({
          tenant_id,
          room_number: '101',
          category_id: category.id,
          status: 'available',
          floor: 1,
        });

      if (roomError) console.error('Room creation error:', roomError);
    }

    // Step 4: Initialize usage tracking
    const { error: usageError } = await supabase
      .from('platform_usage')
      .insert({
        tenant_id,
        rooms_total: 1,
        bookings_monthly: 0,
        sms_sent: 0,
        api_calls: 0,
      });

    if (usageError) console.error('Usage tracking error:', usageError);

    // Step 5: Create email settings
    const { error: emailError } = await supabase
      .from('email_settings')
      .insert({
        tenant_id,
        from_name: hotelName,
        from_email: 'noreply@hotel.com',
        smtp_enabled: false,
        email_branding_enabled: true,
      });

    if (emailError) console.error('Email settings error:', emailError);

    // Step 6: Create payment preferences
    const { error: paymentPrefsError } = await supabase
      .from('hotel_payment_preferences')
      .insert({
        tenant_id,
        overpayment_default_action: 'wallet',
        large_overpayment_threshold: 50000,
        manager_approval_threshold: 50000,
        receivable_aging_days: 30,
        allow_checkout_with_debt: false,
        auto_apply_wallet_on_booking: true,
      });

    if (paymentPrefsError) console.error('Payment preferences error:', paymentPrefsError);

    // Log audit event
    await supabase
      .from('platform_audit_stream')
      .insert({
        action: 'tenant_onboarded',
        resource_type: 'tenant',
        resource_id: tenant_id,
        payload: {
          tenant_id,
          hotel_name: hotelName,
          steps_completed: [
            'navigation_seeded',
            'default_category_created',
            'sample_room_created',
            'usage_tracking_initialized',
            'email_settings_created',
            'payment_preferences_created',
          ],
        },
      });

    console.log('Onboarding completed for tenant:', tenant_id);

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id,
        message: 'Tenant onboarding completed successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Onboarding error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
