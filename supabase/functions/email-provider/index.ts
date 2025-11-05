import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailProviderConfig {
  id?: string;
  provider_type: 'smtp' | 'sendgrid' | 'mailgun' | 'resend';
  name: string;
  config: any;
  is_default?: boolean;
  enabled?: boolean;
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
    const providerId = pathParts[1];

    // LIST providers
    if (req.method === 'GET' && !providerId) {
      let query = supabase
        .from('platform_email_providers')
        .select('*')
        .order('created_at', { ascending: false });

      // If tenant user, only show their providers
      if (!isPlatformAdmin) {
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();

        if (userRole?.tenant_id) {
          query = query.eq('tenant_id', userRole.tenant_id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET single provider
    if (req.method === 'GET' && providerId) {
      const { data, error } = await supabase
        .from('platform_email_providers')
        .select('*')
        .eq('id', providerId)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only platform admins can create/update/delete
    if (!isPlatformAdmin) {
      throw new Error('Forbidden: Only platform admins can manage email providers');
    }

    // CREATE provider
    if (req.method === 'POST') {
      const body: EmailProviderConfig = await req.json();

      // Validate required fields
      if (!body.provider_type || !body.name || !body.config) {
        throw new Error('Missing required fields: provider_type, name, config');
      }

      // Validate provider-specific config
      validateProviderConfig(body.provider_type, body.config);

      // If setting as default, unset other defaults
      if (body.is_default) {
        await supabase
          .from('platform_email_providers')
          .update({ is_default: false })
          .eq('tenant_id', body.tenant_id || null);
      }

      const { data, error } = await supabase
        .from('platform_email_providers')
        .insert({
          provider_type: body.provider_type,
          name: body.name,
          config: body.config,
          is_default: body.is_default || false,
          enabled: body.enabled !== false,
          tenant_id: body.tenant_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await supabase.from('platform_audit_stream').insert({
        event_type: 'email_provider_created',
        user_id: user.id,
        metadata: {
          provider_id: data.id,
          provider_type: body.provider_type,
          name: body.name,
        },
      });

      console.log(`Email provider created: ${data.id}`);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // UPDATE provider
    if (req.method === 'PATCH' && providerId) {
      const body: Partial<EmailProviderConfig> = await req.json();

      // Validate provider-specific config if provided
      if (body.provider_type && body.config) {
        validateProviderConfig(body.provider_type, body.config);
      }

      // If setting as default, unset other defaults
      if (body.is_default) {
        const { data: provider } = await supabase
          .from('platform_email_providers')
          .select('tenant_id')
          .eq('id', providerId)
          .single();

        await supabase
          .from('platform_email_providers')
          .update({ is_default: false })
          .eq('tenant_id', provider?.tenant_id || null)
          .neq('id', providerId);
      }

      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.config !== undefined) updateData.config = body.config;
      if (body.is_default !== undefined) updateData.is_default = body.is_default;
      if (body.enabled !== undefined) updateData.enabled = body.enabled;

      const { data, error } = await supabase
        .from('platform_email_providers')
        .update(updateData)
        .eq('id', providerId)
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await supabase.from('platform_audit_stream').insert({
        event_type: 'email_provider_updated',
        user_id: user.id,
        metadata: {
          provider_id: providerId,
          changes: updateData,
        },
      });

      console.log(`Email provider updated: ${providerId}`);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE provider
    if (req.method === 'DELETE' && providerId) {
      const { error } = await supabase
        .from('platform_email_providers')
        .delete()
        .eq('id', providerId);

      if (error) throw error;

      // Log audit event
      await supabase.from('platform_audit_stream').insert({
        event_type: 'email_provider_deleted',
        user_id: user.id,
        metadata: {
          provider_id: providerId,
        },
      });

      console.log(`Email provider deleted: ${providerId}`);

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
    console.error('Email provider management error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function validateProviderConfig(providerType: string, config: any): void {
  switch (providerType) {
    case 'smtp':
      if (!config.host || !config.port || !config.user || !config.password) {
        throw new Error('SMTP requires: host, port, user, password');
      }
      break;
    case 'sendgrid':
      if (!config.apiKey) {
        throw new Error('SendGrid requires: apiKey');
      }
      break;
    case 'mailgun':
      if (!config.apiKey || !config.domain) {
        throw new Error('Mailgun requires: apiKey, domain');
      }
      break;
    case 'resend':
      if (!config.apiKey) {
        throw new Error('Resend requires: apiKey');
      }
      break;
    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }
}
