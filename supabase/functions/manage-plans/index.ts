import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlanData {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  price_monthly: number;
  price_yearly: number;
  limits?: Record<string, any>;
  features?: string[];
  is_active?: boolean;
  is_public?: boolean;
  trial_days?: number;
  metadata?: Record<string, any>;
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

    const isPlatformAdmin = platformUser?.role === 'super_admin' || platformUser?.role === 'billing_bot';

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const planId = pathParts[1];

    // LIST plans
    if (req.method === 'GET' && !planId) {
      let query = supabase
        .from('platform_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      // Non-admins can only see active plans
      if (!isPlatformAdmin) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET single plan
    if (req.method === 'GET' && planId) {
      const { data, error } = await supabase
        .from('platform_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only platform admins can create/update/delete
    if (!isPlatformAdmin) {
      throw new Error('Forbidden: Only platform admins can manage plans');
    }

    // CREATE plan
    if (req.method === 'POST') {
      const body: PlanData = await req.json();

      // Validate required fields
      if (!body.name || body.price_monthly === undefined || body.price_yearly === undefined) {
        throw new Error('Missing required fields: name, price_monthly, price_yearly');
      }

      const { data, error } = await supabase
        .from('platform_plans')
        .insert({
          name: body.name,
          slug: body.slug || body.name.toLowerCase().replace(/\s+/g, '-'),
          description: body.description,
          price_monthly: body.price_monthly,
          price_yearly: body.price_yearly,
          limits: body.limits || {},
          features: body.features || [],
          is_active: body.is_active !== false,
          is_public: body.is_public !== false,
          trial_days: body.trial_days || 0,
          metadata: body.metadata || {},
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await supabase.from('platform_audit_stream').insert({
        action: 'plan_created',
        resource_type: 'platform_plan',
        resource_id: data.id,
        actor_id: user.id,
        payload: {
          plan_id: data.id,
          name: body.name,
          price_monthly: body.price_monthly,
          price_yearly: body.price_yearly,
        },
      });

      console.log(`Plan created: ${data.id} (${body.name})`);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // UPDATE plan
    if (req.method === 'PATCH' && planId) {
      const body: Partial<PlanData> = await req.json();

      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.slug !== undefined) updateData.slug = body.slug;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.price_monthly !== undefined) updateData.price_monthly = body.price_monthly;
      if (body.price_yearly !== undefined) updateData.price_yearly = body.price_yearly;
      if (body.limits !== undefined) updateData.limits = body.limits;
      if (body.features !== undefined) updateData.features = body.features;
      if (body.is_active !== undefined) updateData.is_active = body.is_active;
      if (body.is_public !== undefined) updateData.is_public = body.is_public;
      if (body.trial_days !== undefined) updateData.trial_days = body.trial_days;
      if (body.metadata !== undefined) updateData.metadata = body.metadata;

      const { data, error } = await supabase
        .from('platform_plans')
        .update(updateData)
        .eq('id', planId)
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await supabase.from('platform_audit_stream').insert({
        action: 'plan_updated',
        resource_type: 'platform_plan',
        resource_id: planId,
        actor_id: user.id,
        payload: {
          plan_id: planId,
          changes: updateData,
        },
      });

      console.log(`Plan updated: ${planId}`);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE plan
    if (req.method === 'DELETE' && planId) {
      // Check if any tenants are using this plan
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id')
        .eq('plan_id', planId)
        .limit(1);

      if (tenants && tenants.length > 0) {
        throw new Error('Cannot delete plan: It is currently assigned to tenants');
      }

      const { error } = await supabase
        .from('platform_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      // Log audit event
      await supabase.from('platform_audit_stream').insert({
        action: 'plan_deleted',
        resource_type: 'platform_plan',
        resource_id: planId,
        actor_id: user.id,
        payload: {
          plan_id: planId,
        },
      });

      console.log(`Plan deleted: ${planId}`);

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
    console.error('Plan management error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
