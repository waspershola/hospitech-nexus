import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DomainRequest {
  action: 'add' | 'verify' | 'remove';
  domain?: string;
  domainId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, domain, domainId }: DomainRequest = await req.json();
    console.log(`Domain action: ${action}`, { domain, domainId, userId: user.id });

    // Get user's tenant
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['owner', 'manager'].includes(userRole.role)) {
      throw new Error('Insufficient permissions');
    }

    const tenantId = userRole.tenant_id;

    switch (action) {
      case 'add': {
        if (!domain) throw new Error('Domain is required');

        // Check if domain already exists
        const { data: existing } = await supabase
          .from('hotel_domains')
          .select('id')
          .eq('domain', domain)
          .maybeSingle();

        if (existing) {
          throw new Error('Domain already registered');
        }

        // Create domain record
        const { data: domainRecord, error: insertError } = await supabase
          .from('hotel_domains')
          .insert({
            tenant_id: tenantId,
            domain: domain,
            status: 'pending',
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // TODO: Add domain to Vercel when VERCEL_TOKEN is available
        console.log('Domain created, waiting for Vercel integration:', domainRecord);

        return new Response(
          JSON.stringify({
            success: true,
            data: domainRecord,
            message: 'Domain added. Configure DNS records to verify.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'verify': {
        if (!domainId) throw new Error('Domain ID is required');

        const { data: domainRecord } = await supabase
          .from('hotel_domains')
          .select('*')
          .eq('id', domainId)
          .eq('tenant_id', tenantId)
          .single();

        if (!domainRecord) throw new Error('Domain not found');

        // TODO: Check Vercel domain status when VERCEL_TOKEN is available
        console.log('Verifying domain:', domainRecord.domain);

        // Update status
        const { data: updated, error: updateError } = await supabase
          .from('hotel_domains')
          .update({
            status: 'verifying',
            last_check: new Date().toISOString(),
          })
          .eq('id', domainId)
          .select()
          .single();

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({
            success: true,
            data: updated,
            message: 'Domain verification in progress.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'remove': {
        if (!domainId) throw new Error('Domain ID is required');

        const { data: domainRecord } = await supabase
          .from('hotel_domains')
          .select('*')
          .eq('id', domainId)
          .eq('tenant_id', tenantId)
          .single();

        if (!domainRecord) throw new Error('Domain not found');

        // TODO: Remove domain from Vercel when VERCEL_TOKEN is available
        console.log('Removing domain:', domainRecord.domain);

        // Delete domain record
        const { error: deleteError } = await supabase
          .from('hotel_domains')
          .delete()
          .eq('id', domainId);

        if (deleteError) throw deleteError;

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Domain removed successfully.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Domain management error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
