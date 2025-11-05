import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TenantSMSSettings {
  tenant_id: string;
  provider: string;
  api_key: string;
  api_secret?: string;
  sender_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify super_admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is super_admin
    const { data: platformUser } = await supabaseClient
      .from('platform_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!platformUser || platformUser.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super_admin can run migration' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting SMS provider migration...');

    // Fetch all tenant SMS settings
    const { data: tenantSettings, error: fetchError } = await supabaseClient
      .from('tenant_sms_settings')
      .select('tenant_id, provider, api_key, api_secret, sender_id')
      .not('provider', 'is', null);

    if (fetchError) {
      console.error('Error fetching tenant settings:', fetchError);
      throw fetchError;
    }

    if (!tenantSettings || tenantSettings.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No tenant SMS settings to migrate', migrated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${tenantSettings.length} tenant SMS configurations`);

    // Deduplicate providers (group by provider + api_key)
    const providerMap = new Map<string, { 
      provider_type: string; 
      api_key: string; 
      api_secret?: string;
      tenants: { tenant_id: string; sender_id: string }[];
    }>();

    for (const setting of tenantSettings as TenantSMSSettings[]) {
      const key = `${setting.provider}:${setting.api_key}`;
      
      if (!providerMap.has(key)) {
        providerMap.set(key, {
          provider_type: setting.provider,
          api_key: setting.api_key,
          api_secret: setting.api_secret,
          tenants: [],
        });
      }
      
      providerMap.get(key)!.tenants.push({
        tenant_id: setting.tenant_id,
        sender_id: setting.sender_id || '',
      });
    }

    console.log(`Deduplicated to ${providerMap.size} unique providers`);

    let migratedProviders = 0;
    let migratedAssignments = 0;
    let createdCreditPools = 0;

    // Create platform providers and tenant assignments
    for (const [, providerData] of providerMap) {
      // Create platform provider
      const { data: newProvider, error: providerError } = await supabaseClient
        .from('platform_sms_providers')
        .insert({
          provider_type: providerData.provider_type,
          api_key_encrypted: providerData.api_key, // TODO: Encrypt in production
          api_secret_encrypted: providerData.api_secret,
          is_active: true,
        })
        .select()
        .single();

      if (providerError) {
        console.error('Error creating provider:', providerError);
        continue;
      }

      migratedProviders++;
      console.log(`Created platform provider: ${newProvider.id} (${providerData.provider_type})`);

      // Create tenant assignments
      for (const tenant of providerData.tenants) {
        const { error: assignError } = await supabaseClient
          .from('tenant_provider_assignments')
          .insert({
            tenant_id: tenant.tenant_id,
            provider_id: newProvider.id,
            sender_id: tenant.sender_id,
            is_default: true,
          });

        if (assignError) {
          console.error(`Error assigning provider to tenant ${tenant.tenant_id}:`, assignError);
        } else {
          migratedAssignments++;
        }

        // Create credit pool for tenant if not exists
        const { data: existingPool } = await supabaseClient
          .from('platform_sms_credit_pool')
          .select('id')
          .eq('tenant_id', tenant.tenant_id)
          .single();

        if (!existingPool) {
          // Get tenant plan to allocate initial credits
          const { data: tenantInfo } = await supabaseClient
            .from('platform_tenants')
            .select('plan_id')
            .eq('id', tenant.tenant_id)
            .single();

          let initialCredits = 100; // Default

          if (tenantInfo?.plan_id) {
            const { data: plan } = await supabaseClient
              .from('platform_plans')
              .select('included_sms')
              .eq('id', tenantInfo.plan_id)
              .single();
            
            if (plan) {
              initialCredits = plan.included_sms;
            }
          }

          const { error: poolError } = await supabaseClient
            .from('platform_sms_credit_pool')
            .insert({
              tenant_id: tenant.tenant_id,
              total_credits: initialCredits,
              allocated_credits: initialCredits,
              consumed_credits: 0,
            });

          if (!poolError) {
            createdCreditPools++;
          }
        }
      }
    }

    // Log migration to audit stream
    await supabaseClient.from('platform_audit_stream').insert({
      actor_id: user.id,
      actor_role: 'super_admin',
      action: 'sms_provider_migration',
      resource_type: 'platform_sms_providers',
      payload: {
        providers_migrated: migratedProviders,
        assignments_created: migratedAssignments,
        credit_pools_created: createdCreditPools,
      },
    });

    console.log('Migration completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SMS provider migration completed',
        providers_migrated: migratedProviders,
        assignments_created: migratedAssignments,
        credit_pools_created: createdCreditPools,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Migration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Migration failed';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
