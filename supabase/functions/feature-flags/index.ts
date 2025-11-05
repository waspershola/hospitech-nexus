import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeatureFlagData {
  id?: string;
  flag_key: string;
  flag_name: string;
  description?: string;
  enabled_globally: boolean;
  tenant_id?: string;
  metadata?: any;
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
    const flagId = pathParts[1];

    // LIST feature flags
    if (req.method === 'GET' && !flagId) {
      let query = supabase
        .from('platform_feature_flags')
        .select('*')
        .order('created_at', { ascending: false });

      // Non-admins can only see flags for their tenant
      if (!isPlatformAdmin) {
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();

        if (userRole?.tenant_id) {
          query = query.or(`tenant_id.eq.${userRole.tenant_id},enabled_globally.eq.true`);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET single flag
    if (req.method === 'GET' && flagId) {
      const { data, error } = await supabase
        .from('platform_feature_flags')
        .select('*')
        .eq('id', flagId)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only platform admins can create/update/delete
    if (!isPlatformAdmin) {
      throw new Error('Forbidden: Only platform admins can manage feature flags');
    }

    // CREATE flag
    if (req.method === 'POST') {
      const body: FeatureFlagData = await req.json();

      // Validate required fields
      if (!body.flag_key || !body.flag_name) {
        throw new Error('Missing required fields: flag_key, flag_name');
      }

      // Check if flag_key already exists
      const { data: existing } = await supabase
        .from('platform_feature_flags')
        .select('id')
        .eq('flag_key', body.flag_key)
        .maybeSingle();

      if (existing) {
        throw new Error(`Feature flag with key "${body.flag_key}" already exists`);
      }

      const { data, error } = await supabase
        .from('platform_feature_flags')
        .insert({
          flag_key: body.flag_key,
          flag_name: body.flag_name,
          description: body.description,
          enabled_globally: body.enabled_globally ?? false,
          tenant_id: body.tenant_id || null,
          metadata: body.metadata || {},
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await supabase.from('platform_audit_stream').insert({
        event_type: 'feature_flag_created',
        user_id: user.id,
        metadata: {
          flag_id: data.id,
          flag_key: body.flag_key,
          enabled_globally: body.enabled_globally,
        },
      });

      console.log(`Feature flag created: ${data.id} (${body.flag_key})`);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // UPDATE flag
    if (req.method === 'PATCH' && flagId) {
      const body: Partial<FeatureFlagData> = await req.json();

      const updateData: any = {};
      if (body.flag_name !== undefined) updateData.flag_name = body.flag_name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.enabled_globally !== undefined) updateData.enabled_globally = body.enabled_globally;
      if (body.tenant_id !== undefined) updateData.tenant_id = body.tenant_id;
      if (body.metadata !== undefined) updateData.metadata = body.metadata;

      const { data, error } = await supabase
        .from('platform_feature_flags')
        .update(updateData)
        .eq('id', flagId)
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await supabase.from('platform_audit_stream').insert({
        event_type: 'feature_flag_updated',
        user_id: user.id,
        metadata: {
          flag_id: flagId,
          changes: updateData,
        },
      });

      console.log(`Feature flag updated: ${flagId}`);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE flag
    if (req.method === 'DELETE' && flagId) {
      const { error } = await supabase
        .from('platform_feature_flags')
        .delete()
        .eq('id', flagId);

      if (error) throw error;

      // Log audit event
      await supabase.from('platform_audit_stream').insert({
        event_type: 'feature_flag_deleted',
        user_id: user.id,
        metadata: {
          flag_id: flagId,
        },
      });

      console.log(`Feature flag deleted: ${flagId}`);

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
    console.error('Feature flag management error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
